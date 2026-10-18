-- Step C: contract templates and texts, one private link per tenancy, drawn e-signatures, invite ID uploads.
-- Anonymous access goes only through rental_link_get / rental_link_submit_details / rental_link_sign, keyed by
-- the link token; anon has no table grants. rental_link_can_upload is also executable by anon because the storage
-- INSERT policy calls it (same as portfolio_cv_is_public); it answers only true/false for one object name.

-- ── Validation helpers ──────────────────────────────────────────────────────

-- A drawn signature: a PNG data URL of at most 150 KB whose data starts with the PNG header.
CREATE FUNCTION public.rental_valid_signature(p text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT octet_length(p) <= 153600 AND p ~ '^data:image/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$'
$$;

-- Template clauses: 1..80 of {"id": text 1..80, "text": text ≤ 4000}.
CREATE FUNCTION public.rental_valid_clauses(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN jsonb_typeof(p) = 'array' THEN jsonb_array_length(p) BETWEEN 1 AND 80 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p) c
    WHERE jsonb_typeof(c->'id') IS DISTINCT FROM 'string' OR jsonb_typeof(c->'text') IS DISTINCT FROM 'string'
      OR char_length(c->>'id') NOT BETWEEN 1 AND 80 OR char_length(c->>'text') > 4000)
  ELSE false END
$$;

-- A rendered contract: 1..120 strings (clauses plus preamble and closing, placeholders resolved).
CREATE FUNCTION public.rental_valid_contract_body(p jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN jsonb_typeof(p) = 'array' THEN jsonb_array_length(p) BETWEEN 1 AND 120 AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p) e WHERE jsonb_typeof(e) <> 'string' OR char_length(e #>> '{}') > 8000)
  ELSE false END
$$;

-- Exactly what the shared domain's canonicalText + sha256Hex compute: the body joined with "\n", then
-- "\nSPECIAL:" and the special terms, UTF-8, hex SHA-256.
CREATE FUNCTION public.rental_contract_hash(p_body jsonb, p_special text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT encode(sha256(convert_to(
    coalesce((SELECT string_agg(e, E'\n' ORDER BY i) FROM jsonb_array_elements_text(p_body) WITH ORDINALITY x(e, i)), '')
      || E'\nSPECIAL:' || p_special, 'utf8')), 'hex')
$$;

-- 32 random bytes, base64url without padding (43 characters). pgcrypto lives in the extensions schema.
CREATE FUNCTION public.rental_new_token() RETURNS text
LANGUAGE sql VOLATILE SET search_path = '' AS $$
  SELECT rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=')
$$;

-- ── Tables ──────────────────────────────────────────────────────────────────

-- The owner's saved signature, used for one-tap countersigning. Only the owner reads it (rental_get_lessor_signature):
-- SELECT becomes column-level so members can't read this column. A column added to rental_properties later needs
-- its own GRANT SELECT.
ALTER TABLE public.rental_properties
  ADD COLUMN lessor_signature text CHECK (public.rental_valid_signature(lessor_signature));
GRANT UPDATE (lessor_signature) ON public.rental_properties TO authenticated;
REVOKE SELECT ON public.rental_properties FROM authenticated;
GRANT SELECT (id, created_by, name, address, owner_name, owner_address, lessor_name, lessor_civil_status, lessor_address,
  lessor_capacity, signing_city, invoice_prefix, archived_at, created_at, updated_at, late_fee_centavos, rent_due_day,
  payments_tracked_from) ON public.rental_properties TO authenticated;

-- Contract texts reference (contract, property) so a text can never sit under another property.
ALTER TABLE public.rental_contracts ADD CONSTRAINT rental_contracts_id_property_key UNIQUE (id, property_id);

-- No row = the shared domain's DEFAULT_CLAUSES.
CREATE TABLE public.rental_contract_templates (
  property_id uuid PRIMARY KEY REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  clauses jsonb NOT NULL CHECK (public.rental_valid_clauses(clauses)),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rental_contract_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  contract_id uuid NOT NULL UNIQUE,
  body jsonb NOT NULL CHECK (public.rental_valid_contract_body(body)),
  special_terms text NOT NULL DEFAULT '' CHECK (char_length(special_terms) <= 4000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'countersigned')),
  sign_mode text CHECK (sign_mode IN ('esign', 'notarize')),
  content_hash text CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  tenant_name text CHECK (char_length(tenant_name) <= 160),
  tenant_signature text CHECK (public.rental_valid_signature(tenant_signature)),
  tenant_signed_at timestamptz,
  tenant_user_agent text CHECK (char_length(tenant_user_agent) <= 500),
  lessor_signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lessor_signed_at timestamptz,
  lessor_signature text CHECK (public.rental_valid_signature(lessor_signature)),
  notarized_scan_path text CHECK (notarized_scan_path LIKE property_id::text || '/contracts/' || id::text || '/_%'),
  -- Clock time: texts created in one transaction still have an order (the link shows the newest one sent).
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (contract_id, property_id) REFERENCES public.rental_contracts(id, property_id) ON DELETE RESTRICT,
  CHECK ((status IN ('signed', 'countersigned')) = (tenant_signed_at IS NOT NULL)),
  CHECK (tenant_signed_at IS NULL OR (sign_mode IS NOT NULL AND content_hash IS NOT NULL AND tenant_name IS NOT NULL
    AND tenant_signature IS NOT NULL)),
  CHECK ((status = 'countersigned') = (lessor_signed_at IS NOT NULL AND lessor_signature IS NOT NULL))
);
CREATE INDEX rental_contract_texts_property_idx ON public.rental_contract_texts(property_id);

CREATE TABLE public.rental_tenancy_links (
  tenancy_id uuid PRIMARY KEY,
  property_id uuid NOT NULL,
  token text NOT NULL UNIQUE CHECK (token ~ '^[A-Za-z0-9_-]{43}$'),
  kind text NOT NULL CHECK (kind IN ('new', 'existing')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'submitted', 'accepted')),
  submitted_details jsonb,
  submitted_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  -- Set on reopen and regenerate: uploads from before it no longer count toward the 3 files.
  reopened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (tenancy_id, property_id) REFERENCES public.rental_tenancies(id, property_id) ON DELETE CASCADE
);
CREATE INDEX rental_tenancy_links_property_idx ON public.rental_tenancy_links(property_id);

