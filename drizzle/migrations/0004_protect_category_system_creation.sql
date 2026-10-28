CREATE FUNCTION public.guard_category_insert() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF NEW.is_system AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'CATEGORY_SYSTEM' USING ERRCODE='42501'; END IF;
 IF NEW.is_system AND (NEW.name<>'Outros' OR NEW.kind<>'both' OR NEW.sort_order<>99) THEN RAISE EXCEPTION 'CATEGORY_SYSTEM' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_category_insert() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER categories_insert_guard BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION public.guard_category_insert();