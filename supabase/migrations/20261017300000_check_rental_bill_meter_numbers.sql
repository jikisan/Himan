-- Follow-up to 20261017200000 (security review): meter numbers on a bill line must be real JSON
-- numbers in plain decimal form, so every stored line reads back in the app.

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

-- Replacing a CHECK's function doesn't re-check old rows, so check them here.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.rental_bills WHERE NOT public.rental_valid_bill_lines(lines))
  THEN RAISE EXCEPTION 'Existing bills fail the tightened meter checks'; END IF;
END $$;