-- ── Triggers ────────────────────────────────────────────────────────────────

-- Once the tenant signs, only the notarized scan, the lessor fields and signed → countersigned may change.
-- Applies to everyone, SECURITY DEFINER RPCs and the table owner included.
CREATE FUNCTION public.rental_contract_text_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_free text[] := ARRAY['notarized_scan_path', 'lessor_signed_by', 'lessor_signed_at', 'lessor_signature',
  'status', 'updated_at'];
BEGIN
  IF OLD.tenant_signed_at IS NOT NULL AND ((to_jsonb(NEW) - v_free) IS DISTINCT FROM (to_jsonb(OLD) - v_free)
    OR (NEW.status <> OLD.status AND NOT (OLD.status = 'signed' AND NEW.status = 'countersigned'))) THEN
    RAISE EXCEPTION 'A signed contract can''t be changed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_contract_text_guard BEFORE UPDATE ON public.rental_contract_texts
  FOR EACH ROW EXECUTE FUNCTION public.rental_contract_text_guard();

CREATE TRIGGER rental_contract_templates_updated_at BEFORE UPDATE ON public.rental_contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER rental_contract_texts_updated_at BEFORE UPDATE ON public.rental_contract_texts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rental_contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contract_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tenancy_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_contract_templates, public.rental_contract_texts, public.rental_tenancy_links
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT (property_id, clauses), UPDATE (clauses) ON public.rental_contract_templates TO authenticated;
-- Status, hash and signatures are written only by the RPCs below.
GRANT SELECT, INSERT (contract_id, property_id, body, special_terms), UPDATE (body, special_terms)
  ON public.rental_contract_texts TO authenticated;
-- Tokens are generated in Postgres: links are written only by the RPCs below.
GRANT SELECT ON public.rental_tenancy_links TO authenticated;

CREATE POLICY "Members read contract templates" ON public.rental_contract_templates FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Owners add contract templates" ON public.rental_contract_templates FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'owner'));
CREATE POLICY "Owners update contract templates" ON public.rental_contract_templates FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'owner')) WITH CHECK (public.rental_has_role(property_id, 'owner'));

CREATE POLICY "Members read contract texts" ON public.rental_contract_texts FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers create contract texts" ON public.rental_contract_texts FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers edit unsigned contract texts" ON public.rental_contract_texts FOR UPDATE TO authenticated
  USING (status IN ('draft', 'sent') AND public.rental_has_role(property_id, 'manager'))
  WITH CHECK (public.rental_has_role(property_id, 'manager'));

