-- Run after the weight migration. Fixtures and assertions are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'weight-owner@example.com'),
  ('00000000-0000-0000-0000-00000000a002', 'weight-other@example.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);

INSERT INTO public.weight_entries (user_id, entry_date, kg) VALUES (auth.uid(), '2026-10-01', 82.4);
INSERT INTO public.weight_settings (user_id, height_cm, goal_kg) VALUES (auth.uid(), 170.5, 70);

DO $$ BEGIN
  BEGIN
    INSERT INTO public.weight_entries (user_id, entry_date, kg) VALUES (auth.uid(), '2026-10-01', 81);
    RAISE EXCEPTION 'Second entry for one day was allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.weight_entries (user_id, entry_date, kg) VALUES (auth.uid(), '2026-10-02', 19.9);
    RAISE EXCEPTION 'Implausibly low weight was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.weight_entries (user_id, entry_date, kg) VALUES (auth.uid(), '2026-10-02', 501);
    RAISE EXCEPTION 'Implausibly high weight was allowed';
  EXCEPTION WHEN check_violation OR numeric_value_out_of_range THEN NULL; END;
  BEGIN
    UPDATE public.weight_settings SET height_cm = 49 WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Implausible height was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.weight_settings SET goal_kg = 19 WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Implausible goal was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.weight_entries (user_id, entry_date, kg)
    VALUES ('00000000-0000-0000-0000-00000000a002', '2026-10-03', 70);
    RAISE EXCEPTION 'Entry for another user was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

UPDATE public.weight_entries SET kg = 81.9 WHERE entry_date = '2026-10-01';
UPDATE public.weight_settings SET goal_kg = NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.weight_entries WHERE kg = 81.9) THEN RAISE EXCEPTION 'Owner entry update failed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.weight_settings WHERE goal_kg IS NULL AND height_cm = 170.5) THEN
    RAISE EXCEPTION 'Clearing the goal failed';
  END IF;
END $$;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.weight_entries) THEN RAISE EXCEPTION 'Entries leaked across users'; END IF;
  IF EXISTS (SELECT 1 FROM public.weight_settings) THEN RAISE EXCEPTION 'Settings leaked across users'; END IF;
END $$;
UPDATE public.weight_entries SET kg = 30;
DELETE FROM public.weight_entries;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.weight_entries WHERE kg = 81.9) THEN RAISE EXCEPTION 'Another user changed or deleted an entry'; END IF;
END $$;
DELETE FROM public.weight_entries;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.weight_entries) THEN RAISE EXCEPTION 'Owner delete failed'; END IF;
END $$;

RESET ROLE;
DO $$ BEGIN
  IF has_table_privilege('anon', 'public.weight_entries', 'SELECT') OR has_table_privilege('anon', 'public.weight_settings', 'SELECT') THEN
    RAISE EXCEPTION 'anon can read weight tables';
  END IF;
END $$;
ROLLBACK;
