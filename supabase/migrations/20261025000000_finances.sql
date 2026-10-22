CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  color text NOT NULL DEFAULT '#6366f1' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id, kind)
);
CREATE UNIQUE INDEX finance_categories_unique_name ON public.finance_categories (user_id, kind, lower(btrim(name)));

-- Amounts are positive integer centavos; `kind` carries the direction.
-- The id is a stable uuid so other modules (e.g. receipts) can reference a transaction.
CREATE TABLE public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('income', 'expense')),
  amount_centavos bigint NOT NULL CHECK (amount_centavos > 0 AND amount_centavos <= 2000000000),
  occurred_on date NOT NULL,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 200),
  category_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id),
  FOREIGN KEY (category_id, user_id, kind) REFERENCES public.finance_categories (id, user_id, kind)
    ON DELETE SET NULL (category_id)
);
CREATE INDEX finance_transactions_user_date_idx ON public.finance_transactions (user_id, occurred_on DESC);
CREATE INDEX finance_transactions_category_idx ON public.finance_transactions (category_id);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_categories, public.finance_transactions TO authenticated;

CREATE POLICY "Owners manage finance categories" ON public.finance_categories
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners manage finance transactions" ON public.finance_transactions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE FUNCTION public.finance_transaction_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER finance_transaction_updated_at BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.finance_transaction_updated_at();