-- Viewers never see tokens or submitted details.
CREATE POLICY "Managers read tenancy links" ON public.rental_tenancy_links FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

-- ── Link lookup (internal) ──────────────────────────────────────────────────

-- The link for a token if it is usable: not revoked and no more than 90 days past move-out (Manila date).
-- No row (all fields NULL) otherwise; callers answer every failure with the same message.
CREATE FUNCTION public.rental_valid_link(p_token text) RETURNS public.rental_tenancy_links
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT l.* FROM public.rental_tenancy_links l JOIN public.rental_tenancies t ON t.id = l.tenancy_id
  WHERE l.token = p_token AND l.revoked_at IS NULL
    AND (t.move_out IS NULL OR t.move_out + 90 >= (now() AT TIME ZONE 'Asia/Manila')::date)
$$;

-- Same, row-locked, so a submit or sign can't run twice at once for one link.
CREATE FUNCTION public.rental_lock_link(p_token text) RETURNS public.rental_tenancy_links
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v public.rental_tenancy_links;
BEGIN
  v := public.rental_valid_link(p_token);
  IF v.tenancy_id IS NOT NULL THEN
    SELECT * INTO v FROM public.rental_tenancy_links
    WHERE tenancy_id = v.tenancy_id AND token = p_token AND revoked_at IS NULL FOR UPDATE;
  END IF;
  IF v.tenancy_id IS NULL THEN RAISE EXCEPTION 'This link isn''t valid anymore'; END IF;
  RETURN v;
END;
$$;

-- The contract the tenant sees: the newest text of this tenancy that was sent (drafts never show).
CREATE FUNCTION public.rental_link_contract(p_tenancy_id uuid) RETURNS public.rental_contract_texts
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT ct.* FROM public.rental_contract_texts ct JOIN public.rental_contracts c ON c.id = ct.contract_id
  WHERE c.tenancy_id = p_tenancy_id AND ct.status <> 'draft'
  ORDER BY ct.created_at DESC, ct.id DESC LIMIT 1
$$;

-- ── Anonymous RPCs ──────────────────────────────────────────────────────────

CREATE FUNCTION public.rental_link_get(p_token text) RETURNS jsonb
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

