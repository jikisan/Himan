-- Owner-chosen sign mode: the landlord picks how each contract is signed (online only, or online then notarized) while
-- it is a draft. Sending requires the choice; it is frozen once sent, and the tenant signs under the stored mode.
--
-- Deploy note: rental_send_contract now refuses texts without a sign mode, so a web build that doesn't set sign_mode
-- can no longer send contracts. Texts already sent without one (legacy) keep the tenant's choice.

-- Managers set it on insert and on drafts; RLS limits UPDATE to draft/sent texts and the guard below to drafts.
GRANT INSERT (sign_mode), UPDATE (sign_mode) ON public.rental_contract_texts TO authenticated;

-- Unchanged from 20261018200000 except the sign mode rule: it changes only while the text is a draft, or when the
-- tenant signs a legacy text sent without one. Applies to everyone, SECURITY DEFINER RPCs included.
CREATE OR REPLACE FUNCTION public.rental_contract_text_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_free text[] := ARRAY['notarized_scan_path', 'lessor_signed_by', 'lessor_signed_at', 'lessor_signature',
  'status', 'updated_at'];
BEGIN
  IF OLD.tenant_signed_at IS NOT NULL AND ((to_jsonb(NEW) - v_free) IS DISTINCT FROM (to_jsonb(OLD) - v_free)
    OR (NEW.status <> OLD.status AND NOT (OLD.status = 'signed' AND NEW.status = 'countersigned'))) THEN
    RAISE EXCEPTION 'A signed contract can''t be changed';
  END IF;
  IF OLD.status <> 'draft' AND NEW.sign_mode IS DISTINCT FROM OLD.sign_mode
    AND NOT (OLD.sign_mode IS NULL AND OLD.status = 'sent' AND NEW.status = 'signed') THEN
    RAISE EXCEPTION 'The sign mode can''t be changed after the contract is sent';
  END IF;
  RETURN NEW;
END;
$$;

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

-- Unchanged from 20261018200000 except: the landlord's stored sign mode wins. A page that shows another mode than the
-- stored one (p_sign_mode not NULL and different) is stale and refused like a stale text. p_sign_mode alone decides
-- (validated as before) only for legacy texts sent without a mode (sign_mode NULL).
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
  IF p_content_hash IS DISTINCT FROM v_hash OR (p_sign_mode IS NOT NULL AND p_sign_mode <> v_mode) THEN
    RAISE EXCEPTION 'The contract changed. Reload the page to read the latest version';
  END IF;
  UPDATE public.rental_contract_texts SET status = 'signed', sign_mode = v_mode, content_hash = v_hash,
    tenant_name = btrim(p_name), tenant_signature = p_signature, tenant_signed_at = now(),
    tenant_user_agent = left(coalesce(p_user_agent, ''), 500)
  WHERE id = v_ct.id;
END;
$$;

-- CREATE OR REPLACE keeps existing grants; restated so the intent is explicit.
REVOKE ALL ON FUNCTION public.rental_send_contract(uuid), public.rental_link_sign(text, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rental_send_contract(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rental_link_sign(text, text, text, text, text, text) TO anon, authenticated;
