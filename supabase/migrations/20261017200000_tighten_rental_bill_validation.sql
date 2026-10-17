-- Follow-up to 20261017100000 (security review): the database must accept nothing the app
-- can't read back. Dates must be real calendar dates, and names need a visible character.

CREATE OR REPLACE FUNCTION public.rental_real_date(p text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
BEGIN
  IF p IS NULL OR p !~ '^\d{4}-\d{2}-\d{2}$' THEN RETURN false; END IF;
  RETURN to_char(p::date, 'YYYY-MM-DD') = p;
EXCEPTION WHEN others THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.rental_valid_bill_lines(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE l jsonb; m jsonb;
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
        OR jsonb_typeof(m->'fromValue') IS DISTINCT FROM 'number' OR jsonb_typeof(m->'toValue') IS DISTINCT FROM 'number'
        OR jsonb_typeof(m->'usage') IS DISTINCT FROM 'number'
        OR coalesce(m->>'rate', '') !~ '^\d{1,10}$' OR coalesce(m->>'sharedWith', '') !~ '^[1-9]\d{0,2}$'
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(m->'readings') r WHERE jsonb_typeof(r.value) <> 'string')
      THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.rental_valid_charges(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE c jsonb;
BEGIN
  IF jsonb_typeof(p) IS DISTINCT FROM 'array' OR jsonb_array_length(p) > 20 THEN RETURN false; END IF;
  FOR c IN SELECT value FROM jsonb_array_elements(p) LOOP
    IF jsonb_typeof(c) <> 'object'
      OR jsonb_typeof(c->'label') IS DISTINCT FROM 'string' OR char_length(c->>'label') > 60
      OR c->>'label' !~ '[[:alnum:][:punct:]]'
      OR jsonb_typeof(c->'amount') IS DISTINCT FROM 'number' OR (c->>'amount') !~ '^\d{1,10}$'
    THEN RETURN false; END IF;
    IF (c->>'amount')::bigint NOT BETWEEN 1 AND 2000000000 THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;

-- Replacing a CHECK's function doesn't re-check old rows, so check them here.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.rental_bills WHERE NOT public.rental_valid_bill_lines(lines))
    OR EXISTS (SELECT 1 FROM public.rental_tenancies WHERE NOT public.rental_valid_charges(charges))
  THEN RAISE EXCEPTION 'Existing bills or charges fail the tightened checks'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.rental_real_date(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rental_real_date(text) TO authenticated;
