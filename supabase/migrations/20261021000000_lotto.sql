-- Lotto: PCSO 6-number draw results (shared, written only by the lotto-sync edge function) and each user's maintained numbers.

-- Results -----------------------------------------------------------------------------------------------------------
CREATE TABLE public.lotto_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL CHECK (game IN ('6/42', '6/45', '6/49', '6/55', '6/58')),
  draw_date date NOT NULL,
  -- In the order they were drawn, as PCSO publishes them.
  numbers smallint[] NOT NULL,
  jackpot numeric(14, 2) NOT NULL DEFAULT 0 CHECK (jackpot >= 0),
  winners integer NOT NULL DEFAULT 0 CHECK (winners >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game, draw_date),
  CONSTRAINT lotto_draws_numbers_valid CHECK (
    cardinality(numbers) = 6 AND 1 <= ALL (numbers)
    AND (CASE game WHEN '6/42' THEN 42 WHEN '6/45' THEN 45 WHEN '6/49' THEN 49 WHEN '6/55' THEN 55 ELSE 58 END) >= ALL (numbers)
  )
);
CREATE INDEX lotto_draws_recent ON public.lotto_draws (draw_date DESC, game);

ALTER TABLE public.lotto_draws ENABLE ROW LEVEL SECURITY;
-- Everyone signed in can read; no write policy, so only the service role (the edge function) can insert.
CREATE POLICY "Signed-in users read lotto draws" ON public.lotto_draws FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.lotto_draws TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lotto_draws TO service_role;

-- Maintained numbers --------------------------------------------------------------------------------------------------
CREATE TABLE public.lotto_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  game text NOT NULL CHECK (game IN ('6/42', '6/45', '6/49', '6/55', '6/58')),
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 60),
  -- Kept sorted by the trigger below.
  numbers smallint[] NOT NULL,
  -- A paused set is kept but not checked against new draws.
  active boolean NOT NULL DEFAULT true,
  -- Draws before this day are not checked: the numbers count from the day they were saved.
  starts_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Manila')::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lotto_numbers_valid CHECK (
    cardinality(numbers) = 6 AND 1 <= ALL (numbers)
    AND (CASE game WHEN '6/42' THEN 42 WHEN '6/45' THEN 45 WHEN '6/49' THEN 49 WHEN '6/55' THEN 55 ELSE 58 END) >= ALL (numbers)
  )
);
CREATE INDEX lotto_numbers_user ON public.lotto_numbers (user_id, game);

CREATE FUNCTION public.lotto_numbers_prepare() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(DISTINCT n) FROM unnest(NEW.numbers) AS n) <> 6 THEN
    RAISE EXCEPTION 'Choose 6 different numbers';
  END IF;
  SELECT array_agg(n ORDER BY n) INTO NEW.numbers FROM unnest(NEW.numbers) AS n;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' AND (SELECT count(*) FROM public.lotto_numbers WHERE user_id = NEW.user_id) >= 20 THEN
    RAISE EXCEPTION 'You can keep up to 20 sets of numbers';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER lotto_numbers_prepare BEFORE INSERT OR UPDATE ON public.lotto_numbers
  FOR EACH ROW EXECUTE FUNCTION public.lotto_numbers_prepare();

ALTER TABLE public.lotto_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage lotto numbers" ON public.lotto_numbers FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lotto_numbers TO authenticated;

-- Schedule ------------------------------------------------------------------------------------------------------------
-- PCSO posts the 9 PM draws a little after 10 PM (PHT), so look then, once more later that night, and again in the
-- morning in case the site was late. The call reads its URL and key from Vault each run and does nothing until both
-- are set: select vault.create_secret('<project url>/functions/v1/lotto-sync', 'lotto_sync_url');
--          select vault.create_secret('<service role key>', 'lotto_sync_key');
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule('lotto-sync', '15 14,15,22 * * *', $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lotto_sync_url'),
    headers := jsonb_build_object('Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'lotto_sync_key')),
    body := '{}'::jsonb
  ) WHERE EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'lotto_sync_url')
    AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'lotto_sync_key');
$cron$);
