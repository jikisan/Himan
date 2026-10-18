-- Step A: payments (with proof files), their allocations to bills, and per-property payment accounts.
-- Clients never write payments or allocations: rental_record_payment / rental_void_payment do, and
-- rental_reallocate rebuilds the automatic (oldest bill first) allocations whenever a bill or payment changes.
-- Bill state (paid / partial / unpaid / overdue) is derived in the app, never stored.

-- ── Payment accounts ────────────────────────────────────────────────────────

CREATE TABLE public.rental_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('gcash', 'maya', 'bank', 'other')),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 60),
  account_name text NOT NULL DEFAULT '' CHECK (char_length(account_name) <= 120),
  account_number text NOT NULL DEFAULT '' CHECK (char_length(account_number) <= 60),
  qr_path text CHECK (qr_path IS NULL OR qr_path LIKE property_id::text || '/%'),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rental_payment_accounts_property_idx ON public.rental_payment_accounts(property_id, position);

-- ── Payments ────────────────────────────────────────────────────────────────

-- Allocations reference (bill, property) so a bill can never be paid from another property.
ALTER TABLE public.rental_bills ADD CONSTRAINT rental_bills_id_property_key UNIQUE (id, property_id);

CREATE TABLE public.rental_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenancy_id uuid NOT NULL,
  amount_centavos integer NOT NULL CHECK (amount_centavos BETWEEN 1 AND 2000000000),
  -- "Not after Manila today + 1 day" is checked in rental_record_payment (a CHECK can't use now()).
  paid_on date NOT NULL,
  method text NOT NULL CHECK (method IN ('gcash', 'maya', 'bank', 'cash', 'other')),
  reference text NOT NULL DEFAULT '' CHECK (char_length(reference) <= 80),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'void')),
  void_reason text NOT NULL DEFAULT '' CHECK (char_length(void_reason) <= 300),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id),
  FOREIGN KEY (tenancy_id, property_id) REFERENCES public.rental_tenancies(id, property_id) ON DELETE RESTRICT
);
CREATE INDEX rental_payments_tenancy_idx ON public.rental_payments(tenancy_id);
CREATE INDEX rental_payments_property_idx ON public.rental_payments(property_id);

-- Same shape and guard as rental_renter_files.
CREATE TABLE public.rental_payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  property_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size integer NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  storage_path text GENERATED ALWAYS AS
    (property_id::text || '/payments/' || payment_id::text || '/' || id::text) STORED UNIQUE,
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (payment_id, property_id) REFERENCES public.rental_payments(id, property_id) ON DELETE CASCADE
);
CREATE INDEX rental_payment_proofs_payment_idx ON public.rental_payment_proofs(payment_id, property_id);

CREATE TABLE public.rental_payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL,
  bill_id uuid NOT NULL,
  property_id uuid NOT NULL,
  amount_centavos integer NOT NULL CHECK (amount_centavos > 0),
  pinned boolean NOT NULL DEFAULT false,
  FOREIGN KEY (payment_id, property_id) REFERENCES public.rental_payments(id, property_id) ON DELETE CASCADE,
  FOREIGN KEY (bill_id, property_id) REFERENCES public.rental_bills(id, property_id) ON DELETE CASCADE
);
CREATE INDEX rental_payment_allocations_payment_idx ON public.rental_payment_allocations(payment_id);
CREATE INDEX rental_payment_allocations_bill_idx ON public.rental_payment_allocations(bill_id);

-- ── Allocation ──────────────────────────────────────────────────────────────

CREATE FUNCTION public.rental_bill_total(lines jsonb) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(sum((l->>'amount')::bigint), 0)::integer FROM jsonb_array_elements(lines) l
$$;

-- Rebuilds a tenancy's automatic allocations. Pinned (landlord-picked) allocations stay, except on void
-- payments or bills, and are clamped so a shrunk bill is never over-allocated. Whatever a payment can't
-- place stays unallocated: that is the tenant's credit, picked up by the next bill.
CREATE FUNCTION public.rental_reallocate(p_tenancy_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; v_bill uuid; v_left bigint; v_need bigint; v_amount bigint;
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
    ORDER BY a.bill_id, p.paid_on, p.created_at, p.id
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

  -- Oldest payment pays the oldest bill first.
  FOR r IN SELECT p.id, p.property_id, p.amount_centavos - coalesce((SELECT sum(a.amount_centavos)
      FROM public.rental_payment_allocations a WHERE a.payment_id = p.id), 0) AS left_over
    FROM public.rental_payments p
    WHERE p.tenancy_id = p_tenancy_id AND p.status = 'active'
    ORDER BY p.paid_on, p.created_at, p.id
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

CREATE FUNCTION public.rental_reallocate_trigger() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.rental_reallocate(NEW.tenancy_id);
  RETURN NULL;
END;
$$;
CREATE TRIGGER rental_bills_reallocate AFTER INSERT OR UPDATE OF lines, status ON public.rental_bills
  FOR EACH ROW EXECUTE FUNCTION public.rental_reallocate_trigger();
CREATE TRIGGER rental_payments_reallocate AFTER UPDATE OF status ON public.rental_payments
  FOR EACH ROW EXECUTE FUNCTION public.rental_reallocate_trigger();

-- A bill that an active payment pays can't be edited or cancelled; the lock makes the check race-free
-- against a payment being recorded for the same tenant.
CREATE FUNCTION public.rental_bill_payment_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (NEW.lines, NEW.status) IS NOT DISTINCT FROM (OLD.lines, OLD.status) THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('rental_tenancy:' || OLD.tenancy_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.rental_payment_allocations a JOIN public.rental_payments p ON p.id = a.payment_id
    WHERE a.bill_id = OLD.id AND p.status = 'active')
  THEN RAISE EXCEPTION 'This bill has payments. Void the payment first.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_bill_payment_guard BEFORE UPDATE OF lines, status ON public.rental_bills
  FOR EACH ROW EXECUTE FUNCTION public.rental_bill_payment_guard();

CREATE FUNCTION public.rental_payment_proof_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.id, NEW.payment_id, NEW.property_id, NEW.name, NEW.mime_type, NEW.size)
      IS DISTINCT FROM (OLD.id, OLD.payment_id, OLD.property_id, OLD.name, OLD.mime_type, OLD.size) THEN
      RAISE EXCEPTION 'Payment proof metadata cannot be reassigned';
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'rental-files' AND name = OLD.storage_path) THEN
    RAISE EXCEPTION 'Remove the stored payment proof before deleting its metadata';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER rental_payment_proof_guard BEFORE UPDATE OR DELETE ON public.rental_payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.rental_payment_proof_guard();

