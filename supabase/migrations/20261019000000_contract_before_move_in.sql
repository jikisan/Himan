-- Contract before move-in: the landlord picks how each contract is signed, and a tenant can be added as pending
-- (holds the room, no bills) until both sides have signed. Countersigning, or rental_activate_tenancy, activates the
-- tenant and issues the move-in bill then.
--
-- Deploy note: rental_start_tenancy keeps its 9 named parameters (p_pending defaults to false), so the deployed web
-- build's calls resolve unchanged. rental_send_contract now refuses texts without a sign mode, so a web build that
-- doesn't set sign_mode can no longer send contracts.

-- ── Columns ─────────────────────────────────────────────────────────────────

-- "Tenants sign the contract before moving in" for the whole property. Owner-only to change ("Owners update properties").
ALTER TABLE public.rental_properties ADD COLUMN require_contract boolean NOT NULL DEFAULT false;
-- SELECT on rental_properties is column-level since 20261018210000.
GRANT SELECT (require_contract), UPDATE (require_contract) ON public.rental_properties TO authenticated;

-- A pending tenant holds the room (move_out IS NULL, so the capacity guard counts it) but has no bills or payments.
-- Clients have no UPDATE grant on it: only rental_activate_tenancy clears it.
ALTER TABLE public.rental_tenancies ADD COLUMN pending boolean NOT NULL DEFAULT false;

-- Managers set the sign mode while the text is a draft or sent (RLS); the freeze trigger keeps it once the tenant signs.
GRANT INSERT (sign_mode), UPDATE (sign_mode) ON public.rental_contract_texts TO authenticated;

-- ── Move-in bill ────────────────────────────────────────────────────────────

-- Internal; not granted. The move-in bill from the tenancy's move-in date and active contract: rent for the days until
-- the first due date (rent ÷ 30 × days; must match proratedRent in billing.ts) + advance × rent + deposit.
-- rental_issue_bill still checks the caller is a manager.
CREATE FUNCTION public.rental_issue_move_in_bill(p_tenancy_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_move_in date; c public.rental_contracts; v_lines jsonb := '[]'; v_due date; v_days integer;
BEGIN
  SELECT t.move_in INTO v_move_in FROM public.rental_tenancies t WHERE t.id = p_tenancy_id;
  SELECT * INTO c FROM public.rental_contracts WHERE tenancy_id = p_tenancy_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'This tenant has no active contract'; END IF;
  -- First due date on or after move-in; a due day past the month's end means the last day.
  v_due := date_trunc('month', v_move_in)::date + (least(c.due_day,
    extract(day FROM date_trunc('month', v_move_in) + interval '1 month - 1 day')::integer) - 1);
  IF v_due < v_move_in THEN
    v_due := (date_trunc('month', v_move_in) + interval '1 month')::date + (least(c.due_day,
      extract(day FROM date_trunc('month', v_move_in) + interval '2 months - 1 day')::integer) - 1);
  END IF;
  v_days := v_due - v_move_in;
  IF v_days > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'rent',
      'label', 'Rent (' || v_days || CASE WHEN v_days = 1 THEN ' day)' ELSE ' days)' END,
      'amount', round(c.monthly_rent_centavos::numeric * v_days / 30)::bigint,
      'period', jsonb_build_object('from', v_move_in, 'to', v_due - 1)));
  END IF;
  IF c.advance_months > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'advance',
      'label', 'Advance (' || c.advance_months || CASE WHEN c.advance_months = 1 THEN ' month)' ELSE ' months)' END,
      'amount', c.monthly_rent_centavos::bigint * c.advance_months));
  END IF;
  IF c.deposit_centavos > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'deposit', 'label', 'Deposit', 'amount', c.deposit_centavos));
  END IF;
  IF jsonb_array_length(v_lines) > 0 THEN
    PERFORM public.rental_issue_bill(p_tenancy_id, 'move_in', to_char(v_move_in, 'YYYY-MM'), v_move_in, v_lines);
  END IF;
END;
$$;

-- ── Start / activate ────────────────────────────────────────────────────────

