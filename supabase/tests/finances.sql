-- Run after the finances migration. Fixtures and assertions are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000fa01', 'fin-owner@example.com'),
  ('00000000-0000-0000-0000-00000000fa02', 'fin-other@example.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000fa01', true);

INSERT INTO public.finance_categories (id, user_id, kind, name) VALUES
  ('00000000-0000-0000-0000-00000000fb01', auth.uid(), 'expense', 'Food'),
  ('00000000-0000-0000-0000-00000000fb02', auth.uid(), 'income', 'Salary');
INSERT INTO public.finance_transactions (id, user_id, kind, amount_centavos, occurred_on, category_id) VALUES
  ('00000000-0000-0000-0000-00000000fc01', auth.uid(), 'expense', 15050, '2026-10-02', '00000000-0000-0000-0000-00000000fb01');

DO $$ BEGIN
  BEGIN
    INSERT INTO public.finance_transactions (user_id, kind, amount_centavos, occurred_on) VALUES (auth.uid(), 'expense', 0, '2026-10-02');
    RAISE EXCEPTION 'Zero amount was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.finance_transactions (user_id, kind, amount_centavos, occurred_on) VALUES (auth.uid(), 'bogus', 100, '2026-10-02');
    RAISE EXCEPTION 'Unknown kind was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.finance_categories (user_id, kind, name) VALUES (auth.uid(), 'expense', ' food ');
    RAISE EXCEPTION 'Duplicate category name was allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.finance_transactions (user_id, kind, amount_centavos, occurred_on, category_id)
    VALUES (auth.uid(), 'income', 100, '2026-10-02', '00000000-0000-0000-0000-00000000fb01');
    RAISE EXCEPTION 'Income used an expense category';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.finance_transactions (user_id, kind, amount_centavos, occurred_on)
    VALUES ('00000000-0000-0000-0000-00000000fa02', 'expense', 100, '2026-10-02');
    RAISE EXCEPTION 'Wrote a row for another user';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Deleting a category keeps the transaction (and the owner id) and clears the link.
  DELETE FROM public.finance_categories WHERE id = '00000000-0000-0000-0000-00000000fb01';
  IF (SELECT category_id FROM public.finance_transactions WHERE id = '00000000-0000-0000-0000-00000000fc01') IS NOT NULL
     OR (SELECT user_id FROM public.finance_transactions WHERE id = '00000000-0000-0000-0000-00000000fc01') <> auth.uid()
  THEN RAISE EXCEPTION 'Category delete did not clear only the category link'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000fa02', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.finance_transactions) <> 0 OR (SELECT count(*) FROM public.finance_categories) <> 0
  THEN RAISE EXCEPTION 'Another user can read finances'; END IF;
  UPDATE public.finance_transactions SET note = 'x';
  IF FOUND THEN RAISE EXCEPTION 'Another user updated finances'; END IF;
END $$;
ROLLBACK;