-- ── RPCs ────────────────────────────────────────────────────────────────────

CREATE FUNCTION public.rental_record_payment(p_tenancy_id uuid, p_amount integer, p_paid_on date, p_method text,
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
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.rental_void_payment(p_payment_id uuid, p_reason text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid;
BEGIN
  SELECT property_id INTO v_property FROM public.rental_payments WHERE id = p_payment_id;
  IF v_property IS NULL THEN RAISE EXCEPTION 'Payment not found or already voided'; END IF;
  IF NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'Only managers can record payments' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 300 THEN
    RAISE EXCEPTION 'Give a reason (up to 300 characters)';
  END IF;
  -- The status trigger reallocates the tenancy, so the bills this payment paid are unpaid again.
  UPDATE public.rental_payments SET status = 'void', void_reason = btrim(p_reason)
  WHERE id = p_payment_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found or already voided'; END IF;
END;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rental_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payment_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_payment_accounts, public.rental_payments, public.rental_payment_proofs,
  public.rental_payment_allocations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.rental_payment_accounts, public.rental_payment_proofs TO authenticated;
GRANT UPDATE (kind, label, account_name, account_number, qr_path, position) ON public.rental_payment_accounts TO authenticated;
GRANT UPDATE (ready) ON public.rental_payment_proofs TO authenticated;
GRANT SELECT ON public.rental_payments, public.rental_payment_allocations TO authenticated;

CREATE POLICY "Members read payment accounts" ON public.rental_payment_accounts FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Owners add payment accounts" ON public.rental_payment_accounts FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'owner'));
CREATE POLICY "Owners update payment accounts" ON public.rental_payment_accounts FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'owner')) WITH CHECK (public.rental_has_role(property_id, 'owner'));
CREATE POLICY "Owners delete payment accounts" ON public.rental_payment_accounts FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'owner'));

CREATE POLICY "Members read payments" ON public.rental_payments FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Members read payment allocations" ON public.rental_payment_allocations FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));

CREATE POLICY "Managers read payment proofs" ON public.rental_payment_proofs FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers reserve payment proofs" ON public.rental_payment_proofs FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers finish payment proof uploads" ON public.rental_payment_proofs FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers delete payment proofs" ON public.rental_payment_proofs FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

REVOKE ALL ON FUNCTION public.rental_bill_total(jsonb), public.rental_reallocate(uuid),
  public.rental_reallocate_trigger(), public.rental_bill_payment_guard(), public.rental_payment_proof_guard(),
  public.rental_record_payment(uuid, integer, date, text, text, text, uuid),
  public.rental_void_payment(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rental_bill_total(jsonb),
  public.rental_record_payment(uuid, integer, date, text, text, text, uuid),
  public.rental_void_payment(uuid, text) TO authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────

-- Proofs live in the private rental-files bucket; the existing read and delete policies (managers, by
-- property folder) already cover them. Uploads need a reserved, unfinished proof row.
CREATE POLICY "Managers upload reserved payment proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'rental-files' AND public.rental_has_role_text((storage.foldername(name))[1], 'manager')
  AND EXISTS (SELECT 1 FROM public.rental_payment_proofs f WHERE f.storage_path = storage.objects.name AND NOT f.ready));

-- QR images are public (shown on bills and the renter link); only the owner writes, by property folder.
-- The SELECT policy is for the owner's own upsert/remove; public reads go through the public URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rental-qr', 'rental-qr', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']);

CREATE POLICY "Owners read rental QR objects" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'rental-qr' AND public.rental_has_role_text((storage.foldername(name))[1], 'owner'));
CREATE POLICY "Owners upload rental QR images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'rental-qr' AND public.rental_has_role_text((storage.foldername(name))[1], 'owner'));
CREATE POLICY "Owners replace rental QR images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'rental-qr' AND public.rental_has_role_text((storage.foldername(name))[1], 'owner'))
  WITH CHECK (bucket_id = 'rental-qr' AND public.rental_has_role_text((storage.foldername(name))[1], 'owner'));
CREATE POLICY "Owners delete rental QR images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'rental-qr' AND public.rental_has_role_text((storage.foldername(name))[1], 'owner'));
