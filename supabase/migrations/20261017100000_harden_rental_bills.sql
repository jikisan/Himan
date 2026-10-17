-- Hardening for 20261017000000 (security review):
-- 1. Bills are issued only through rental_issue_bill, which now checks the role itself, and
--    bill numbers must match PREFIX-YYYY-NNNN, so a hand-made row can't jam the numbering.
-- 2. Every bill line and extra charge is validated in the database, so one malformed row
--    can't break loading for everyone on the property.

CREATE FUNCTION public.rental_valid_bill_lines(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE l jsonb; m jsonb; d constant text := '^\d{4}-\d{2}-\d{2}$';
BEGIN
  IF jsonb_typeof(p) IS DISTINCT FROM 'array' OR jsonb_array_length(p) NOT BETWEEN 1 AND 60 THEN RETURN false; END IF;
  FOR l IN SELECT value FROM jsonb_array_elements(p) LOOP
    IF jsonb_typeof(l) <> 'object'
      OR coalesce(l->>'kind', '') NOT IN ('rent', 'advance', 'deposit', 'charge', 'electric', 'water', 'penalty', 'other')
      OR jsonb_typeof(l->'label') IS DISTINCT FROM 'string' OR char_length(btrim(l->>'label')) NOT BETWEEN 1 AND 80
      OR jsonb_typeof(l->'amount') IS DISTINCT FROM 'number' OR (l->>'amount') !~ '^-?\d{1,10}$'
    THEN RETURN false; END IF;
    IF abs((l->>'amount')::bigint) > 2000000000 THEN RETURN false; END IF;
    IF l ? 'period' AND (jsonb_typeof(l->'period') IS DISTINCT FROM 'object'
      OR coalesce(l->'period'->>'from', '') !~ d OR coalesce(l->'period'->>'to', '') !~ d) THEN RETURN false; END IF;
    IF l ? 'meter' THEN
      m := l->'meter';
      IF jsonb_typeof(m) IS DISTINCT FROM 'object' OR jsonb_typeof(m->'readings') IS DISTINCT FROM 'array'
        OR coalesce(m->>'fromDate', '') !~ d OR coalesce(m->>'toDate', '') !~ d
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

CREATE FUNCTION public.rental_valid_charges(p jsonb) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE c jsonb;
BEGIN
  IF jsonb_typeof(p) IS DISTINCT FROM 'array' OR jsonb_array_length(p) > 20 THEN RETURN false; END IF;
  FOR c IN SELECT value FROM jsonb_array_elements(p) LOOP
    IF jsonb_typeof(c) <> 'object'
      OR jsonb_typeof(c->'label') IS DISTINCT FROM 'string' OR char_length(btrim(c->>'label')) NOT BETWEEN 1 AND 60
      OR jsonb_typeof(c->'amount') IS DISTINCT FROM 'number' OR (c->>'amount') !~ '^\d{1,10}$'
    THEN RETURN false; END IF;
    IF (c->>'amount')::bigint NOT BETWEEN 1 AND 2000000000 THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;

ALTER TABLE public.rental_bills
  ADD CONSTRAINT rental_bills_lines_valid CHECK (public.rental_valid_bill_lines(lines)),
  ADD CONSTRAINT rental_bills_number_format CHECK (number ~ '^[A-Z0-9]{1,10}-\d{4}-\d{4,6}$');
ALTER TABLE public.rental_tenancies
  ADD CONSTRAINT rental_tenancies_charges_valid CHECK (public.rental_valid_charges(charges));

-- No direct inserts: numbering and the role check live in the RPC.
REVOKE INSERT ON public.rental_bills FROM authenticated;
DROP POLICY "Managers issue bills" ON public.rental_bills;

CREATE OR REPLACE FUNCTION public.rental_issue_bill(p_tenancy_id uuid, p_kind text, p_period text, p_due_on date, p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid; v_prefix text; v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_stem text; v_seq integer; v_id uuid;
BEGIN
  SELECT t.property_id, p.invoice_prefix INTO v_property, v_prefix
  FROM public.rental_tenancies t JOIN public.rental_properties p ON p.id = t.property_id WHERE t.id = p_tenancy_id;
  -- Same answer for "no such tenant" and "not yours", so ids can't be probed.
  IF v_property IS NULL OR NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'You don’t have permission to do that' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_property::text, 0));
  v_stem := v_prefix || '-' || to_char(v_today, 'YYYY') || '-';
  SELECT coalesce(max(substr(number, char_length(v_stem) + 1)::integer), 0) + 1 INTO v_seq
  FROM public.rental_bills WHERE property_id = v_property AND number LIKE v_stem || '%'
    AND substr(number, char_length(v_stem) + 1) ~ '^\d{4,6}$';
  INSERT INTO public.rental_bills (property_id, tenancy_id, kind, period, number, issued_on, due_on, lines)
  VALUES (v_property, p_tenancy_id, p_kind, p_period, v_stem || lpad(v_seq::text, 4, '0'), v_today, p_due_on, p_lines)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rental_valid_bill_lines(jsonb), public.rental_valid_charges(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rental_valid_bill_lines(jsonb), public.rental_valid_charges(jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.rental_issue_bill(uuid, text, text, date, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rental_issue_bill(uuid, text, text, date, jsonb) TO authenticated;
