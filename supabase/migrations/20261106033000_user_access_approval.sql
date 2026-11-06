-- Liberação manual de acesso: novas contas ficam pendentes até o administrador liberar.
-- Idempotente: pode ser executado mais de uma vez sem efeitos colaterais.

CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id uuid PRIMARY KEY
);
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.app_admins TO service_role;

CREATE TABLE IF NOT EXISTS public.user_access (
  user_id uuid PRIMARY KEY,
  email text,
  name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','blocked')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  admin_notified_at timestamptz,
  user_notified_at timestamptz,
  approval_seen_at timestamptz
);
ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_access TO authenticated;
GRANT ALL ON public.user_access TO service_role;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_approved() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_access WHERE user_id = auth.uid() AND status = 'approved')
      OR EXISTS (SELECT 1 FROM public.app_admins WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_approved() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved() TO authenticated;

DROP POLICY IF EXISTS "Read own access or admin reads all" ON public.user_access;
CREATE POLICY "Read own access or admin reads all" ON public.user_access FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- Toda conta nova entra como pendente.
CREATE OR REPLACE FUNCTION public.register_user_access() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_access (user_id, email, name, status)
  VALUES (NEW.id, NEW.email,
          NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')), ''),
          'pending')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.register_user_access() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS user_access_register ON auth.users;
CREATE TRIGGER user_access_register AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.register_user_access();

-- Contas existentes antes desta mudança ficam liberadas (somente as anteriores a esta data).
INSERT INTO public.user_access (user_id, email, name, status, decided_at, approval_seen_at)
SELECT u.id, u.email,
       NULLIF(btrim(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', '')), ''),
       'approved', now(), now()
FROM auth.users u
WHERE u.created_at < '2026-11-06T04:00:00Z'
ON CONFLICT (user_id) DO NOTHING;

-- Administrador.
INSERT INTO public.app_admins (user_id)
SELECT id FROM auth.users WHERE lower(email) = 'fabriciosantos97@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- Somente o administrador libera ou bloqueia.
CREATE OR REPLACE FUNCTION public.set_user_access(p_user uuid, p_status text) RETURNS public.user_access
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.user_access;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'NOT_ADMIN' USING ERRCODE = '42501'; END IF;
  IF p_status NOT IN ('approved','blocked','pending') THEN RAISE EXCEPTION 'INVALID_STATUS' USING ERRCODE = '22023'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'CANNOT_CHANGE_SELF' USING ERRCODE = '42501'; END IF;
  UPDATE public.user_access
     SET status = p_status,
         decided_at = now(),
         approval_seen_at = CASE WHEN p_status = 'approved' THEN NULL ELSE approval_seen_at END,
         user_notified_at = CASE WHEN p_status = 'approved' THEN NULL ELSE user_notified_at END
   WHERE user_id = p_user
  RETURNING * INTO v_row;
  IF v_row.user_id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.set_user_access(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_access(uuid, text) TO authenticated;

-- O usuário marca que já viu o aviso de liberação.
CREATE OR REPLACE FUNCTION public.mark_access_approval_seen() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_access SET approval_seen_at = now()
   WHERE user_id = auth.uid() AND status = 'approved' AND approval_seen_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.mark_access_approval_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_access_approval_seen() TO authenticated;

-- Dados financeiros exigem conta liberada.
DROP POLICY IF EXISTS "Users manage own cards" ON public.cards;
CREATE POLICY "Users manage own cards" ON public.cards FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()))
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()));
DROP POLICY IF EXISTS "Users manage own incomes" ON public.incomes;
CREATE POLICY "Users manage own incomes" ON public.incomes FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()))
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()));
DROP POLICY IF EXISTS "Users manage own transactions" ON public.transactions;
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()))
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()));
DROP POLICY IF EXISTS "Users manage own categories" ON public.categories;
CREATE POLICY "Users manage own categories" ON public.categories FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()))
  WITH CHECK ((SELECT auth.uid()) = user_id AND (SELECT public.is_approved()));

-- Assistente só para contas liberadas.
CREATE OR REPLACE FUNCTION public.consume_assistant_quota(p_limit integer DEFAULT 30) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_day date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_uses integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.is_approved() THEN RETURN false; END IF;
  INSERT INTO public.assistant_usage(user_id, day, uses) VALUES (auth.uid(), v_day, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET uses = assistant_usage.uses + 1 WHERE assistant_usage.uses < LEAST(p_limit, 30)
  RETURNING uses INTO v_uses;
  RETURN v_uses IS NOT NULL;
END $$;

-- Exclusão de conta também remove os registros de acesso.
CREATE OR REPLACE FUNCTION public.cleanup_deleted_finance_account() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 DELETE FROM public.transactions WHERE user_id=OLD.id;
 DELETE FROM public.incomes WHERE user_id=OLD.id;
 DELETE FROM public.cards WHERE user_id=OLD.id;
 DELETE FROM public.categories WHERE user_id=OLD.id;
 DELETE FROM public.user_access WHERE user_id=OLD.id;
 DELETE FROM public.app_admins WHERE user_id=OLD.id;
 RETURN OLD;
END $$;
