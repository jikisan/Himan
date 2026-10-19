-- Guided move-in: one-step move-in (renter + tenancy + move-in bill + payment in one transaction), contracts signed in
-- person on the owner's device, and lessee placeholders resolved only at signing.
--
-- Deploy note: safe with the current web build. Texts it creates are already resolved (replacement is a no-op, the hash
-- is unchanged), and rental_link_get only gains a top-level "lessee" key, which the current zod schema strips.

-- ── Lessee placeholders ─────────────────────────────────────────────────────

-- Must match resolveLessee in the shared domain's contracts.ts: plain replacement in every line, values trimmed, an
-- empty value rendered as a blank line.
CREATE FUNCTION public.rental_resolve_lessee(body jsonb, name text, address text) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(replace(replace(e,
      '{{lessee_name}}', coalesce(nullif(btrim(name), ''), '__________')),
      '{{lessee_address}}', coalesce(nullif(btrim(address), ''), '__________'))) ORDER BY i), '[]'::jsonb)
  FROM jsonb_array_elements_text(body) WITH ORDINALITY x(e, i)
$$;

-- What a link's signing uses for the lessee: kind new → the details the tenant sent; kind existing → the renter record.
CREATE FUNCTION public.rental_link_lessee(p_link public.rental_tenancy_links) RETURNS jsonb
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT CASE WHEN p_link.kind = 'new'
    THEN jsonb_build_object('name', coalesce(p_link.submitted_details->>'fullName', ''),
      'address', coalesce(p_link.submitted_details->>'address', ''))
    ELSE (SELECT jsonb_build_object('name', r.full_name, 'address', r.address)
      FROM public.rental_tenancies t JOIN public.rental_renters r ON r.id = t.renter_id WHERE t.id = p_link.tenancy_id) END
$$;

-- ── In-person signing fields ────────────────────────────────────────────────

-- No column grants: only rental_sign_in_person writes them. The freeze trigger (rental_contract_text_guard) already
-- covers every column outside its free list, so both are frozen once the tenant signs.
ALTER TABLE public.rental_contract_texts
  ADD COLUMN signed_in_person boolean NOT NULL DEFAULT false,
  ADD COLUMN witnessed_by uuid;

-- ── Link RPCs ───────────────────────────────────────────────────────────────

-- Unchanged from 20261018200000 except the top-level "lessee" (what signing will use, so the page renders and hashes the
-- same text). The contract body stays unresolved until signed; the page resolves it.
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
    'tenantName', (SELECT r.full_name FROM public.rental_renters r WHERE r.id = v_t.renter_id),
    'lessee', public.rental_link_lessee(v_link),
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

-- Unchanged from 20261019000000 except: the lessee placeholders are resolved before hashing, and the resolved body is
-- what gets stored and signed.
CREATE OR REPLACE FUNCTION public.rental_link_sign(p_token text, p_name text, p_sign_mode text, p_signature text,
  p_user_agent text, p_content_hash text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link public.rental_tenancy_links; v_ct public.rental_contract_texts; v_hash text; v_mode text; v_lessee jsonb;
  v_body jsonb;
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
  v_lessee := public.rental_link_lessee(v_link);
  v_body := public.rental_resolve_lessee(v_ct.body, v_lessee->>'name', v_lessee->>'address');
  v_hash := public.rental_contract_hash(v_body, v_ct.special_terms);
  IF p_content_hash IS DISTINCT FROM v_hash OR (p_sign_mode IS NOT NULL AND p_sign_mode <> v_mode) THEN
    RAISE EXCEPTION 'The contract changed. Reload the page to read the latest version';
  END IF;
  UPDATE public.rental_contract_texts SET status = 'signed', sign_mode = v_mode, body = v_body, content_hash = v_hash,
    tenant_name = btrim(p_name), tenant_signature = p_signature, tenant_signed_at = now(),
    tenant_user_agent = left(coalesce(p_user_agent, ''), 500)
  WHERE id = v_ct.id;
END;
$$;

-- ── Signing in person ───────────────────────────────────────────────────────

-- The tenant signs on the owner's device: same rules as rental_link_sign under the stored sign mode; the details
-- (validated like rental_link_submit_details, without ID files) go straight to the renter row since the owner is
-- present. The ID photo is uploaded by the client through the renter-file path.
CREATE FUNCTION public.rental_sign_in_person(p_contract_text_id uuid, p_name text, p_signature text, p_content_hash text,
  p_details jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_ct public.rental_contract_texts := public.rental_contract_text_for_manager(p_contract_text_id);
  v_d jsonb; v_occupants integer; v_body jsonb; v_hash text;
BEGIN
  IF v_ct.status <> 'sent' THEN RAISE EXCEPTION 'Only sent contracts can be signed'; END IF;
  IF v_ct.sign_mode IS NULL THEN RAISE EXCEPTION 'Choose how the contract is signed'; END IF;
  v_d := CASE WHEN jsonb_typeof(p_details) = 'object' THEN p_details ELSE '{}'::jsonb END;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['fullName', 'phone', 'address', 'emergencyName', 'emergencyPhone']) k
    WHERE btrim(coalesce(v_d->>k, '')) = '') THEN
    RAISE EXCEPTION 'Fill in your full name, mobile number, home address and emergency contact';
  END IF;
  IF char_length(btrim(v_d->>'fullName')) > 160 OR char_length(btrim(v_d->>'phone')) > 40
    OR char_length(btrim(v_d->>'address')) > 300 OR char_length(btrim(v_d->>'emergencyName')) > 160
    OR char_length(btrim(v_d->>'emergencyPhone')) > 40 OR char_length(btrim(coalesce(v_d->>'facebook', ''))) > 200
    OR char_length(btrim(coalesce(v_d->>'email', ''))) > 200 THEN
    RAISE EXCEPTION 'One of your answers is too long';
  END IF;
  IF v_d ? 'occupants' AND v_d->'occupants' <> 'null'::jsonb THEN
    IF coalesce(v_d->>'occupants', '') !~ '^[0-9]{1,2}$' OR (v_d->>'occupants')::integer NOT BETWEEN 1 AND 50 THEN
      RAISE EXCEPTION 'People living there must be between 1 and 50';
    END IF;
    v_occupants := (v_d->>'occupants')::integer;
  END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Type your full name'; END IF;
  IF NOT coalesce(public.rental_valid_signature(p_signature), false) THEN RAISE EXCEPTION 'Draw your signature again'; END IF;
  v_body := public.rental_resolve_lessee(v_ct.body, v_d->>'fullName', v_d->>'address');
  v_hash := public.rental_contract_hash(v_body, v_ct.special_terms);
  IF p_content_hash IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'The contract changed. Reload the page to read the latest version';
  END IF;
  -- Same as rental_accept_details: Messenger, email and people count only when given.
  UPDATE public.rental_renters r SET full_name = btrim(v_d->>'fullName'), phone = btrim(v_d->>'phone'),
    address = btrim(v_d->>'address'), emergency_name = btrim(v_d->>'emergencyName'),
    emergency_phone = btrim(v_d->>'emergencyPhone'),
    facebook = coalesce(nullif(btrim(coalesce(v_d->>'facebook', '')), ''), r.facebook),
    email = coalesce(nullif(btrim(coalesce(v_d->>'email', '')), ''), r.email),
    occupants = coalesce(v_occupants, r.occupants)
  FROM public.rental_contracts c JOIN public.rental_tenancies t ON t.id = c.tenancy_id
  WHERE c.id = v_ct.contract_id AND r.id = t.renter_id;
  UPDATE public.rental_contract_texts SET status = 'signed', body = v_body, content_hash = v_hash,
    tenant_name = btrim(p_name), tenant_signature = p_signature, tenant_signed_at = now(), tenant_user_agent = '',
    signed_in_person = true, witnessed_by = (SELECT auth.uid())
  WHERE id = v_ct.id;
