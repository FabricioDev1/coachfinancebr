ALTER TABLE public.transactions
ADD COLUMN issue_date date;

UPDATE public.transactions
SET issue_date = due_date
WHERE issue_date IS NULL;

ALTER TABLE public.transactions
ALTER COLUMN issue_date SET NOT NULL;