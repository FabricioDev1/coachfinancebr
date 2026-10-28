ALTER TABLE public.cards ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.incomes ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
CREATE OR REPLACE FUNCTION public.check_transaction_ownership() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.card_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.cards c WHERE c.id=NEW.card_id AND c.user_id=NEW.user_id) THEN RAISE EXCEPTION 'Cartão inválido para este usuário' USING ERRCODE='42501'; END IF;
IF NEW.parent_id IS NOT NULL AND NEW.parent_id<>NEW.id AND NOT EXISTS(SELECT 1 FROM public.transactions t WHERE t.id=NEW.parent_id AND t.user_id=NEW.user_id) THEN RAISE EXCEPTION 'Série inválida para este usuário' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.check_transaction_ownership() FROM PUBLIC,anon,authenticated;
CREATE CONSTRAINT TRIGGER transactions_ownership_guard AFTER INSERT OR UPDATE ON public.transactions DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.check_transaction_ownership();
CREATE OR REPLACE FUNCTION public.prevent_user_id_change() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'user_id não pode ser alterado' USING ERRCODE='42501'; END IF; RETURN NEW; END $$;
CREATE TRIGGER cards_lock_user BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.prevent_user_id_change();
CREATE TRIGGER incomes_lock_user BEFORE UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.prevent_user_id_change();
CREATE TRIGGER transactions_lock_user BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.prevent_user_id_change();
CREATE INDEX IF NOT EXISTS transactions_parent_idx ON public.transactions(parent_id);
CREATE UNIQUE INDEX transactions_indefinite_unique ON public.transactions(user_id,parent_id,due_date) WHERE recurrence='indefinite' AND parent_id IS NOT NULL;
-- Auth lifecycle exception: deleting a verified auth account atomically cleans app data, without new auth schema foreign keys.
CREATE OR REPLACE FUNCTION public.cleanup_deleted_finance_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN DELETE FROM public.transactions WHERE user_id=OLD.id; DELETE FROM public.incomes WHERE user_id=OLD.id; DELETE FROM public.cards WHERE user_id=OLD.id; RETURN OLD; END $$;
REVOKE ALL ON FUNCTION public.cleanup_deleted_finance_account() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER finance_account_cleanup BEFORE DELETE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.cleanup_deleted_finance_account();