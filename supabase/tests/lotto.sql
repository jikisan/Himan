-- Run after the lotto migration. Fixtures and assertions are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-00000000a001', 'lotto-owner@example.com'),
  ('00000000-0000-0000-0000-00000000a002', 'lotto-other@example.com');
INSERT INTO public.lotto_draws (game, draw_date, numbers, jackpot, winners)
VALUES ('6/45', '2026-10-19', '{16,3,24,34,41,31}', 15000000, 0);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);

DO $$ BEGIN
  -- Results are readable but never writable by users.
  IF (SELECT count(*) FROM public.lotto_draws) <> 1 THEN RAISE EXCEPTION 'Signed-in users cannot read draws'; END IF;
  BEGIN
    INSERT INTO public.lotto_draws (game, draw_date, numbers) VALUES ('6/45', '2026-10-20', '{1,2,3,4,5,6}');
    RAISE EXCEPTION 'A user wrote a draw';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- Numbers are stored sorted; the start day is today in Manila.
INSERT INTO public.lotto_numbers (id, user_id, game, label, numbers)
VALUES ('00000000-0000-0000-0000-00000000a101', auth.uid(), '6/45', 'Birthday', '{44,5,12,23,31,40}');
DO $$ BEGIN
  IF (SELECT numbers FROM public.lotto_numbers WHERE label = 'Birthday') <> '{5,12,23,31,40,44}'::smallint[] THEN
    RAISE EXCEPTION 'Numbers were not sorted';
  END IF;
  IF (SELECT starts_on FROM public.lotto_numbers WHERE label = 'Birthday') <> (now() AT TIME ZONE 'Asia/Manila')::date THEN
    RAISE EXCEPTION 'Start day is not today in Manila';
  END IF;
  -- Several sets for one game are fine.
  INSERT INTO public.lotto_numbers (user_id, game, label, numbers) VALUES (auth.uid(), '6/45', 'Lucky', '{1,2,3,4,5,6}');
  -- Duplicates, out-of-range numbers and wrong counts are refused.
  BEGIN INSERT INTO public.lotto_numbers (user_id, game, numbers) VALUES (auth.uid(), '6/45', '{1,1,2,3,4,5}');
    RAISE EXCEPTION 'Duplicates were allowed'; EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'Choose 6 different numbers' THEN RAISE; END IF; END;
  BEGIN INSERT INTO public.lotto_numbers (user_id, game, numbers) VALUES (auth.uid(), '6/42', '{1,2,3,4,5,43}');
    RAISE EXCEPTION 'A number above 42 was allowed in 6/42'; EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO public.lotto_numbers (user_id, game, numbers) VALUES (auth.uid(), '6/45', '{1,2,3,4,5}');
    RAISE EXCEPTION 'Five numbers were allowed'; EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'Choose 6 different numbers' THEN RAISE; END IF; END;
  -- The cap is 20 sets in all.
  FOR i IN 1..18 LOOP
    INSERT INTO public.lotto_numbers (user_id, game, numbers) VALUES (auth.uid(), '6/55', ARRAY[i, i + 1, i + 2, i + 3, i + 4, i + 5]);
  END LOOP;
  BEGIN INSERT INTO public.lotto_numbers (user_id, game, numbers) VALUES (auth.uid(), '6/55', '{50,51,52,53,54,55}');
    RAISE EXCEPTION 'A 21st set was allowed'; EXCEPTION WHEN raise_exception THEN
      IF SQLERRM <> 'You can keep up to 20 sets of numbers' THEN RAISE; END IF; END;
END $$;

-- Another user sees none of it and cannot touch it or write as the owner.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.lotto_numbers) <> 0 THEN RAISE EXCEPTION 'Another user can read numbers'; END IF;
  UPDATE public.lotto_numbers SET active = false;
  DELETE FROM public.lotto_numbers;
  BEGIN INSERT INTO public.lotto_numbers (user_id, game, numbers) VALUES ('00000000-0000-0000-0000-00000000a001', '6/45', '{7,8,9,10,11,12}');
    RAISE EXCEPTION 'Wrote as another user'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.lotto_numbers) <> 20 THEN RAISE EXCEPTION 'The other user changed or removed numbers'; END IF;
  IF (SELECT count(*) FROM public.lotto_numbers WHERE active) <> 20 THEN RAISE EXCEPTION 'The other user paused numbers'; END IF;
END $$;
ROLLBACK;
