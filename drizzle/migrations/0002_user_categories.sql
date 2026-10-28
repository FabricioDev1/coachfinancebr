CREATE TABLE public.categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(),
 name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40 AND name=btrim(name)),
 color text NOT NULL DEFAULT 'brand' CHECK(color IN ('brand','accent','warn','danger','violet')),
 kind text NOT NULL DEFAULT 'expense' CHECK(kind IN ('expense','income','both')),
 is_system boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 50,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.categories TO authenticated;
GRANT INSERT(user_id,name,color,kind,sort_order) ON public.categories TO authenticated;
GRANT UPDATE(name,color,kind,sort_order) ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories" ON public.categories FOR ALL TO authenticated USING ((SELECT auth.uid())=user_id) WITH CHECK ((SELECT auth.uid())=user_id);
CREATE FUNCTION public.category_name_key(value text) RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path=public AS $$ SELECT lower(translate(value,'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇç','AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCc')) $$;
CREATE UNIQUE INDEX categories_user_name_uidx ON public.categories(user_id,public.category_name_key(name));
CREATE UNIQUE INDEX categories_system_uidx ON public.categories(user_id) WHERE is_system;
CREATE INDEX transactions_user_category_idx ON public.transactions(user_id,category);
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_lock_user BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.prevent_user_id_change();
CREATE FUNCTION public.seed_categories_for(p_uid uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.uid() IS NULL OR auth.uid()<>p_uid THEN RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_uid::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.categories WHERE user_id=p_uid) THEN
 INSERT INTO public.categories(user_id,name,color,kind,is_system,sort_order)
 SELECT p_uid,d.* FROM (VALUES
 ('Alimentação','warn','expense',false,1),('Moradia','brand','expense',false,2),('Transporte','accent','expense',false,3),('Educação','violet','expense',false,4),('Saúde','danger','expense',false,5),('Lazer','accent','expense',false,6),('Assinaturas','violet','expense',false,7),('Compras','warn','expense',false,8),('Contas','brand','expense',false,9),('Salário','accent','income',false,10),('Renda extra','accent','income',false,11),('Outros','brand','both',true,99)) AS d(name,color,kind,is_system,sort_order) ON CONFLICT DO NOTHING;
 END IF;
 INSERT INTO public.categories(user_id,name,color,kind,sort_order)
 SELECT DISTINCT p_uid,t.category,'brand','both',50 FROM public.transactions t WHERE t.user_id=p_uid ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.seed_categories_for(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.ensure_default_categories() RETURNS SETOF public.categories LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid();
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE='42501'; END IF;
 PERFORM public.seed_categories_for(v_uid);
 RETURN QUERY SELECT * FROM public.categories WHERE user_id=v_uid ORDER BY sort_order,name;
END $$;
REVOKE ALL ON FUNCTION public.ensure_default_categories() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_categories() TO authenticated;
-- Backfill every existing finance owner as part of adding the category relation.
INSERT INTO public.categories(user_id,name,color,kind,is_system,sort_order)
SELECT u.user_id,d.* FROM (SELECT user_id FROM public.cards UNION SELECT user_id FROM public.incomes UNION SELECT user_id FROM public.transactions) u CROSS JOIN (VALUES
 ('Alimentação','warn','expense',false,1),('Moradia','brand','expense',false,2),('Transporte','accent','expense',false,3),('Educação','violet','expense',false,4),('Saúde','danger','expense',false,5),('Lazer','accent','expense',false,6),('Assinaturas','violet','expense',false,7),('Compras','warn','expense',false,8),('Contas','brand','expense',false,9),('Salário','accent','income',false,10),('Renda extra','accent','income',false,11),('Outros','brand','both',true,99)) AS d(name,color,kind,is_system,sort_order) ON CONFLICT DO NOTHING;
INSERT INTO public.categories(user_id,name,color,kind,sort_order) SELECT DISTINCT user_id,category,'brand','both',50 FROM public.transactions ON CONFLICT DO NOTHING;
ALTER TABLE public.transactions DROP CONSTRAINT transactions_category_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_length CHECK(char_length(category) BETWEEN 1 AND 40 AND category=btrim(category));
CREATE FUNCTION public.lock_finance_categories() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(NEW.user_id,OLD.user_id)::text,0));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.lock_finance_categories() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER categories_00_lock BEFORE INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.lock_finance_categories();
CREATE TRIGGER transactions_00_category_lock BEFORE INSERT OR UPDATE OR DELETE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.lock_finance_categories();
CREATE FUNCTION public.check_transaction_category() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 -- Deferred events read the final row, including subsequent renames in this transaction.
 IF EXISTS(SELECT 1 FROM public.transactions t WHERE t.id=NEW.id AND NOT EXISTS(SELECT 1 FROM public.categories c WHERE c.user_id=t.user_id AND c.name=t.category)) THEN
 RAISE EXCEPTION 'CATEGORY_NOT_FOUND' USING ERRCODE='23503'; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.check_transaction_category() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER transactions_category_guard AFTER INSERT OR UPDATE ON public.transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_transaction_category();
