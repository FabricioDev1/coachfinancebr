CREATE TABLE public.assistant_usage (user_id uuid NOT NULL DEFAULT auth.uid(), day date NOT NULL, uses integer NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
GRANT SELECT ON public.assistant_usage TO authenticated;
GRANT ALL ON public.assistant_usage TO service_role;
ALTER TABLE public.assistant_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own usage read" ON public.assistant_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.consume_assistant_quota(p_limit integer DEFAULT 30) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_day date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; v_uses integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.assistant_usage(user_id, day, uses) VALUES (auth.uid(), v_day, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET uses = assistant_usage.uses + 1 WHERE assistant_usage.uses < LEAST(p_limit, 30)
  RETURNING uses INTO v_uses;
  RETURN v_uses IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.consume_assistant_quota(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consume_assistant_quota(integer) TO authenticated;