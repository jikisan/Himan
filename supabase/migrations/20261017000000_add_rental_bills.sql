-- Phase 2 part 1: meter readings and bills (Statement of Account).

ALTER TABLE public.rental_properties
  ADD COLUMN late_fee_centavos integer NOT NULL DEFAULT 0 CHECK (late_fee_centavos BETWEEN 0 AND 2000000000);
-- "Rent is due every [N]" for the whole property; NULL = each tenant's move-in day.
ALTER TABLE public.rental_properties
  ADD COLUMN rent_due_day integer CHECK (rent_due_day BETWEEN 1 AND 31);
GRANT UPDATE (late_fee_centavos, rent_due_day) ON public.rental_properties TO authenticated;

-- Optional extra monthly charges per tenant, e.g. [{"label":"Parking","amount":100000}].
ALTER TABLE public.rental_tenancies
  ADD COLUMN charges jsonb NOT NULL DEFAULT '[]'
  CHECK (jsonb_typeof(charges) = 'array' AND jsonb_array_length(charges) <= 20);
GRANT UPDATE (charges) ON public.rental_tenancies TO authenticated;

CREATE TABLE public.rental_meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('electric', 'water')),
  read_on date NOT NULL,
  value numeric(12, 2) NOT NULL CHECK (value >= 0),
  is_reset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, kind, read_on),
  FOREIGN KEY (unit_id, property_id) REFERENCES public.rental_units(id, property_id) ON DELETE CASCADE
);

