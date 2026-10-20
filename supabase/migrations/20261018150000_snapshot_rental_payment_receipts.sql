-- Receipts must not change after issue. rental_reallocate rebuilds allocations whenever a bill or payment
-- changes, so a receipt printed from live allocations could show different figures later under the same number.
-- Each payment now keeps what its receipt says at record time:
--   {"applied":[{"billId","number","amount"}…],"creditCentavos","balanceCentavos"}
-- applied = this payment's allocations, credit = what it left unallocated, balance = the tenancy's total still
-- owed on issued bills right after it. Payments recorded before this keep '{}' (the app falls back to live figures).
-- Clients have no UPDATE grant on rental_payments, so the snapshot is never client-writable.
ALTER TABLE public.rental_payments ADD COLUMN receipt jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Internal; not granted. rental_reallocate never touches receipt.
CREATE FUNCTION public.rental_snapshot_receipt(p_payment_id uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.rental_payments p SET receipt = jsonb_build_object(
    'applied', coalesce((SELECT jsonb_agg(jsonb_build_object('billId', x.id, 'number', x.number, 'amount', x.amount)
        ORDER BY x.due_on, x.created_at, x.id)
      FROM (SELECT b.id, b.number, b.due_on, b.created_at, sum(a.amount_centavos) AS amount
        FROM public.rental_payment_allocations a JOIN public.rental_bills b ON b.id = a.bill_id
        WHERE a.payment_id = p.id GROUP BY b.id) x), '[]'::jsonb),
    'creditCentavos', p.amount_centavos - coalesce((SELECT sum(a.amount_centavos)
      FROM public.rental_payment_allocations a WHERE a.payment_id = p.id), 0),
    'balanceCentavos', coalesce((SELECT sum(greatest(public.rental_bill_total(b.lines) - coalesce((SELECT sum(a.amount_centavos)
        FROM public.rental_payment_allocations a JOIN public.rental_payments q ON q.id = a.payment_id
        WHERE a.bill_id = b.id AND q.status = 'active'), 0), 0))
      FROM public.rental_bills b WHERE b.tenancy_id = p.tenancy_id AND b.status = 'issued'), 0))
  WHERE p.id = p_payment_id
$$;

-- Unchanged from 20261018100000 except the snapshot after rental_reallocate.
CREATE OR REPLACE FUNCTION public.rental_record_payment(p_tenancy_id uuid, p_amount integer, p_paid_on date, p_method text,
  p_reference text, p_notes text, p_bill_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid; v_id uuid; v_need bigint;
BEGIN
  SELECT property_id INTO v_property FROM public.rental_tenancies WHERE id = p_tenancy_id;
  IF v_property IS NULL OR NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'Only managers can record payments' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be more than zero'; END IF;
  IF p_paid_on > (now() AT TIME ZONE 'Asia/Manila')::date + 1 THEN RAISE EXCEPTION 'Payment date is too far ahead'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('rental_tenancy:' || p_tenancy_id::text, 0));
  IF p_bill_id IS NOT NULL THEN
    SELECT public.rental_bill_total(b.lines) - coalesce((SELECT sum(a.amount_centavos)
      FROM public.rental_payment_allocations a WHERE a.bill_id = b.id), 0) INTO v_need
    FROM public.rental_bills b WHERE b.id = p_bill_id AND b.tenancy_id = p_tenancy_id AND b.status = 'issued';
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found for this tenant'; END IF;
  END IF;
  INSERT INTO public.rental_payments (property_id, tenancy_id, amount_centavos, paid_on, method, reference, notes)
  VALUES (v_property, p_tenancy_id, p_amount, p_paid_on, p_method, btrim(coalesce(p_reference, '')), coalesce(p_notes, ''))
  RETURNING id INTO v_id;
  IF p_bill_id IS NOT NULL AND v_need > 0 THEN
    INSERT INTO public.rental_payment_allocations (payment_id, bill_id, property_id, amount_centavos, pinned)
    VALUES (v_id, p_bill_id, v_property, least(p_amount, v_need), true);
  END IF;
  PERFORM public.rental_reallocate(p_tenancy_id);
  PERFORM public.rental_snapshot_receipt(v_id);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rental_mark_earlier_paid(p_property_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_from date; v_tenancy uuid; v_id uuid; v_total bigint; v_count integer := 0;
BEGIN
  IF NOT public.rental_has_role(p_property_id, 'manager') THEN
    RAISE EXCEPTION 'Only managers can record payments' USING ERRCODE = '42501';
  END IF;
  SELECT payments_tracked_from INTO v_from FROM public.rental_properties WHERE id = p_property_id;
  IF v_from IS NULL THEN RETURN 0; END IF;
  FOR v_tenancy IN SELECT DISTINCT b.tenancy_id FROM public.rental_bills b
    WHERE b.property_id = p_property_id AND b.status = 'issued' AND b.issued_on < v_from ORDER BY b.tenancy_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('rental_tenancy:' || v_tenancy::text, 0));
    SELECT coalesce(sum(e.owed), 0) INTO v_total FROM public.rental_earlier_owed(v_tenancy, v_from) e WHERE e.owed > 0;
    CONTINUE WHEN v_total <= 0;
    INSERT INTO public.rental_payments (property_id, tenancy_id, amount_centavos, paid_on, method, notes)
    VALUES (p_property_id, v_tenancy, v_total, v_from, 'other', 'Paid before payment tracking')
    RETURNING id INTO v_id;
    -- Pinned, so the money lands on exactly these bills whatever their due dates.
    INSERT INTO public.rental_payment_allocations (payment_id, bill_id, property_id, amount_centavos, pinned)
      SELECT v_id, e.bill_id, p_property_id, e.owed, true FROM public.rental_earlier_owed(v_tenancy, v_from) e WHERE e.owed > 0;
    PERFORM public.rental_reallocate(v_tenancy);
    PERFORM public.rental_snapshot_receipt(v_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- CREATE OR REPLACE keeps the existing grants on the two RPCs; restate them so the intent is explicit.
REVOKE ALL ON FUNCTION public.rental_snapshot_receipt(uuid),
  public.rental_record_payment(uuid, integer, date, text, text, text, uuid), public.rental_mark_earlier_paid(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rental_record_payment(uuid, integer, date, text, text, text, uuid),
  public.rental_mark_earlier_paid(uuid) TO authenticated;
