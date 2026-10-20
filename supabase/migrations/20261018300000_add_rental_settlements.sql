-- Step D: deposit settlement. After move-out the landlord settles the deposit once: the deposit (the paid move-in
-- bill's deposit line) plus the tenant's credit, less their unpaid issued bills and any deduction lines. On forfeit the
-- deposit is kept and only the credit left after deductions comes back. Unpaid bills are paid from the deposit by one
-- 'Taken from the deposit' payment; what the deposit can't cover stays owed on those bills.
-- After settling, the move-in side is frozen: its bill can't change and earlier payments can't be voided.
-- Clients never write settlements: rental_settle_deposit recomputes every figure in SQL and the row never changes
-- (no UPDATE grant; a mistake is noted by the landlord, there is no void in v1). Only proofs can be added or removed.
-- "Deposit held" is derived in the shared domain (depositHeld / depositToReturn), not in SQL: a settled tenancy holds 0.

CREATE TABLE public.rental_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenancy_id uuid NOT NULL UNIQUE,
  deposit_centavos integer NOT NULL CHECK (deposit_centavos BETWEEN 1 AND 2000000000),
  unpaid_bills_centavos integer NOT NULL CHECK (unpaid_bills_centavos >= 0),
  -- The tenant's unallocated payments at settlement (same meaning as the shared tenancyCredit).
  credit_centavos integer NOT NULL DEFAULT 0 CHECK (credit_centavos >= 0),
  -- [{ "label": text 1..80, "amount": integer 1..2e9 }], validated by rental_settle_deposit.
  lines jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) <= 30),
  forfeit boolean NOT NULL DEFAULT false,
  refund_centavos integer NOT NULL CHECK (refund_centavos >= 0),
  -- What the tenant still owes when deductions exceed the deposit.
  owed_centavos integer NOT NULL DEFAULT 0 CHECK (owed_centavos >= 0),
  -- "Not after Manila today + 1 day" is checked in rental_settle_deposit (a CHECK can't use now()).
  refunded_on date,
  refund_method text CHECK (refund_method IN ('gcash', 'maya', 'bank', 'cash', 'other')),
  refund_reference text NOT NULL DEFAULT '' CHECK (char_length(refund_reference) <= 80),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'settled' CHECK (status IN ('draft', 'settled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  settled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (id, property_id),
  FOREIGN KEY (tenancy_id, property_id) REFERENCES public.rental_tenancies(id, property_id) ON DELETE RESTRICT,
  -- deductions = unpaid + lines. Refund = deposit + credit − deductions, floored at 0; on forfeit only the credit
  -- left after the deductions exceed the deposit. Owed = deductions − deposit − credit, floored at 0.
  CHECK (refund_centavos = CASE WHEN forfeit
    THEN greatest(credit_centavos - greatest(unpaid_bills_centavos::bigint + public.rental_bill_total(lines) - deposit_centavos, 0), 0)
    ELSE greatest(deposit_centavos::bigint + credit_centavos - unpaid_bills_centavos - public.rental_bill_total(lines), 0) END),
  CHECK (owed_centavos = greatest(unpaid_bills_centavos::bigint + public.rental_bill_total(lines) - deposit_centavos - credit_centavos, 0)),
  -- A zero refund records no refund fields; a refund records its date and method.
  CHECK (CASE WHEN refund_centavos > 0 THEN refunded_on IS NOT NULL AND refund_method IS NOT NULL
    ELSE refunded_on IS NULL AND refund_method IS NULL AND refund_reference = '' END),
  CHECK (status <> 'settled' OR settled_at IS NOT NULL)
);
CREATE INDEX rental_settlements_property_idx ON public.rental_settlements(property_id);

-- Same shape and guard as rental_payment_proofs.
CREATE TABLE public.rental_settlement_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL,
  property_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size integer NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  storage_path text GENERATED ALWAYS AS
    (property_id::text || '/settlements/' || settlement_id::text || '/' || id::text) STORED UNIQUE,
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (settlement_id, property_id) REFERENCES public.rental_settlements(id, property_id) ON DELETE CASCADE
);
CREATE INDEX rental_settlement_proofs_settlement_idx ON public.rental_settlement_proofs(settlement_id, property_id);

CREATE FUNCTION public.rental_settlement_proof_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.id, NEW.settlement_id, NEW.property_id, NEW.name, NEW.mime_type, NEW.size)
      IS DISTINCT FROM (OLD.id, OLD.settlement_id, OLD.property_id, OLD.name, OLD.mime_type, OLD.size) THEN
      RAISE EXCEPTION 'Settlement proof metadata cannot be reassigned';
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'rental-files' AND name = OLD.storage_path) THEN
    RAISE EXCEPTION 'Remove the stored settlement proof before deleting its metadata';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER rental_settlement_proof_guard BEFORE UPDATE OR DELETE ON public.rental_settlement_proofs
  FOR EACH ROW EXECUTE FUNCTION public.rental_settlement_proof_guard();