CREATE TABLE public.rental_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenancy_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('move_in', 'monthly', 'final')),
  period text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  number text NOT NULL,
  issued_on date NOT NULL,
  due_on date NOT NULL,
  lines jsonb NOT NULL CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'void')),
  void_reason text NOT NULL DEFAULT '' CHECK (char_length(void_reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, number),
  FOREIGN KEY (tenancy_id, property_id) REFERENCES public.rental_tenancies(id, property_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX rental_bills_one_monthly ON public.rental_bills(tenancy_id, period)
  WHERE kind = 'monthly' AND status = 'issued';
CREATE UNIQUE INDEX rental_bills_one_move_in ON public.rental_bills(tenancy_id)
  WHERE kind = 'move_in' AND status = 'issued';
CREATE INDEX rental_bills_property_period_idx ON public.rental_bills(property_id, period);

-- ── Triggers ────────────────────────────────────────────────────────────────

CREATE FUNCTION public.rental_bill_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status = 'void' THEN RAISE EXCEPTION 'This bill was cancelled and can’t be changed'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_bill_guard BEFORE UPDATE ON public.rental_bills
  FOR EACH ROW EXECUTE FUNCTION public.rental_bill_guard();
CREATE TRIGGER rental_bills_updated_at BEFORE UPDATE ON public.rental_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- A reading on an issued bill is part of that bill's record.
CREATE FUNCTION public.rental_reading_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rental_bills b WHERE b.property_id = OLD.property_id AND b.status = 'issued'
    AND jsonb_path_exists(b.lines, '$[*].meter.readings[*] ? (@ == $id)', jsonb_build_object('id', OLD.id::text)))
  THEN RAISE EXCEPTION 'This reading is on an issued bill. Cancel that bill first.'; END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER rental_reading_guard BEFORE UPDATE OR DELETE ON public.rental_meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.rental_reading_guard();

-- Billed terms stay as billed: advance/deposit after a move-in bill, rent after a monthly bill.
CREATE FUNCTION public.rental_contract_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (NEW.advance_months, NEW.deposit_centavos) IS DISTINCT FROM (OLD.advance_months, OLD.deposit_centavos)
    AND EXISTS (SELECT 1 FROM public.rental_bills WHERE tenancy_id = OLD.tenancy_id AND kind = 'move_in' AND status = 'issued')
  THEN RAISE EXCEPTION 'Advance and deposit are on the move-in bill. Cancel that bill first to change them.'; END IF;
  IF NEW.monthly_rent_centavos <> OLD.monthly_rent_centavos
    AND EXISTS (SELECT 1 FROM public.rental_bills WHERE tenancy_id = OLD.tenancy_id AND kind = 'monthly' AND status = 'issued')
  THEN RAISE EXCEPTION 'This rent is already on bills. Use “New rent from” instead.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_contract_guard BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION public.rental_contract_guard();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rental_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_meter_readings, public.rental_bills FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.rental_meter_readings TO authenticated;
GRANT UPDATE (read_on, value, is_reset) ON public.rental_meter_readings TO authenticated;
GRANT SELECT, INSERT ON public.rental_bills TO authenticated;
GRANT UPDATE (lines, due_on, status, void_reason) ON public.rental_bills TO authenticated;

CREATE POLICY "Members read readings" ON public.rental_meter_readings FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers add readings" ON public.rental_meter_readings FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers fix readings" ON public.rental_meter_readings FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers delete readings" ON public.rental_meter_readings FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

CREATE POLICY "Members read bills" ON public.rental_bills FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers issue bills" ON public.rental_bills FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers change bills" ON public.rental_bills FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- SECURITY INVOKER: RLS decides who may issue. The advisory lock serializes numbering per
-- property without needing UPDATE rights on the property row.
CREATE FUNCTION public.rental_issue_bill(p_tenancy_id uuid, p_kind text, p_period text, p_due_on date, p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_property uuid; v_prefix text; v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_stem text; v_seq integer; v_id uuid;
BEGIN
  SELECT t.property_id, p.invoice_prefix INTO v_property, v_prefix
  FROM public.rental_tenancies t JOIN public.rental_properties p ON p.id = t.property_id WHERE t.id = p_tenancy_id;
  IF v_property IS NULL THEN RAISE EXCEPTION 'Tenant not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_property::text, 0));
  v_stem := v_prefix || '-' || to_char(v_today, 'YYYY') || '-';
  SELECT coalesce(max(substr(number, char_length(v_stem) + 1)::integer), 0) + 1 INTO v_seq
  FROM public.rental_bills WHERE property_id = v_property AND number LIKE v_stem || '%';
  INSERT INTO public.rental_bills (property_id, tenancy_id, kind, period, number, issued_on, due_on, lines)
  VALUES (v_property, p_tenancy_id, p_kind, p_period, v_stem || lpad(v_seq::text, 4, '0'), v_today, p_due_on, p_lines)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.rental_change_rent(p_contract_id uuid, p_from date, p_rent integer) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE c public.rental_contracts; v_id uuid;
BEGIN
  SELECT * INTO c FROM public.rental_contracts WHERE id = p_contract_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found or already ended'; END IF;
  IF p_from <= c.start_date THEN RAISE EXCEPTION 'The new rent must start after the current one'; END IF;
  UPDATE public.rental_contracts SET status = 'ended', end_date = p_from WHERE id = c.id;
  INSERT INTO public.rental_contracts (property_id, tenancy_id, start_date, end_date, monthly_rent_centavos,
    due_day, advance_months, deposit_centavos)
  VALUES (c.property_id, c.tenancy_id, p_from, greatest(c.end_date, p_from + 365), p_rent, c.due_day,
    c.advance_months, c.deposit_centavos)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Same signature as Phase 1; now also issues the move-in bill: rent for the days until the first
-- due date (rent ÷ 30 × days; must match proratedRent in billing.ts) + advance × rent + deposit.
CREATE OR REPLACE FUNCTION public.rental_start_tenancy(p_unit_id uuid, p_renter_id uuid, p_move_in date, p_start date,
  p_end date, p_rent integer, p_due_day integer, p_advance integer, p_deposit integer) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_property uuid; v_tenancy uuid; v_lines jsonb := '[]'; v_due date; v_days integer;
BEGIN
  SELECT property_id INTO v_property FROM public.rental_units WHERE id = p_unit_id;
  IF v_property IS NULL THEN RAISE EXCEPTION 'Unit not found'; END IF;
  INSERT INTO public.rental_tenancies (property_id, unit_id, renter_id, move_in)
  VALUES (v_property, p_unit_id, p_renter_id, p_move_in) RETURNING id INTO v_tenancy;
  INSERT INTO public.rental_contracts (property_id, tenancy_id, start_date, end_date, monthly_rent_centavos,
    due_day, advance_months, deposit_centavos)
  VALUES (v_property, v_tenancy, p_start, p_end, p_rent, p_due_day, p_advance, p_deposit);
  -- First due date on or after move-in; a due day past the month's end means the last day.
  v_due := date_trunc('month', p_move_in)::date + (least(p_due_day,
    extract(day FROM date_trunc('month', p_move_in) + interval '1 month - 1 day')::integer) - 1);
  IF v_due < p_move_in THEN
    v_due := (date_trunc('month', p_move_in) + interval '1 month')::date + (least(p_due_day,
      extract(day FROM date_trunc('month', p_move_in) + interval '2 months - 1 day')::integer) - 1);
  END IF;
  v_days := v_due - p_move_in;
  IF v_days > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'rent',
      'label', 'Rent (' || v_days || CASE WHEN v_days = 1 THEN ' day)' ELSE ' days)' END,
      'amount', round(p_rent::numeric * v_days / 30)::bigint,
      'period', jsonb_build_object('from', p_move_in, 'to', v_due - 1)));
  END IF;
  IF p_advance > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'advance',
      'label', 'Advance (' || p_advance || CASE WHEN p_advance = 1 THEN ' month)' ELSE ' months)' END,
      'amount', p_rent::bigint * p_advance));
  END IF;
  IF p_deposit > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'deposit', 'label', 'Deposit', 'amount', p_deposit));
  END IF;
  IF jsonb_array_length(v_lines) > 0 THEN
    PERFORM public.rental_issue_bill(v_tenancy, 'move_in', to_char(p_move_in, 'YYYY-MM'), p_move_in, v_lines);
  END IF;
  RETURN v_tenancy;
END;
$$;

REVOKE ALL ON FUNCTION public.rental_issue_bill(uuid, text, text, date, jsonb),
  public.rental_change_rent(uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rental_issue_bill(uuid, text, text, date, jsonb),
  public.rental_change_rent(uuid, date, integer) TO authenticated;
