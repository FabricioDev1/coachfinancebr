CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  credit_limit numeric(12,2) NOT NULL CHECK (credit_limit >= 0),
  closing_day integer NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color text NOT NULL DEFAULT 'brand' CHECK (color IN ('brand','accent','warn','danger','violet')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cards" ON public.cards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cards_updated_at BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 100),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reference_month date NOT NULL,
  received_date date,
  status text NOT NULL DEFAULT 'expected' CHECK (status IN ('received','expected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incomes TO authenticated;
GRANT ALL ON public.incomes TO service_role;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own incomes" ON public.incomes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX incomes_user_month_idx ON public.incomes(user_id, reference_month);
CREATE TRIGGER incomes_updated_at BEFORE UPDATE ON public.incomes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid REFERENCES public.cards(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 120),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  transaction_type text NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('income','expense')),
  due_date date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('credit','debit','pix','cash')),
  payment_source text NOT NULL CHECK (char_length(payment_source) BETWEEN 1 AND 80),
  category text NOT NULL CHECK (category IN ('Alimentação','Moradia','Transporte','Educação','Saúde','Lazer','Assinaturas','Compras','Contas','Outros')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid','pending')),
  installment_number integer NOT NULL DEFAULT 1 CHECK (installment_number > 0),
  installment_count integer NOT NULL DEFAULT 1 CHECK (installment_count > 0 AND installment_count <= 120),
  recurrence text NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','monthly','indefinite')),
  recurrence_months integer CHECK (recurrence_months IS NULL OR recurrence_months BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((payment_method = 'credit' AND card_id IS NOT NULL) OR (payment_method <> 'credit' AND card_id IS NULL))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX transactions_user_due_idx ON public.transactions(user_id, due_date);
CREATE INDEX transactions_user_method_idx ON public.transactions(user_id, payment_method);
CREATE INDEX transactions_card_idx ON public.transactions(card_id);
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();