CREATE FUNCTION public.guard_category_change() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
 IF OLD.is_system AND EXISTS(SELECT 1 FROM auth.users WHERE id=OLD.user_id) THEN RAISE EXCEPTION 'CATEGORY_SYSTEM' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.transactions WHERE user_id=OLD.user_id AND category=OLD.name) THEN RAISE EXCEPTION 'CATEGORY_IN_USE' USING ERRCODE='23503'; END IF;
 RETURN OLD;
 END IF;
 IF NEW.is_system IS DISTINCT FROM OLD.is_system OR (OLD.is_system AND (NEW.name<>OLD.name OR NEW.kind<>OLD.kind OR NEW.sort_order<>OLD.sort_order)) THEN RAISE EXCEPTION 'CATEGORY_SYSTEM' USING ERRCODE='42501'; END IF;
 IF NEW.name<>OLD.name THEN UPDATE public.transactions SET category=NEW.name WHERE user_id=OLD.user_id AND category=OLD.name; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_category_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER categories_guard BEFORE UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.guard_category_change();
CREATE FUNCTION public.transfer_category(p_from uuid,p_to uuid,p_delete_source boolean DEFAULT false) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE v_uid uuid:=auth.uid(); v_from public.categories; v_to public.categories; v_count integer;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text,0));
 SELECT * INTO v_from FROM public.categories WHERE id=p_from AND user_id=v_uid FOR UPDATE;
 SELECT * INTO v_to FROM public.categories WHERE id=p_to AND user_id=v_uid FOR UPDATE;
 IF v_from.id IS NULL OR v_to.id IS NULL THEN RAISE EXCEPTION 'CATEGORY_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF v_from.id=v_to.id THEN RAISE EXCEPTION 'CATEGORY_SAME' USING ERRCODE='22023'; END IF;
 UPDATE public.transactions SET category=v_to.name WHERE user_id=v_uid AND category=v_from.name;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF p_delete_source THEN DELETE FROM public.categories WHERE id=v_from.id AND user_id=v_uid; END IF;
 RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.transfer_category(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transfer_category(uuid,uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.cleanup_deleted_finance_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 DELETE FROM public.transactions WHERE user_id=OLD.id;
 DELETE FROM public.incomes WHERE user_id=OLD.id;
 DELETE FROM public.cards WHERE user_id=OLD.id;
 -- Delete the protected default through a trusted lifecycle trigger, not a user-settable flag.
 ALTER TABLE public.categories DISABLE TRIGGER categories_guard;
 DELETE FROM public.categories WHERE user_id=OLD.id;
 ALTER TABLE public.categories ENABLE TRIGGER categories_guard;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_finance_account() FROM PUBLIC,anon,authenticated;