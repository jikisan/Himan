-- Closes two ledger gaps left by 20261018300000:
-- 1. The tenant's credit is refunded (or used against deductions) by the settlement, but it stayed unallocated on the
--    payments, so a bill issued afterwards was auto-paid from money already given back. Payments recorded up to the
--    settlement now keep exactly the allocations they had and pay nothing new.
-- 2. Only the move-in bill was frozen. Every bill the settlement counted (issued up to it) is now frozen, so editing or
--    cancelling one can't reopen or free money the settlement already settled. Bills issued afterwards still work.

-- Set only by the settlement trigger below (no client UPDATE grant): the bill was counted by its tenancy's settlement.
ALTER TABLE public.rental_bills ADD COLUMN settled boolean NOT NULL DEFAULT false;

-- At settlement, mark the tenancy's bills as counted and pin every allocation so reallocation keeps it where it is.
CREATE FUNCTION public.rental_settlement_lock_ledger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.rental_bills SET settled = true WHERE tenancy_id = NEW.tenancy_id AND status = 'issued';
  UPDATE public.rental_payment_allocations a SET pinned = true
  FROM public.rental_payments p
  WHERE a.payment_id = p.id AND p.tenancy_id = NEW.tenancy_id AND NOT a.pinned;
  RETURN NULL;
END;
$$;
CREATE TRIGGER rental_settlement_lock_ledger AFTER INSERT ON public.rental_settlements
  FOR EACH ROW EXECUTE FUNCTION public.rental_settlement_lock_ledger();

-- Same for deposits settled before this migration.
UPDATE public.rental_bills b SET settled = true
FROM public.rental_settlements s WHERE s.tenancy_id = b.tenancy_id AND b.status = 'issued' AND b.created_at <= s.created_at;
UPDATE public.rental_payment_allocations a SET pinned = true
FROM public.rental_payments p, public.rental_settlements s
WHERE a.payment_id = p.id AND s.tenancy_id = p.tenancy_id AND p.created_at <= s.created_at AND NOT a.pinned;

-- Unchanged from 20261018100000 except that payments recorded up to the tenancy's settlement place no new money:
-- what they had left over was paid out by the settlement.
CREATE OR REPLACE FUNCTION public.rental_reallocate(p_tenancy_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; v_bill uuid; v_left bigint; v_need bigint; v_amount bigint;
  v_settled timestamptz := (SELECT created_at FROM public.rental_settlements WHERE tenancy_id = p_tenancy_id);
BEGIN
  -- Same key as rental_record_payment and the bill payment guard: one writer per tenancy at a time.
  PERFORM pg_advisory_xact_lock(hashtextextended('rental_tenancy:' || p_tenancy_id::text, 0));

  DELETE FROM public.rental_payment_allocations a
  USING public.rental_payments p, public.rental_bills b
  WHERE a.payment_id = p.id AND a.bill_id = b.id AND p.tenancy_id = p_tenancy_id
    AND (NOT a.pinned OR p.status = 'void' OR b.status = 'void');

  -- Clamp pinned allocations per bill, oldest payment keeps its share first.
  v_bill := NULL;
  FOR r IN SELECT a.id, a.bill_id, a.amount_centavos, greatest(public.rental_bill_total(b.lines), 0) AS total
    FROM public.rental_payment_allocations a
    JOIN public.rental_payments p ON p.id = a.payment_id JOIN public.rental_bills b ON b.id = a.bill_id
    WHERE p.tenancy_id = p_tenancy_id
    ORDER BY a.bill_id, p.created_at, p.id
  LOOP
    IF v_bill IS DISTINCT FROM r.bill_id THEN v_bill := r.bill_id; v_left := r.total; END IF;
    v_amount := least(r.amount_centavos, v_left);
    IF v_amount <= 0 THEN
      DELETE FROM public.rental_payment_allocations WHERE id = r.id;
    ELSIF v_amount < r.amount_centavos THEN
      UPDATE public.rental_payment_allocations SET amount_centavos = v_amount WHERE id = r.id;
    END IF;
    v_left := v_left - v_amount;
  END LOOP;

  -- The first payment recorded pays the oldest bill first. Recording order, not paid_on, so back-dating a
  -- payment never reshuffles what earlier payments already paid.
  FOR r IN SELECT p.id, p.property_id, p.amount_centavos - coalesce((SELECT sum(a.amount_centavos)
      FROM public.rental_payment_allocations a WHERE a.payment_id = p.id), 0) AS left_over
    FROM public.rental_payments p
    WHERE p.tenancy_id = p_tenancy_id AND p.status = 'active' AND (v_settled IS NULL OR p.created_at > v_settled)
    ORDER BY p.created_at, p.id
  LOOP
    v_left := r.left_over;
    CONTINUE WHEN v_left <= 0;
    FOR v_bill, v_need IN SELECT b.id, public.rental_bill_total(b.lines) - coalesce((SELECT sum(a.amount_centavos)
        FROM public.rental_payment_allocations a WHERE a.bill_id = b.id), 0)
      FROM public.rental_bills b
      WHERE b.tenancy_id = p_tenancy_id AND b.status = 'issued' AND public.rental_bill_total(b.lines) > 0
      ORDER BY b.due_on, b.created_at, b.id
    LOOP
      CONTINUE WHEN v_need <= 0;
      v_amount := least(v_need, v_left);
      INSERT INTO public.rental_payment_allocations (payment_id, bill_id, property_id, amount_centavos)
      VALUES (r.id, v_bill, r.property_id, v_amount);
      v_left := v_left - v_amount;
      EXIT WHEN v_left = 0;
    END LOOP;
  END LOOP;
END;
$$;

-- Replaces the move-in-only guard: every bill issued up to the settlement is frozen.
DROP TRIGGER rental_settled_move_in_guard ON public.rental_bills;
DROP FUNCTION public.rental_settled_move_in_guard();
CREATE FUNCTION public.rental_settled_bill_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (NEW.lines, NEW.due_on, NEW.status, NEW.void_reason) IS DISTINCT FROM (OLD.lines, OLD.due_on, OLD.status, OLD.void_reason)
    AND OLD.settled THEN
    RAISE EXCEPTION 'This deposit is already settled, so the bills it counted can''t change';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_settled_bill_guard BEFORE UPDATE ON public.rental_bills
  FOR EACH ROW EXECUTE FUNCTION public.rental_settled_bill_guard();

REVOKE ALL ON FUNCTION public.rental_settlement_lock_ledger(), public.rental_settled_bill_guard(),
  public.rental_reallocate(uuid) FROM PUBLIC, anon, authenticated;