-- ── RPC ─────────────────────────────────────────────────────────────────────

CREATE FUNCTION public.rental_settle_deposit(p_tenancy_id uuid, p_lines jsonb, p_forfeit boolean, p_refunded_on date,
  p_refund_method text, p_refund_reference text, p_notes text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_t public.rental_tenancies; v_bill uuid; v_deposit bigint; v_owing bigint; v_unpaid bigint;
  v_lines jsonb := '[]'::jsonb; v_deductions bigint := 0; v_refund bigint; v_l jsonb; v_id uuid; v_credit bigint;
  v_pay uuid; v_left bigint; v_b record;
  v_today date := (now() AT TIME ZONE 'Asia/Manila')::date; v_forfeit boolean := coalesce(p_forfeit, false);
BEGIN
  -- Same answer for an unknown tenancy as for someone else's, so ids can't be probed.
  SELECT * INTO v_t FROM public.rental_tenancies WHERE id = p_tenancy_id;
  IF v_t.id IS NULL OR NOT public.rental_has_role(v_t.property_id, 'manager') THEN
    RAISE EXCEPTION 'Only managers can settle deposits' USING ERRCODE = '42501';
  END IF;
  -- Same key as rental_record_payment and rental_reallocate: bills and payments hold still while we read them.
  PERFORM pg_advisory_xact_lock(hashtextextended('rental_tenancy:' || p_tenancy_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.rental_settlements WHERE tenancy_id = p_tenancy_id) THEN
    RAISE EXCEPTION 'This deposit is already settled';
  END IF;

  -- The issued move-in bill must be fully paid by active payments, with a deposit on it.
  SELECT b.id, (SELECT coalesce(sum((l->>'amount')::bigint), 0) FROM jsonb_array_elements(b.lines) l WHERE l->>'kind' = 'deposit'),
    public.rental_bill_total(b.lines) - coalesce((SELECT sum(a.amount_centavos) FROM public.rental_payment_allocations a
      JOIN public.rental_payments p ON p.id = a.payment_id WHERE a.bill_id = b.id AND p.status = 'active'), 0)
  INTO v_bill, v_deposit, v_owing
  FROM public.rental_bills b WHERE b.tenancy_id = p_tenancy_id AND b.kind = 'move_in' AND b.status = 'issued';
  IF v_t.move_out IS NULL OR v_bill IS NULL OR v_owing > 0 OR v_deposit <= 0 THEN
    RAISE EXCEPTION 'No deposit to settle';
  END IF;

  -- Everything else still owed on issued bills.
  SELECT coalesce(sum(greatest(public.rental_bill_total(b.lines) - coalesce((SELECT sum(a.amount_centavos)
      FROM public.rental_payment_allocations a JOIN public.rental_payments p ON p.id = a.payment_id
      WHERE a.bill_id = b.id AND p.status = 'active'), 0), 0)), 0)
  INTO v_unpaid
  FROM public.rental_bills b WHERE b.tenancy_id = p_tenancy_id AND b.status = 'issued' AND b.id <> v_bill;

  -- Unallocated money on active payments, before the deposit pays anything.
  SELECT coalesce(sum(p.amount_centavos - coalesce((SELECT sum(a.amount_centavos) FROM public.rental_payment_allocations a
    WHERE a.payment_id = p.id), 0)), 0)
  INTO v_credit FROM public.rental_payments p WHERE p.tenancy_id = p_tenancy_id AND p.status = 'active';

  -- Deduction lines: only label and amount are kept.
  IF p_lines IS NOT NULL AND (jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) > 30) THEN
    RAISE EXCEPTION 'Add a label and an amount for each deduction';
  END IF;
  FOR v_l IN SELECT value FROM jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) LOOP
    IF jsonb_typeof(v_l) <> 'object'
      OR jsonb_typeof(v_l->'label') IS DISTINCT FROM 'string' OR char_length(btrim(v_l->>'label')) NOT BETWEEN 1 AND 80
      OR v_l->>'label' !~ '[[:alnum:][:punct:]]'
      OR jsonb_typeof(v_l->'amount') IS DISTINCT FROM 'number' OR (v_l->>'amount') !~ '^\d{1,10}$'
      OR (v_l->>'amount')::bigint NOT BETWEEN 1 AND 2000000000
    THEN RAISE EXCEPTION 'Add a label and an amount for each deduction'; END IF;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('label', btrim(v_l->>'label'), 'amount', (v_l->>'amount')::bigint));
    v_deductions := v_deductions + (v_l->>'amount')::bigint;
  END LOOP;
  -- Keeps the stored figures within integer range.
  IF v_deductions > 2000000000 THEN RAISE EXCEPTION 'Add a label and an amount for each deduction'; END IF;

  v_deductions := v_deductions + v_unpaid;
  v_refund := CASE WHEN v_forfeit THEN greatest(v_credit - greatest(v_deductions - v_deposit, 0), 0)
    ELSE greatest(v_deposit + v_credit - v_deductions, 0) END;
  IF v_refund > 0 THEN
    IF coalesce(p_refunded_on, v_today) > v_today + 1 THEN RAISE EXCEPTION 'Settlement date is too far ahead'; END IF;
    IF p_refund_method IS NULL OR p_refund_method NOT IN ('gcash', 'maya', 'bank', 'cash', 'other') THEN
      RAISE EXCEPTION 'Pick how the refund was paid';
    END IF;
  END IF;

  -- The deposit pays the unpaid bills, oldest first, pinned so reallocation keeps it there. Whatever it can't cover
  -- stays open on those bills.
  IF v_unpaid > 0 THEN
    v_left := least(v_unpaid, v_deposit);
    INSERT INTO public.rental_payments (property_id, tenancy_id, amount_centavos, paid_on, method, notes)
    VALUES (v_t.property_id, p_tenancy_id, v_left, v_today, 'other', 'Taken from the deposit') RETURNING id INTO v_pay;
    FOR v_b IN SELECT b.id, public.rental_bill_total(b.lines) - coalesce((SELECT sum(a.amount_centavos)
        FROM public.rental_payment_allocations a JOIN public.rental_payments p ON p.id = a.payment_id
        WHERE a.bill_id = b.id AND p.status = 'active'), 0) AS need
      FROM public.rental_bills b WHERE b.tenancy_id = p_tenancy_id AND b.status = 'issued' AND b.id <> v_bill
      ORDER BY b.due_on, b.created_at, b.id
    LOOP
      EXIT WHEN v_left <= 0;
      CONTINUE WHEN v_b.need <= 0;
      INSERT INTO public.rental_payment_allocations (payment_id, bill_id, property_id, amount_centavos, pinned)
      VALUES (v_pay, v_b.id, v_t.property_id, least(v_b.need, v_left), true);
      v_left := v_left - least(v_b.need, v_left);
    END LOOP;
    PERFORM public.rental_reallocate(p_tenancy_id);
    PERFORM public.rental_snapshot_receipt(v_pay);
  END IF;

  -- created_at is clock time, after the deposit payment: payments recorded up to here are frozen.
  INSERT INTO public.rental_settlements (property_id, tenancy_id, deposit_centavos, unpaid_bills_centavos, credit_centavos,
    lines, forfeit, refund_centavos, owed_centavos, refunded_on, refund_method, refund_reference, notes, status, created_at,
    settled_at, settled_by)
  VALUES (v_t.property_id, p_tenancy_id, v_deposit, v_unpaid, v_credit, v_lines, v_forfeit, v_refund,
    greatest(v_deductions - v_deposit - v_credit, 0),
    CASE WHEN v_refund > 0 THEN coalesce(p_refunded_on, v_today) END,
    CASE WHEN v_refund > 0 THEN p_refund_method END,
    CASE WHEN v_refund > 0 THEN btrim(coalesce(p_refund_reference, '')) ELSE '' END,
    coalesce(p_notes, ''), 'settled', clock_timestamp(), now(), auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── Freeze the move-in side ─────────────────────────────────────────────────

-- Unchanged from 20261018100000 except the settled check: payments recorded before the settlement paid what it
-- settled, so voiding one would reopen bills the settlement already counted.
CREATE OR REPLACE FUNCTION public.rental_void_payment(p_payment_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid; v_tenancy uuid; v_created timestamptz;
BEGIN
  -- Same answer for an unknown id as for someone else's payment, so ids can't be probed.
  SELECT property_id, tenancy_id, created_at INTO v_property, v_tenancy, v_created FROM public.rental_payments WHERE id = p_payment_id;
  IF v_property IS NULL OR NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'Only managers can record payments' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Give a reason (up to 300 characters)';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('rental_tenancy:' || v_tenancy::text, 0));
  IF EXISTS (SELECT 1 FROM public.rental_settlements s WHERE s.tenancy_id = v_tenancy AND v_created <= s.created_at) THEN
    RAISE EXCEPTION 'This deposit is already settled, so its payments can''t be voided';
  END IF;
  -- The status trigger reallocates the tenancy, so the bills this payment paid are unpaid again.
  UPDATE public.rental_payments SET status = 'void', void_reason = btrim(p_reason)
  WHERE id = p_payment_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found or already voided'; END IF;
END;
$$;

-- The settled deposit came from the move-in bill, so that bill can't be edited or cancelled afterwards.
CREATE FUNCTION public.rental_settled_move_in_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (NEW.lines, NEW.due_on, NEW.status, NEW.void_reason) IS DISTINCT FROM (OLD.lines, OLD.due_on, OLD.status, OLD.void_reason)
    AND EXISTS (SELECT 1 FROM public.rental_settlements WHERE tenancy_id = OLD.tenancy_id) THEN
    RAISE EXCEPTION 'This deposit is already settled, so the move-in bill can''t change';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_settled_move_in_guard BEFORE UPDATE ON public.rental_bills
  FOR EACH ROW WHEN (OLD.kind = 'move_in') EXECUTE FUNCTION public.rental_settled_move_in_guard();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rental_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_settlement_proofs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_settlements, public.rental_settlement_proofs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rental_settlements TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.rental_settlement_proofs TO authenticated;
GRANT UPDATE (ready) ON public.rental_settlement_proofs TO authenticated;

CREATE POLICY "Members read settlements" ON public.rental_settlements FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));

CREATE POLICY "Managers read settlement proofs" ON public.rental_settlement_proofs FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers reserve settlement proofs" ON public.rental_settlement_proofs FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers finish settlement proof uploads" ON public.rental_settlement_proofs FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers delete settlement proofs" ON public.rental_settlement_proofs FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

REVOKE ALL ON FUNCTION public.rental_settlement_proof_guard(), public.rental_settled_move_in_guard(),
  public.rental_settle_deposit(uuid, jsonb, boolean, date, text, text, text), public.rental_void_payment(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rental_settle_deposit(uuid, jsonb, boolean, date, text, text, text),
  public.rental_void_payment(uuid, text) TO authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────

-- Same as payment proofs: the existing rental-files read and delete policies (managers, by property folder) cover
-- these; uploads need a reserved, unfinished proof row.
CREATE POLICY "Managers upload reserved settlement proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'rental-files' AND public.rental_has_role_text((storage.foldername(name))[1], 'manager')
  AND EXISTS (SELECT 1 FROM public.rental_settlement_proofs f WHERE f.storage_path = storage.objects.name AND NOT f.ready));