-- Was SECURITY INVOKER (RLS decided). Now SECURITY DEFINER so it can call the ungranted move-in bill helper, with the
-- same manager rule checked here. p_pending = true: tenancy and contract as usual, no move-in bill yet.
DROP FUNCTION public.rental_start_tenancy(uuid, uuid, date, date, date, integer, integer, integer, integer);
CREATE FUNCTION public.rental_start_tenancy(p_unit_id uuid, p_renter_id uuid, p_move_in date, p_start date,
  p_end date, p_rent integer, p_due_day integer, p_advance integer, p_deposit integer, p_pending boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid; v_tenancy uuid;
BEGIN
  SELECT property_id INTO v_property FROM public.rental_units WHERE id = p_unit_id;
  -- Same answer for "no such unit" and "not yours", so ids can't be probed.
  IF v_property IS NULL OR NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'You don’t have permission to do that' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.rental_tenancies (property_id, unit_id, renter_id, move_in, pending)
  VALUES (v_property, p_unit_id, p_renter_id, p_move_in, coalesce(p_pending, false)) RETURNING id INTO v_tenancy;
  INSERT INTO public.rental_contracts (property_id, tenancy_id, start_date, end_date, monthly_rent_centavos,
    due_day, advance_months, deposit_centavos)
  VALUES (v_property, v_tenancy, p_start, p_end, p_rent, p_due_day, p_advance, p_deposit);
  IF NOT coalesce(p_pending, false) THEN PERFORM public.rental_issue_move_in_bill(v_tenancy); END IF;
  RETURN v_tenancy;
END;
$$;

CREATE FUNCTION public.rental_activate_tenancy(p_tenancy_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE t public.rental_tenancies;
BEGIN
  PERFORM public.rental_tenancy_manager(p_tenancy_id);
  SELECT * INTO t FROM public.rental_tenancies WHERE id = p_tenancy_id FOR UPDATE;
  IF NOT t.pending THEN RAISE EXCEPTION 'This tenant is already active'; END IF;
  IF t.move_out IS NOT NULL THEN RAISE EXCEPTION 'This tenant has moved out'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rental_contract_texts ct JOIN public.rental_contracts c ON c.id = ct.contract_id
    WHERE c.tenancy_id = p_tenancy_id AND ct.status = 'countersigned') THEN
    RAISE EXCEPTION 'The contract isn''t signed by both of you yet';
  END IF;
  -- Cleared first: rental_issue_bill refuses pending tenants.
  UPDATE public.rental_tenancies SET pending = false WHERE id = p_tenancy_id;
  PERFORM public.rental_issue_move_in_bill(p_tenancy_id);
END;
$$;

-- ── Pending guards ──────────────────────────────────────────────────────────

-- Unchanged from 20261017100000 except the pending check.
CREATE OR REPLACE FUNCTION public.rental_issue_bill(p_tenancy_id uuid, p_kind text, p_period text, p_due_on date, p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid; v_prefix text; v_pending boolean; v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_stem text; v_seq integer; v_id uuid;
BEGIN
  SELECT t.property_id, p.invoice_prefix, t.pending INTO v_property, v_prefix, v_pending
  FROM public.rental_tenancies t JOIN public.rental_properties p ON p.id = t.property_id WHERE t.id = p_tenancy_id;
  -- Same answer for "no such tenant" and "not yours", so ids can't be probed.
  IF v_property IS NULL OR NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'You don’t have permission to do that' USING ERRCODE = '42501';
  END IF;
  IF v_pending THEN RAISE EXCEPTION 'This tenant hasn''t signed their contract yet'; END IF;
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

-- Unchanged from 20261018150000 except the pending check.
CREATE OR REPLACE FUNCTION public.rental_record_payment(p_tenancy_id uuid, p_amount integer, p_paid_on date, p_method text,
  p_reference text, p_notes text, p_bill_id uuid DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid; v_pending boolean; v_id uuid; v_need bigint;
BEGIN
  SELECT property_id, pending INTO v_property, v_pending FROM public.rental_tenancies WHERE id = p_tenancy_id;
  IF v_property IS NULL OR NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'Only managers can record payments' USING ERRCODE = '42501';
  END IF;
  IF v_pending THEN RAISE EXCEPTION 'This tenant hasn''t signed their contract yet'; END IF;
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

-- ── Contracts ───────────────────────────────────────────────────────────────

-- Unchanged from 20261018200000 except the sign mode check.
CREATE OR REPLACE FUNCTION public.rental_send_contract(p_contract_text_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.rental_contract_texts := public.rental_contract_text_for_manager(p_contract_text_id);
BEGIN
  IF v.status <> 'draft' THEN RAISE EXCEPTION 'Only drafts can be sent'; END IF;
  IF v.sign_mode IS NULL THEN RAISE EXCEPTION 'Choose how the contract is signed'; END IF;
  UPDATE public.rental_contract_texts SET status = 'sent' WHERE id = v.id;
END;
$$;

-- Unchanged from 20261018200000 except: activates a pending tenant in the same transaction.
CREATE OR REPLACE FUNCTION public.rental_countersign(p_contract_text_id uuid, p_signature text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.rental_contract_texts := public.rental_contract_text_for_manager(p_contract_text_id); v_sig text;
  v_tenancy uuid;
BEGIN
  IF v.status = 'countersigned' THEN RAISE EXCEPTION 'This contract is already countersigned'; END IF;
  IF v.tenant_signed_at IS NULL THEN RAISE EXCEPTION 'The tenant hasn''t signed yet'; END IF;
  v_sig := p_signature;
  IF v_sig IS NULL THEN
    IF NOT public.rental_has_role(v.property_id, 'owner') THEN RAISE EXCEPTION 'Draw your signature to countersign'; END IF;
    SELECT p.lessor_signature INTO v_sig FROM public.rental_properties p WHERE p.id = v.property_id;
  END IF;
  IF v_sig IS NULL THEN RAISE EXCEPTION 'Save your signature first'; END IF;
  IF NOT public.rental_valid_signature(v_sig) THEN RAISE EXCEPTION 'Draw your signature again'; END IF;
  UPDATE public.rental_contract_texts SET status = 'countersigned', lessor_signed_by = (SELECT auth.uid()),
    lessor_signed_at = now(), lessor_signature = v_sig
  WHERE id = v.id;
  SELECT t.id INTO v_tenancy FROM public.rental_tenancies t JOIN public.rental_contracts c ON c.tenancy_id = t.id
  WHERE c.id = v.contract_id AND t.pending AND t.move_out IS NULL;
  IF v_tenancy IS NOT NULL THEN PERFORM public.rental_activate_tenancy(v_tenancy); END IF;
END;
$$;

-- Unchanged from 20261018200000 except: the landlord's stored sign mode wins; p_sign_mode is used (and validated as
-- before) only for texts sent before the mode was chosen by the landlord (sign_mode NULL).
CREATE OR REPLACE FUNCTION public.rental_link_sign(p_token text, p_name text, p_sign_mode text, p_signature text,
  p_user_agent text, p_content_hash text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link public.rental_tenancy_links; v_ct public.rental_contract_texts; v_hash text; v_mode text;
BEGIN
  v_link := public.rental_lock_link(p_token);
  v_ct := public.rental_link_contract(v_link.tenancy_id);
  IF v_ct.id IS NULL THEN RAISE EXCEPTION 'The contract hasn''t been sent to you yet'; END IF;
  SELECT * INTO v_ct FROM public.rental_contract_texts WHERE id = v_ct.id FOR UPDATE;
  IF v_ct.status <> 'sent' THEN RAISE EXCEPTION 'You already signed this contract'; END IF;
  IF v_link.kind = 'new' AND v_link.status = 'open' THEN RAISE EXCEPTION 'Send your details first'; END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Type your full name'; END IF;
  v_mode := coalesce(v_ct.sign_mode, p_sign_mode);
  IF v_mode IS NULL OR v_mode NOT IN ('esign', 'notarize') THEN RAISE EXCEPTION 'Choose how to sign'; END IF;
  IF NOT coalesce(public.rental_valid_signature(p_signature), false) THEN RAISE EXCEPTION 'Draw your signature again'; END IF;
  v_hash := public.rental_contract_hash(v_ct.body, v_ct.special_terms);
  IF p_content_hash IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'The contract changed. Reload the page to read the latest version';
  END IF;
  UPDATE public.rental_contract_texts SET status = 'signed', sign_mode = v_mode, content_hash = v_hash,
    tenant_name = btrim(p_name), tenant_signature = p_signature, tenant_signed_at = now(),
    tenant_user_agent = left(coalesce(p_user_agent, ''), 500)
  WHERE id = v_ct.id;
END;
$$;

-- Unchanged from 20261018200000 except the top-level "pending" key (a pending tenant has no bills or payments).
CREATE OR REPLACE FUNCTION public.rental_link_get(p_token text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link public.rental_tenancy_links; v_t public.rental_tenancies; v_ct public.rental_contract_texts;
BEGIN
  v_link := public.rental_valid_link(p_token);
  IF v_link.tenancy_id IS NULL THEN RAISE EXCEPTION 'This link isn''t valid anymore'; END IF;
  SELECT * INTO v_t FROM public.rental_tenancies WHERE id = v_link.tenancy_id;
  v_ct := public.rental_link_contract(v_t.id);
  -- Whitelisted fields only: no notes, proofs, ID files, contacts, submitted details or other tenancies.
  RETURN jsonb_build_object(
    'kind', v_link.kind,
    'status', v_link.status,
    'pending', v_t.pending,
    'tenantName', (SELECT r.full_name FROM public.rental_renters r WHERE r.id = v_t.renter_id),
    'roomName', (SELECT u.name FROM public.rental_units u WHERE u.id = v_t.unit_id),
    -- lessorAddress: what the landlord's contract PDF prints (lessor address, else the property address).
    'property', (SELECT jsonb_build_object('name', p.name, 'address', p.address, 'ownerName', p.owner_name,
        'ownerAddress', p.owner_address, 'lessorName', p.lessor_name, 'lessorAddress', coalesce(nullif(p.lessor_address, ''), p.address), 'lessorCapacity', p.lessor_capacity,
        'signingCity', p.signing_city, 'invoicePrefix', p.invoice_prefix, 'lateFeeCentavos', p.late_fee_centavos)
      FROM public.rental_properties p WHERE p.id = v_t.property_id),
    'contract', CASE WHEN v_ct.id IS NOT NULL THEN jsonb_build_object(
      'id', v_ct.id, 'status', v_ct.status, 'body', v_ct.body, 'specialTerms', v_ct.special_terms,
      'signMode', v_ct.sign_mode, 'contentHash', v_ct.content_hash, 'tenantName', v_ct.tenant_name,
      'tenantSignature', v_ct.tenant_signature, 'tenantSignedAt', v_ct.tenant_signed_at,
      'lessorSigned', v_ct.status = 'countersigned',
      'lessorSignedAt', CASE WHEN v_ct.status = 'countersigned' THEN v_ct.lessor_signed_at END,
      'lessorSignature', CASE WHEN v_ct.status = 'countersigned' THEN v_ct.lessor_signature END) END,
    'bills', coalesce((SELECT jsonb_agg(jsonb_build_object('id', b.id, 'kind', b.kind, 'period', b.period,
        'number', b.number, 'issuedOn', b.issued_on, 'dueOn', b.due_on, 'lines', b.lines, 'total', x.total,
        'paid', x.paid, 'balance', greatest(x.total - x.paid, 0)) ORDER BY b.due_on, b.created_at, b.id)
      FROM public.rental_bills b
      CROSS JOIN LATERAL (SELECT public.rental_bill_total(b.lines) AS total, coalesce((SELECT sum(a.amount_centavos)
        FROM public.rental_payment_allocations a JOIN public.rental_payments q ON q.id = a.payment_id
        WHERE a.bill_id = b.id AND q.status = 'active'), 0) AS paid) x
      WHERE b.tenancy_id = v_t.id AND b.status = 'issued'), '[]'::jsonb),
    'payments', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'createdAt', p.created_at,
        'paidOn', p.paid_on, 'amount', p.amount_centavos, 'method', p.method, 'reference', p.reference,
        'billNumbers', coalesce((SELECT jsonb_agg(DISTINCT b.number) FROM public.rental_payment_allocations a
          JOIN public.rental_bills b ON b.id = a.bill_id WHERE a.payment_id = p.id), '[]'::jsonb),
        'receipt', p.receipt) ORDER BY p.paid_on, p.created_at, p.id)
      FROM public.rental_payments p WHERE p.tenancy_id = v_t.id AND p.status = 'active'), '[]'::jsonb),
    'accounts', coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'label', a.label,
        'accountName', a.account_name, 'accountNumber', a.account_number, 'qrPath', a.qr_path)
        ORDER BY a.position, a.created_at, a.id)
      FROM public.rental_payment_accounts a WHERE a.property_id = v_t.property_id), '[]'::jsonb));
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

-- CREATE OR REPLACE keeps existing grants; restated so the intent is explicit. New functions start from PUBLIC.
REVOKE ALL ON FUNCTION public.rental_issue_move_in_bill(uuid),
  public.rental_start_tenancy(uuid, uuid, date, date, date, integer, integer, integer, integer, boolean),
  public.rental_activate_tenancy(uuid), public.rental_issue_bill(uuid, text, text, date, jsonb),
  public.rental_record_payment(uuid, integer, date, text, text, text, uuid), public.rental_send_contract(uuid),
  public.rental_countersign(uuid, text), public.rental_link_sign(text, text, text, text, text, text),
  public.rental_link_get(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rental_start_tenancy(uuid, uuid, date, date, date, integer, integer, integer, integer, boolean),
  public.rental_activate_tenancy(uuid), public.rental_issue_bill(uuid, text, text, date, jsonb),
  public.rental_record_payment(uuid, integer, date, text, text, text, uuid), public.rental_send_contract(uuid),
  public.rental_countersign(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rental_link_sign(text, text, text, text, text, text), public.rental_link_get(text)
  TO anon, authenticated;
