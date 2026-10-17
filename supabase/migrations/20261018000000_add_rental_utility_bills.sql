-- Utilities billed by the month's actual bill amount (e.g. the whole house's electricity bill), instead of a meter
-- or a fixed amount. Mode 'monthly' has no price on the room; the amount is entered each month per room.

-- 1. Allow the new mode. The original checks were unnamed, so find them by what they check.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.rental_units'::regclass AND contype = 'c'
      AND (pg_get_constraintdef(oid) LIKE '%electric_mode%' OR pg_get_constraintdef(oid) LIKE '%water_mode%')
  LOOP
    EXECUTE format('ALTER TABLE public.rental_units DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.rental_units
  ADD CONSTRAINT rental_units_electric_mode_check CHECK (electric_mode IN ('none', 'submeter', 'fixed', 'monthly')),
  ADD CONSTRAINT rental_units_water_mode_check CHECK (water_mode IN ('none', 'submeter', 'fixed', 'monthly')),
  -- A price only where one is used: none and monthly have none.
  ADD CONSTRAINT rental_units_electric_amount_check CHECK ((electric_mode IN ('none', 'monthly')) = (electric_amount_centavos = 0)),
  ADD CONSTRAINT rental_units_water_amount_check CHECK ((water_mode IN ('none', 'monthly')) = (water_amount_centavos = 0));

-- 2. One amount per room, utility and month.
CREATE TABLE public.rental_utility_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('electric', 'water')),
  period text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  amount_centavos integer NOT NULL CHECK (amount_centavos BETWEEN 1 AND 2000000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, kind, period),
  FOREIGN KEY (unit_id, property_id) REFERENCES public.rental_units(id, property_id) ON DELETE CASCADE
);

ALTER TABLE public.rental_utility_bills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_utility_bills FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.rental_utility_bills TO authenticated;
GRANT UPDATE (amount_centavos) ON public.rental_utility_bills TO authenticated;

CREATE POLICY "Members read utility bills" ON public.rental_utility_bills FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers add utility bills" ON public.rental_utility_bills FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers fix utility bills" ON public.rental_utility_bills FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers delete utility bills" ON public.rental_utility_bills FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

-- 3. Bill lines may say which month's utility bill they come from ("billMonth": "2026-10").
CREATE OR REPLACE FUNCTION public.rental_valid_bill_lines(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
-- v: a plain non-negative decimal (no exponent), so JavaScript reads it back exactly.
DECLARE l jsonb; m jsonb; v constant text := '^\d{1,12}(\.\d{1,2})?$';
BEGIN
  IF jsonb_typeof(p) IS DISTINCT FROM 'array' OR jsonb_array_length(p) NOT BETWEEN 1 AND 60 THEN RETURN false; END IF;
  FOR l IN SELECT value FROM jsonb_array_elements(p) LOOP
    IF jsonb_typeof(l) <> 'object'
      OR coalesce(l->>'kind', '') NOT IN ('rent', 'advance', 'deposit', 'charge', 'electric', 'water', 'penalty', 'other')
      OR jsonb_typeof(l->'label') IS DISTINCT FROM 'string' OR char_length(l->>'label') > 80
      OR l->>'label' !~ '[[:alnum:][:punct:]]'
      OR jsonb_typeof(l->'amount') IS DISTINCT FROM 'number' OR (l->>'amount') !~ '^-?\d{1,10}$'
    THEN RETURN false; END IF;
    IF abs((l->>'amount')::bigint) > 2000000000 THEN RETURN false; END IF;
    IF l ? 'period' AND (jsonb_typeof(l->'period') IS DISTINCT FROM 'object'
      OR NOT public.rental_real_date(l->'period'->>'from') OR NOT public.rental_real_date(l->'period'->>'to')) THEN RETURN false; END IF;
    IF l ? 'billMonth' AND (jsonb_typeof(l->'billMonth') IS DISTINCT FROM 'string'
      OR l->>'billMonth' !~ '^\d{4}-(0[1-9]|1[0-2])$') THEN RETURN false; END IF;
    IF l ? 'meter' THEN
      m := l->'meter';
      IF jsonb_typeof(m) IS DISTINCT FROM 'object' OR jsonb_typeof(m->'readings') IS DISTINCT FROM 'array'
        OR NOT public.rental_real_date(m->>'fromDate') OR NOT public.rental_real_date(m->>'toDate')
        OR jsonb_typeof(m->'fromValue') IS DISTINCT FROM 'number' OR (m->>'fromValue') !~ v
        OR jsonb_typeof(m->'toValue') IS DISTINCT FROM 'number' OR (m->>'toValue') !~ v
        OR jsonb_typeof(m->'usage') IS DISTINCT FROM 'number' OR (m->>'usage') !~ v
        OR jsonb_typeof(m->'rate') IS DISTINCT FROM 'number' OR (m->>'rate') !~ '^\d{1,10}$'
        OR jsonb_typeof(m->'sharedWith') IS DISTINCT FROM 'number' OR (m->>'sharedWith') !~ '^[1-9]\d{0,2}$'
        OR jsonb_array_length(m->'readings') > 400
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(m->'readings') r WHERE jsonb_typeof(r.value) <> 'string')
      THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;
