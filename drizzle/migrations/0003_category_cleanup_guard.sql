CREATE OR REPLACE FUNCTION public.guard_category_change() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF TG_OP='DELETE' THEN
 -- Only nested calls from the privileged auth lifecycle may remove the system default.
 IF OLD.is_system AND NOT (pg_trigger_depth()>1 AND current_user NOT IN ('authenticated','anon','authenticator')) THEN RAISE EXCEPTION 'CATEGORY_SYSTEM' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.transactions WHERE user_id=OLD.user_id AND category=OLD.name) THEN RAISE EXCEPTION 'CATEGORY_IN_USE' USING ERRCODE='23503'; END IF;
 RETURN OLD;
 END IF;
 IF NEW.is_system IS DISTINCT FROM OLD.is_system OR (OLD.is_system AND (NEW.name<>OLD.name OR NEW.kind<>OLD.kind OR NEW.sort_order<>OLD.sort_order)) THEN RAISE EXCEPTION 'CATEGORY_SYSTEM' USING ERRCODE='42501'; END IF;
 IF NEW.name<>OLD.name THEN UPDATE public.transactions SET category=NEW.name WHERE user_id=OLD.user_id AND category=OLD.name; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.cleanup_deleted_finance_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 DELETE FROM public.transactions WHERE user_id=OLD.id;
 DELETE FROM public.incomes WHERE user_id=OLD.id;
 DELETE FROM public.cards WHERE user_id=OLD.id;
 DELETE FROM public.categories WHERE user_id=OLD.id;
 RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_finance_account() FROM PUBLIC,anon,authenticated;