CREATE FUNCTION public.rental_link_submit_details(p_token text, p_details jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link public.rental_tenancy_links; v_d jsonb; v_paths text[]; v_occupants integer;
BEGIN
  v_link := public.rental_lock_link(p_token);
  IF v_link.kind <> 'new' THEN RAISE EXCEPTION 'Your details are already on file'; END IF;
  IF v_link.status <> 'open' THEN RAISE EXCEPTION 'Your details were already sent'; END IF;
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
  -- 1..3 distinct files that were really uploaded under this link's folder.
  IF jsonb_typeof(v_d->'idPaths') = 'array' THEN
    SELECT array_agg(e ORDER BY i) INTO v_paths FROM jsonb_array_elements_text(v_d->'idPaths') WITH ORDINALITY x(e, i);
  END IF;
  IF coalesce(cardinality(v_paths), 0) NOT BETWEEN 1 AND 3
    OR cardinality(v_paths) <> (SELECT count(DISTINCT e) FROM unnest(v_paths) e)
    OR EXISTS (SELECT 1 FROM unnest(v_paths) e WHERE e !~ ('^' || v_link.token || '/[A-Za-z0-9_-]+[.](pdf|jpe?g|png)$') OR NOT EXISTS (
      SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'rental-link-uploads' AND o.name = e)) THEN
    RAISE EXCEPTION 'Upload a photo of your valid ID (up to 3)';
  END IF;
  -- Kept for the landlord's review; nothing reaches the renter row until rental_accept_details.
  UPDATE public.rental_tenancy_links SET status = 'submitted', submitted_at = now(),
    submitted_details = jsonb_build_object('fullName', btrim(v_d->>'fullName'), 'phone', btrim(v_d->>'phone'),
      'address', btrim(v_d->>'address'), 'emergencyName', btrim(v_d->>'emergencyName'),
      'emergencyPhone', btrim(v_d->>'emergencyPhone'), 'facebook', btrim(coalesce(v_d->>'facebook', '')),
      'email', btrim(coalesce(v_d->>'email', '')), 'occupants', v_occupants, 'idPaths', to_jsonb(v_paths))
  WHERE tenancy_id = v_link.tenancy_id;
END;
$$;

-- p_content_hash (required): the hash of the text the tenant read. When missing or when the landlord has edited the
-- text since, signing is refused instead of binding the tenant to text they never saw.
CREATE FUNCTION public.rental_link_sign(p_token text, p_name text, p_sign_mode text, p_signature text,
  p_user_agent text, p_content_hash text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_link public.rental_tenancy_links; v_ct public.rental_contract_texts; v_hash text;
BEGIN
  v_link := public.rental_lock_link(p_token);
  v_ct := public.rental_link_contract(v_link.tenancy_id);
  IF v_ct.id IS NULL THEN RAISE EXCEPTION 'The contract hasn''t been sent to you yet'; END IF;
  SELECT * INTO v_ct FROM public.rental_contract_texts WHERE id = v_ct.id FOR UPDATE;
  IF v_ct.status <> 'sent' THEN RAISE EXCEPTION 'You already signed this contract'; END IF;
  IF v_link.kind = 'new' AND v_link.status = 'open' THEN RAISE EXCEPTION 'Send your details first'; END IF;
  IF char_length(btrim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Type your full name'; END IF;
  IF p_sign_mode IS NULL OR p_sign_mode NOT IN ('esign', 'notarize') THEN RAISE EXCEPTION 'Choose how to sign'; END IF;
  IF NOT coalesce(public.rental_valid_signature(p_signature), false) THEN RAISE EXCEPTION 'Draw your signature again'; END IF;
  v_hash := public.rental_contract_hash(v_ct.body, v_ct.special_terms);
  IF p_content_hash IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'The contract changed. Reload the page to read the latest version';
  END IF;
  UPDATE public.rental_contract_texts SET status = 'signed', sign_mode = p_sign_mode, content_hash = v_hash,
    tenant_name = btrim(p_name), tenant_signature = p_signature, tenant_signed_at = now(),
    tenant_user_agent = left(coalesce(p_user_agent, ''), 500)
  WHERE id = v_ct.id;
END;
$$;

-- Storage INSERT check for rental-link-uploads: {token}/{uuid}.{pdf|jpg|jpeg|png} under an open new-tenant link
-- with fewer than 3 files since the link was last reopened.
-- ponytail: two uploads racing at 2 files can both pass (each counts committed rows); worst case 4 files. Lock per
-- token if that ever matters.
CREATE FUNCTION public.rental_link_can_upload(p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.rental_valid_link(split_part(p_name, '/', 1)) l
    WHERE l.kind = 'new' AND l.status = 'open'
      AND p_name ~ '^[A-Za-z0-9_-]{43}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpe?g|png)$'
      AND (SELECT count(*) FROM storage.objects o
        WHERE o.bucket_id = 'rental-link-uploads' AND starts_with(o.name, l.token || '/')
          AND o.created_at > coalesce(l.reopened_at, '-infinity')) < 3)
$$;

-- ── Manager RPCs ────────────────────────────────────────────────────────────

-- Same answer for an unknown id as for someone else's, so ids can't be probed.
CREATE FUNCTION public.rental_tenancy_manager(p_tenancy_id uuid) RETURNS uuid
LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v_property uuid;
BEGIN
  SELECT property_id INTO v_property FROM public.rental_tenancies WHERE id = p_tenancy_id;
  IF v_property IS NULL OR NOT public.rental_has_role(v_property, 'manager') THEN
    RAISE EXCEPTION 'Only managers can manage contracts' USING ERRCODE = '42501';
  END IF;
  RETURN v_property;
END;
$$;

CREATE FUNCTION public.rental_contract_text_for_manager(p_id uuid) RETURNS public.rental_contract_texts
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v public.rental_contract_texts;
BEGIN
  SELECT * INTO v FROM public.rental_contract_texts WHERE id = p_id FOR UPDATE;
  IF v.id IS NULL OR NOT public.rental_has_role(v.property_id, 'manager') THEN
    RAISE EXCEPTION 'Only managers can manage contracts' USING ERRCODE = '42501';
  END IF;
  RETURN v;
END;
$$;

-- Creates the tenancy's link, or regenerates it (new token, old one stops working, un-revoked). Details already
-- accepted stay accepted when the kind is unchanged; anything else starts over at 'open'.
-- ponytail: files under a replaced token's folder are orphaned (no one can read them); sweep them if it matters.
CREATE FUNCTION public.rental_create_link(p_tenancy_id uuid, p_kind text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_property uuid := public.rental_tenancy_manager(p_tenancy_id); v_token text := public.rental_new_token();
BEGIN
  IF p_kind IS NULL OR p_kind NOT IN ('new', 'existing') THEN RAISE EXCEPTION 'Link kind must be new or existing'; END IF;
  INSERT INTO public.rental_tenancy_links AS l (tenancy_id, property_id, token, kind)
  VALUES (p_tenancy_id, v_property, v_token, p_kind)
  ON CONFLICT (tenancy_id) DO UPDATE SET token = EXCLUDED.token, kind = EXCLUDED.kind, revoked_at = NULL,
    created_at = now(), reopened_at = clock_timestamp(),
    status = CASE WHEN l.status = 'accepted' AND l.kind = EXCLUDED.kind THEN 'accepted' ELSE 'open' END,
    submitted_details = CASE WHEN l.status = 'accepted' AND l.kind = EXCLUDED.kind THEN l.submitted_details END,
    submitted_at = CASE WHEN l.status = 'accepted' AND l.kind = EXCLUDED.kind THEN l.submitted_at END,
    accepted_at = CASE WHEN l.status = 'accepted' AND l.kind = EXCLUDED.kind THEN l.accepted_at END;
  RETURN v_token;
END;
$$;

CREATE FUNCTION public.rental_revoke_link(p_tenancy_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.rental_tenancy_manager(p_tenancy_id);
  UPDATE public.rental_tenancy_links SET revoked_at = coalesce(revoked_at, now()) WHERE tenancy_id = p_tenancy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This tenant has no link'; END IF;
END;
$$;

-- "Ask again": the tenant fills the form again with 3 fresh upload slots (LinkRepository.reopen deletes the old files).
-- Clock time: an upload in the same transaction as the reopen would otherwise count.
CREATE FUNCTION public.rental_reopen_link(p_tenancy_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.rental_tenancy_manager(p_tenancy_id);
  UPDATE public.rental_tenancy_links SET status = 'open', submitted_at = NULL, submitted_details = NULL, accepted_at = NULL,
    reopened_at = clock_timestamp()
  WHERE tenancy_id = p_tenancy_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This tenant has no link'; END IF;
END;
$$;

-- Copies the submitted details into the renter row (Messenger, email and people count only when the tenant gave
-- them); the client copies the returned ID files into rental-files first (reserve-then-upload rental_renter_files rows).
CREATE FUNCTION public.rental_accept_details(p_tenancy_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_d jsonb;
BEGIN
  PERFORM public.rental_tenancy_manager(p_tenancy_id);
  SELECT submitted_details INTO v_d FROM public.rental_tenancy_links
  WHERE tenancy_id = p_tenancy_id AND status = 'submitted' FOR UPDATE;
  IF v_d IS NULL THEN RAISE EXCEPTION 'There are no details waiting to be accepted'; END IF;
  UPDATE public.rental_renters r SET full_name = v_d->>'fullName', phone = v_d->>'phone', address = v_d->>'address',
    emergency_name = v_d->>'emergencyName', emergency_phone = v_d->>'emergencyPhone',
    facebook = coalesce(nullif(v_d->>'facebook', ''), r.facebook), email = coalesce(nullif(v_d->>'email', ''), r.email),
    occupants = coalesce((v_d->>'occupants')::integer, r.occupants)
  FROM public.rental_tenancies t WHERE t.id = p_tenancy_id AND r.id = t.renter_id;
  UPDATE public.rental_tenancy_links SET status = 'accepted', accepted_at = now() WHERE tenancy_id = p_tenancy_id;
  RETURN jsonb_build_object('idPaths', v_d->'idPaths');
END;
$$;

CREATE FUNCTION public.rental_send_contract(p_contract_text_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.rental_contract_texts := public.rental_contract_text_for_manager(p_contract_text_id);
BEGIN
  IF v.status <> 'draft' THEN RAISE EXCEPTION 'Only drafts can be sent'; END IF;
  UPDATE public.rental_contract_texts SET status = 'sent' WHERE id = v.id;
END;
$$;

-- Uses the property's saved signature when p_signature is NULL, for the owner only: it is the owner's signature.
CREATE FUNCTION public.rental_countersign(p_contract_text_id uuid, p_signature text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.rental_contract_texts := public.rental_contract_text_for_manager(p_contract_text_id); v_sig text;
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
END;
$$;

-- The owner's saved signature (members can't select the column). Same answer for an unknown id.
CREATE FUNCTION public.rental_get_lessor_signature(p_property_id uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.rental_has_role(p_property_id, 'owner') THEN
    RAISE EXCEPTION 'Only the owner can see the saved signature' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT p.lessor_signature FROM public.rental_properties p WHERE p.id = p_property_id);
END;
$$;

-- The scan is uploaded to rental-files under {property}/contracts/{text id}/… first (policy below).
CREATE FUNCTION public.rental_set_notarized_scan(p_contract_text_id uuid, p_path text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v public.rental_contract_texts := public.rental_contract_text_for_manager(p_contract_text_id);
BEGIN
  IF v.tenant_signed_at IS NULL OR v.sign_mode IS DISTINCT FROM 'notarize' THEN
    RAISE EXCEPTION 'Only contracts signed for notarizing take a scan';
  END IF;
  IF p_path IS NULL OR char_length(p_path) > 500 OR NOT starts_with(p_path, v.property_id || '/contracts/' || v.id || '/')
    OR NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'rental-files' AND o.name = p_path) THEN
    RAISE EXCEPTION 'The scan must be stored under this contract';
  END IF;
  UPDATE public.rental_contract_texts SET notarized_scan_path = p_path WHERE id = v.id;
END;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.rental_valid_signature(text), public.rental_valid_clauses(jsonb),
  public.rental_valid_contract_body(jsonb), public.rental_contract_hash(jsonb, text), public.rental_new_token(),
  public.rental_contract_text_guard(), public.rental_valid_link(text), public.rental_lock_link(text),
  public.rental_link_contract(uuid), public.rental_link_get(text), public.rental_link_submit_details(text, jsonb),
  public.rental_link_sign(text, text, text, text, text, text), public.rental_link_can_upload(text),
  public.rental_tenancy_manager(uuid), public.rental_contract_text_for_manager(uuid),
  public.rental_create_link(uuid, text), public.rental_revoke_link(uuid), public.rental_reopen_link(uuid),
  public.rental_accept_details(uuid), public.rental_send_contract(uuid), public.rental_countersign(uuid, text),
  public.rental_set_notarized_scan(uuid, text), public.rental_get_lessor_signature(uuid)
  FROM PUBLIC, anon, authenticated;
-- CHECK constraints call these as the writing user.
GRANT EXECUTE ON FUNCTION public.rental_valid_signature(text), public.rental_valid_clauses(jsonb),
  public.rental_valid_contract_body(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rental_link_get(text), public.rental_link_submit_details(text, jsonb),
  public.rental_link_sign(text, text, text, text, text, text), public.rental_link_can_upload(text)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rental_create_link(uuid, text), public.rental_revoke_link(uuid),
  public.rental_reopen_link(uuid), public.rental_accept_details(uuid), public.rental_send_contract(uuid),
  public.rental_countersign(uuid, text), public.rental_set_notarized_scan(uuid, text),
  public.rental_get_lessor_signature(uuid) TO authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────

-- Invite ID photos: anyone holding an open new-tenant link may add up to 3 files to {token}/; only managers of
-- that link's property read or delete them (the links table's RLS decides). No UPDATE policy: no upsert.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rental-link-uploads', 'rental-link-uploads', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

CREATE POLICY "Open links take ID uploads" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (
  bucket_id = 'rental-link-uploads' AND public.rental_link_can_upload(name));
CREATE POLICY "Managers read link uploads" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'rental-link-uploads' AND EXISTS (SELECT 1 FROM public.rental_tenancy_links l
    WHERE l.token = (storage.foldername(storage.objects.name))[1]));
CREATE POLICY "Managers delete link uploads" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'rental-link-uploads' AND EXISTS (SELECT 1 FROM public.rental_tenancy_links l
    WHERE l.token = (storage.foldername(storage.objects.name))[1]));

-- Notarized scans in rental-files: only for a text the tenant signed for notarizing. The existing rental-files
-- read and delete policies (managers, by property folder) cover them.
CREATE POLICY "Managers upload notarized contract scans" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'rental-files' AND public.rental_has_role_text((storage.foldername(name))[1], 'manager')
  AND (storage.foldername(name))[2] = 'contracts'
  AND EXISTS (SELECT 1 FROM public.rental_contract_texts c
    WHERE c.id::text = (storage.foldername(storage.objects.name))[3]
      AND c.property_id::text = (storage.foldername(storage.objects.name))[1]
      AND c.sign_mode = 'notarize' AND c.tenant_signed_at IS NOT NULL));