END;
$$;

-- ── One-step move-in ────────────────────────────────────────────────────────

-- SECURITY INVOKER: the renter insert, rental_start_tenancy and rental_record_payment each apply their own RLS and
-- manager checks. Any failure (e.g. a refused payment) rolls back the renter, tenancy and bill with it.
CREATE FUNCTION public.rental_move_in(p_unit_id uuid, p_renter_id uuid, p_renter jsonb, p_move_in date, p_start date,
  p_end date, p_rent integer, p_due_day integer, p_advance integer, p_deposit integer, p_payment jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_new jsonb := nullif(p_renter, 'null'::jsonb); v_pay jsonb := nullif(p_payment, 'null'::jsonb);
  v_renter uuid := p_renter_id; v_property uuid; v_tenancy uuid; v_bill uuid; v_payment uuid;
BEGIN
  IF (p_renter_id IS NULL) = (v_new IS NULL) THEN RAISE EXCEPTION 'Choose an existing tenant or add a new one'; END IF;
  IF v_new IS NOT NULL THEN
    SELECT property_id INTO v_property FROM public.rental_units WHERE id = p_unit_id;
    IF v_property IS NULL THEN RAISE EXCEPTION 'Unit not found'; END IF;
    INSERT INTO public.rental_renters (property_id, full_name, phone, facebook, email, address, emergency_name,
      emergency_phone, occupants, notes)
    VALUES (v_property, btrim(coalesce(v_new->>'fullName', '')), btrim(coalesce(v_new->>'phone', '')),
      btrim(coalesce(v_new->>'facebook', '')), btrim(coalesce(v_new->>'email', '')), btrim(coalesce(v_new->>'address', '')),
      btrim(coalesce(v_new->>'emergencyName', '')), btrim(coalesce(v_new->>'emergencyPhone', '')),
      coalesce((v_new->>'occupants')::integer, 1), coalesce(v_new->>'notes', ''))
    RETURNING id INTO v_renter;
  END IF;
  v_tenancy := public.rental_start_tenancy(p_unit_id, v_renter, p_move_in, p_start, p_end, p_rent, p_due_day, p_advance,
    p_deposit);
  SELECT id INTO v_bill FROM public.rental_bills WHERE tenancy_id = v_tenancy AND kind = 'move_in';
  IF v_pay IS NOT NULL THEN
    v_payment := public.rental_record_payment(v_tenancy, (v_pay->>'amount')::integer, (v_pay->>'paidOn')::date,
      v_pay->>'method', v_pay->>'reference', v_pay->>'notes', v_bill);
  END IF;
  RETURN jsonb_build_object('renterId', v_renter, 'tenancyId', v_tenancy, 'billId', v_bill, 'paymentId', v_payment);
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

-- New functions get Supabase's default grants (anon included); take them back. CREATE OR REPLACE keeps the link RPCs'.
REVOKE ALL ON FUNCTION public.rental_resolve_lessee(jsonb, text, text), public.rental_link_lessee(public.rental_tenancy_links),
  public.rental_sign_in_person(uuid, text, text, text, jsonb),
  public.rental_move_in(uuid, uuid, jsonb, date, date, date, integer, integer, integer, integer, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rental_resolve_lessee(jsonb, text, text),
  public.rental_sign_in_person(uuid, text, text, text, jsonb),
  public.rental_move_in(uuid, uuid, jsonb, date, date, date, integer, integer, integer, integer, jsonb) TO authenticated;
