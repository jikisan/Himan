-- Run after the rentals migration. Fixtures and assertions are rolled back.
BEGIN;
SET LOCAL storage.allow_delete_query = 'true';
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000aa001', 'rent-owner@example.com'),
  ('00000000-0000-0000-0000-0000000aa002', 'rent-friend@example.com'),
  ('00000000-0000-0000-0000-0000000aa003', 'rent-stranger@example.com');
INSERT INTO public.profiles (user_id, full_name, location)
VALUES ('00000000-0000-0000-0000-0000000aa001', 'Owner Person', 'Cebu City');
INSERT INTO public.friendships (requester_id, addressee_id, status)
VALUES ('00000000-0000-0000-0000-0000000aa001', '00000000-0000-0000-0000-0000000aa002', 'accepted');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);

-- Review Focus 1: INSERT ... RETURNING must pass the SELECT policy before the owner trigger runs.
DO $$ DECLARE v_id uuid; BEGIN
  INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab001', 'House')
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Creator could not read back the property'; END IF;
  IF NOT public.rental_has_role(v_id, 'owner') THEN RAISE EXCEPTION 'Creator is not owner'; END IF;
  IF (SELECT lessor_name FROM public.rental_properties WHERE id = v_id) <> 'Owner Person'
  THEN RAISE EXCEPTION 'Lessor name did not default from profile'; END IF;
END $$;

INSERT INTO public.rental_units (id, property_id, name, kind, capacity) VALUES
  ('00000000-0000-0000-0000-0000000ac001', '00000000-0000-0000-0000-0000000ab001', 'Room A', 'bedspace', 2),
  ('00000000-0000-0000-0000-0000000ac002', '00000000-0000-0000-0000-0000000ab001', 'Room B', 'room', 1);
INSERT INTO public.rental_renters (id, property_id, full_name) VALUES
  ('00000000-0000-0000-0000-0000000ad001', '00000000-0000-0000-0000-0000000ab001', 'Renter One'),
  ('00000000-0000-0000-0000-0000000ad002', '00000000-0000-0000-0000-0000000ab001', 'Renter Two'),
  ('00000000-0000-0000-0000-0000000ad003', '00000000-0000-0000-0000-0000000ab001', 'Renter Three');
INSERT INTO public.rental_renter_files (id, renter_id, property_id, name, mime_type, size) VALUES
  ('00000000-0000-0000-0000-0000000ae001', '00000000-0000-0000-0000-0000000ad001',
   '00000000-0000-0000-0000-0000000ab001', 'id.png', 'image/png', 100);

DO $$ BEGIN
  -- Non-bedspace units hold exactly one tenancy.
  BEGIN
    INSERT INTO public.rental_units (property_id, name, kind, capacity)
    VALUES ('00000000-0000-0000-0000-0000000ab001', 'Bad', 'room', 2);
    RAISE EXCEPTION 'Room with capacity 2 was allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- Review Focus 2: capacity.
  PERFORM public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac001', '00000000-0000-0000-0000-0000000ad001',
    '2026-10-01', '2026-10-01', '2027-10-01', 300000, 30, 1, 300000);
  PERFORM public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac001', '00000000-0000-0000-0000-0000000ad002',
    '2026-10-01', '2026-10-01', '2027-10-01', 300000, 30, 1, 300000);
  BEGIN
    PERFORM public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac001', '00000000-0000-0000-0000-0000000ad003',
      '2026-10-01', '2026-10-01', '2027-10-01', 300000, 30, 1, 300000);
    RAISE EXCEPTION 'Overfilled unit';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'This unit is full' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.rental_units SET capacity = 1 WHERE id = '00000000-0000-0000-0000-0000000ac001';
    RAISE EXCEPTION 'Shrunk capacity below occupants';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Capacity is below current occupants' THEN RAISE; END IF;
  END;
  IF (SELECT count(*) FROM public.rental_contracts WHERE status = 'active') <> 2
  THEN RAISE EXCEPTION 'Contracts were not created with tenancies'; END IF;

  -- Ending frees a slot; ending twice fails; unit cannot be swapped.
  PERFORM public.rental_end_tenancy((SELECT id FROM public.rental_tenancies
    WHERE renter_id = '00000000-0000-0000-0000-0000000ad002'), '2026-11-01');
  PERFORM public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac001', '00000000-0000-0000-0000-0000000ad003',
    '2026-11-01', '2026-11-01', '2027-11-01', 300000, 30, 1, 300000);
  BEGIN
    PERFORM public.rental_end_tenancy((SELECT id FROM public.rental_tenancies
      WHERE renter_id = '00000000-0000-0000-0000-0000000ad002'), '2026-11-02');
    RAISE EXCEPTION 'Ended a tenancy twice';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Tenancy not found or already ended' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.rental_tenancies SET unit_id = '00000000-0000-0000-0000-0000000ac002'
    WHERE renter_id = '00000000-0000-0000-0000-0000000ad001';
    RAISE EXCEPTION 'Tenancy unit was changed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Review Focus 3: sharing.
  BEGIN
    PERFORM public.rental_add_member('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000aa003', 'viewer');
    RAISE EXCEPTION 'Shared with a stranger';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'You can only share with friends' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.rental_add_member('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000aa002', 'owner');
    RAISE EXCEPTION 'Granted owner';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Role must be manager or viewer' THEN RAISE; END IF;
  END;
  PERFORM public.rental_add_member('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000aa002', 'viewer');
  IF (SELECT count(*) FROM public.rental_list_members('00000000-0000-0000-0000-0000000ab001')) <> 2
  THEN RAISE EXCEPTION 'Member list wrong'; END IF;
  DELETE FROM public.rental_property_members WHERE role = 'owner';
  IF NOT FOUND THEN NULL; ELSE RAISE EXCEPTION 'Owner membership was deleted'; END IF;
END $$;

-- Security: member rows can only change role, never property or user.
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab002', 'Second');
DO $$ BEGIN
  BEGIN
    UPDATE public.rental_property_members SET user_id = '00000000-0000-0000-0000-0000000aa003'
    WHERE user_id = '00000000-0000-0000-0000-0000000aa002';
    RAISE EXCEPTION 'Owner reassigned a member to a non-friend';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.rental_property_members SET property_id = '00000000-0000-0000-0000-0000000ab002'
    WHERE user_id = '00000000-0000-0000-0000-0000000aa002';
    RAISE EXCEPTION 'Owner moved a member to another property';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.rental_property_members SET role = 'viewer' WHERE user_id = '00000000-0000-0000-0000-0000000aa002';
END $$;

-- As the friend (viewer).
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa002', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rental_list_members('00000000-0000-0000-0000-0000000ab001')) <> 0
  THEN RAISE EXCEPTION 'Viewer can list member emails'; END IF;
  IF (SELECT count(*) FROM public.rental_properties) <> 1 THEN RAISE EXCEPTION 'Viewer cannot see shared property'; END IF;
  IF (SELECT count(*) FROM public.rental_renters) <> 3 THEN RAISE EXCEPTION 'Viewer cannot see renters'; END IF;
  -- Review Focus 5: no ID files for viewers.
  IF (SELECT count(*) FROM public.rental_renter_files) <> 0 THEN RAISE EXCEPTION 'Viewer can see renter ID files'; END IF;
  BEGIN
    INSERT INTO public.rental_renters (property_id, full_name) VALUES ('00000000-0000-0000-0000-0000000ab001', 'X');
    RAISE EXCEPTION 'Viewer inserted a renter';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.rental_add_member('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000aa002', 'manager');
    RAISE EXCEPTION 'Viewer escalated themselves';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Only the owner can share this property' THEN RAISE; END IF;
  END;
END $$;

-- As a stranger.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa003', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.rental_properties) <> 0 THEN RAISE EXCEPTION 'Stranger sees property'; END IF;
  IF (SELECT count(*) FROM public.rental_list_members('00000000-0000-0000-0000-0000000ab001')) <> 0
  THEN RAISE EXCEPTION 'Stranger sees members'; END IF;
END $$;

-- Back to owner: history blocks property deletion.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
DO $$ BEGIN
  BEGIN
    DELETE FROM public.rental_properties WHERE id = '00000000-0000-0000-0000-0000000ab001';
    RAISE EXCEPTION 'Deleted a property with tenancy history';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
END $$;

-- Deleting a property whose renter has a stored ID must not orphan the object.
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab003', 'Third');
INSERT INTO public.rental_renters (id, property_id, full_name)
VALUES ('00000000-0000-0000-0000-0000000ad009', '00000000-0000-0000-0000-0000000ab003', 'Filed');
INSERT INTO public.rental_renter_files (id, renter_id, property_id, name, mime_type, size) VALUES
  ('00000000-0000-0000-0000-0000000ae009', '00000000-0000-0000-0000-0000000ad009', '00000000-0000-0000-0000-0000000ab003', 'id.png', 'image/png', 10);
RESET ROLE;
INSERT INTO storage.objects (bucket_id, name)
SELECT 'rental-files', storage_path FROM public.rental_renter_files WHERE id = '00000000-0000-0000-0000-0000000ae009';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
DO $$ BEGIN
  BEGIN
    DELETE FROM public.rental_properties WHERE id = '00000000-0000-0000-0000-0000000ab003';
    RAISE EXCEPTION 'Property delete orphaned a stored renter file';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Remove the stored renter file before deleting its metadata' THEN RAISE; END IF;
  END;
END $$;

-- Usual rent: owners can set it, negatives are refused.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
UPDATE public.rental_units SET default_rent_centavos = 800000 WHERE id = '00000000-0000-0000-0000-0000000ac002';
DO $$ BEGIN
  IF (SELECT default_rent_centavos FROM public.rental_units WHERE id = '00000000-0000-0000-0000-0000000ac002') <> 800000 THEN
    RAISE EXCEPTION 'Owner could not set usual rent';
  END IF;
  BEGIN
    UPDATE public.rental_units SET default_rent_centavos = -1 WHERE id = '00000000-0000-0000-0000-0000000ac002';
    RAISE EXCEPTION 'Negative usual rent was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.rental_units SET extra_person_rent_centavos = 50000 WHERE id = '00000000-0000-0000-0000-0000000ac002';
  IF (SELECT extra_person_rent_centavos FROM public.rental_units WHERE id = '00000000-0000-0000-0000-0000000ac002') <> 50000 THEN
    RAISE EXCEPTION 'Owner could not set extra-person rent';
  END IF;
  BEGIN
    UPDATE public.rental_units SET extra_person_rent_centavos = -1 WHERE id = '00000000-0000-0000-0000-0000000ac002';
    RAISE EXCEPTION 'Negative extra-person rent was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- ── Phase 2 part 1: bills ──────────────────────────────────────────────────
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab009', 'Bills House');
INSERT INTO public.rental_units (id, property_id, name, kind, capacity, electric_mode, electric_amount_centavos) VALUES
  ('00000000-0000-0000-0000-0000000ac091', '00000000-0000-0000-0000-0000000ab009', 'Room 1', 'room', 1, 'submeter', 1600),
  ('00000000-0000-0000-0000-0000000ac092', '00000000-0000-0000-0000-0000000ab009', 'Room A', 'bedspace', 3, 'none', 0),
  ('00000000-0000-0000-0000-0000000ac093', '00000000-0000-0000-0000-0000000ab009', 'Room C', 'room', 1, 'none', 0);
INSERT INTO public.rental_renters (id, property_id, full_name) VALUES
  ('00000000-0000-0000-0000-0000000ad091', '00000000-0000-0000-0000-0000000ab009', 'Bill One'),
  ('00000000-0000-0000-0000-0000000ad092', '00000000-0000-0000-0000-0000000ab009', 'Bill Two'),
  ('00000000-0000-0000-0000-0000000ad093', '00000000-0000-0000-0000-0000000ab009', 'Bill Three');

DO $$ DECLARE v_t uuid; v_c uuid; v_year text := to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY');
  v_bill public.rental_bills; v_r uuid; v_id uuid;
BEGIN
  -- 1. Move-in on the due date: advance + deposit only.
  v_t := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac091', '00000000-0000-0000-0000-0000000ad091',
    '2026-10-05', '2026-10-05', '2027-10-05', 500000, 5, 1, 500000);
  SELECT * INTO v_bill FROM public.rental_bills WHERE tenancy_id = v_t;
  IF v_bill.number <> 'INV-' || v_year || '-0001' OR v_bill.kind <> 'move_in' OR v_bill.due_on <> '2026-10-05'
    OR jsonb_array_length(v_bill.lines) <> 2
    OR (SELECT sum((l->>'amount')::bigint) FROM jsonb_array_elements(v_bill.lines) l) <> 1000000
  THEN RAISE EXCEPTION 'Move-in bill on the due date is wrong: %', row_to_json(v_bill); END IF;

  -- 1b. Move-in between due dates: prorated days first.
  v_id := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac092', '00000000-0000-0000-0000-0000000ad092',
    '2026-10-15', '2026-10-15', '2027-10-15', 350000, 5, 1, 350000);
  SELECT * INTO v_bill FROM public.rental_bills WHERE tenancy_id = v_id;
  IF v_bill.lines->0->>'label' <> 'Rent (21 days)' OR (v_bill.lines->0->>'amount')::bigint <> 245000
    OR v_bill.lines->0->'period'->>'from' <> '2026-10-15' OR v_bill.lines->0->'period'->>'to' <> '2026-11-04'
    OR jsonb_array_length(v_bill.lines) <> 3 OR v_bill.number <> 'INV-' || v_year || '-0002'
  THEN RAISE EXCEPTION 'Prorated move-in bill is wrong: %', v_bill.lines; END IF;
  v_id := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac093', '00000000-0000-0000-0000-0000000ad093',
    '2027-02-10', '2027-02-10', '2028-02-10', 300000, 31, 0, 0);
  SELECT * INTO v_bill FROM public.rental_bills WHERE tenancy_id = v_id;
  IF v_bill.lines->0->>'label' <> 'Rent (18 days)' OR (v_bill.lines->0->>'amount')::bigint <> 180000
    OR v_bill.lines->0->'period'->>'to' <> '2027-02-27'
  THEN RAISE EXCEPTION 'Due day 31 in February prorates wrong: %', v_bill.lines; END IF;

  -- 2. Monthly bill numbering and one bill per tenant per month.
  v_id := public.rental_issue_bill(v_t, 'monthly', '2026-11', '2026-11-05', '[{"kind":"rent","label":"Rent","amount":500000}]');
  IF (SELECT number FROM public.rental_bills WHERE id = v_id) <> 'INV-' || v_year || '-0004'
  THEN RAISE EXCEPTION 'Monthly bill number is wrong'; END IF;
  BEGIN
    PERFORM public.rental_issue_bill(v_t, 'monthly', '2026-11', '2026-11-05', '[{"kind":"rent","label":"Rent","amount":500000}]');
    RAISE EXCEPTION 'A second November bill was accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- 3. Cancelling frees the month; a cancelled bill can't change.
  UPDATE public.rental_bills SET status = 'void', void_reason = 'typo' WHERE id = v_id;
  PERFORM public.rental_issue_bill(v_t, 'monthly', '2026-11', '2026-11-05', '[{"kind":"rent","label":"Rent","amount":500000}]');
  BEGIN
    UPDATE public.rental_bills SET status = 'issued' WHERE id = v_id;
    RAISE EXCEPTION 'A cancelled bill was changed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%cancelled%' THEN RAISE; END IF;
  END;

  -- 4. Billed terms are locked; rent changes become a renewal.
  SELECT id INTO v_c FROM public.rental_contracts WHERE tenancy_id = v_t AND status = 'active';
  BEGIN
    UPDATE public.rental_contracts SET advance_months = 2 WHERE id = v_c;
    RAISE EXCEPTION 'Advance changed after the move-in bill';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%move-in bill%' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.rental_contracts SET monthly_rent_centavos = 550000 WHERE id = v_c;
    RAISE EXCEPTION 'Rent changed after a monthly bill';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%New rent from%' THEN RAISE; END IF;
  END;
  UPDATE public.rental_contracts SET due_day = 6 WHERE id = v_c;
  PERFORM public.rental_change_rent(v_c, '2026-12-01', 550000);
  IF (SELECT count(*) FROM public.rental_contracts WHERE tenancy_id = v_t AND status = 'active' AND monthly_rent_centavos = 550000) <> 1
    OR (SELECT status || end_date FROM public.rental_contracts WHERE id = v_c) <> 'ended2026-12-01'
  THEN RAISE EXCEPTION 'New rent from did not renew the contract'; END IF;

  -- 5. A reading on an issued bill can't be deleted.
  INSERT INTO public.rental_meter_readings (property_id, unit_id, kind, read_on, value)
  VALUES ('00000000-0000-0000-0000-0000000ab009', '00000000-0000-0000-0000-0000000ac091', 'electric', '2026-11-01', 100)
  RETURNING id INTO v_r;
  PERFORM public.rental_issue_bill(v_t, 'final', '2026-11', '2026-11-30', jsonb_build_array(jsonb_build_object(
    'kind', 'electric', 'label', 'Electricity', 'amount', 1000, 'meter', jsonb_build_object('readings', jsonb_build_array(v_r),
    'fromDate', '2026-10-05', 'fromValue', 0, 'toDate', '2026-11-01', 'toValue', 100, 'usage', 100, 'rate', 10, 'sharedWith', 1))));
  BEGIN
    DELETE FROM public.rental_meter_readings WHERE id = v_r;
    RAISE EXCEPTION 'A billed reading was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE '%issued bill%' THEN RAISE; END IF;
  END;

  -- 6. Value checks and property settings.
  BEGIN
    INSERT INTO public.rental_meter_readings (property_id, unit_id, kind, read_on, value)
    VALUES ('00000000-0000-0000-0000-0000000ab009', '00000000-0000-0000-0000-0000000ac091', 'water', '2026-11-01', -1);
    RAISE EXCEPTION 'Negative reading accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_tenancies SET charges = '{}' WHERE id = v_t;
    RAISE EXCEPTION 'Non-array charges accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.rental_properties SET late_fee_centavos = 150000, rent_due_day = 5 WHERE id = '00000000-0000-0000-0000-0000000ab009';
  IF (SELECT late_fee_centavos * 100 + rent_due_day FROM public.rental_properties WHERE id = '00000000-0000-0000-0000-0000000ab009') <> 15000005
  THEN RAISE EXCEPTION 'Owner could not set late fee and due day'; END IF;
  BEGIN
    UPDATE public.rental_properties SET rent_due_day = 32 WHERE id = '00000000-0000-0000-0000-0000000ab009';
    RAISE EXCEPTION 'Due day 32 accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- 6b. Hardening: no direct inserts, numbers and lines are validated.
  BEGIN
    INSERT INTO public.rental_bills (property_id, tenancy_id, kind, period, number, issued_on, due_on, lines)
    VALUES ('00000000-0000-0000-0000-0000000ab009', v_t, 'final', '2026-12', 'INV-' || v_year || '-abc', '2026-12-01', '2026-12-01',
      '[{"kind":"rent","label":"Rent","amount":1}]');
    RAISE EXCEPTION 'A bill was inserted directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  SELECT id INTO v_id FROM public.rental_bills WHERE tenancy_id = v_t AND status = 'issued' AND kind = 'monthly';
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":"x"}]' WHERE id = v_id;
    RAISE EXCEPTION 'A line with a text amount was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"bribe","label":"Rent","amount":1}]' WHERE id = v_id;
    RAISE EXCEPTION 'A line with an unknown kind was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"electric","label":"E","amount":1,"meter":{"readings":[1]}}]' WHERE id = v_id;
    RAISE EXCEPTION 'A half-filled meter line was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":1,"period":{"from":"2026-13-45","to":"2026-12-01"}}]' WHERE id = v_id;
    RAISE EXCEPTION 'An impossible date was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":1,"period":{"from":"2026-02-30","to":"2026-03-01"}}]' WHERE id = v_id;
    RAISE EXCEPTION 'February 30 was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = jsonb_build_array(jsonb_build_object('kind', 'rent', 'label', E'\u00a0\u2003', 'amount', 1)) WHERE id = v_id;
    RAISE EXCEPTION 'A blank-looking label was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"electric","label":"E","amount":1,"meter":{"readings":["r"],"fromDate":"2026-10-01","toDate":"2026-11-01","fromValue":0,"toValue":10,"usage":10,"rate":"16","sharedWith":1}}]' WHERE id = v_id;
    RAISE EXCEPTION 'A text meter rate was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"electric","label":"E","amount":1,"meter":{"readings":["r"],"fromDate":"2026-10-01","toDate":"2026-11-01","fromValue":0,"toValue":10,"usage":10,"rate":16,"sharedWith":"2"}}]' WHERE id = v_id;
    RAISE EXCEPTION 'A text share count was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_bills SET lines = '[{"kind":"electric","label":"E","amount":1,"meter":{"readings":["r"],"fromDate":"2026-10-01","toDate":"2026-11-01","fromValue":0,"toValue":10,"usage":1e400,"rate":16,"sharedWith":1}}]' WHERE id = v_id;
    RAISE EXCEPTION 'An oversized meter usage was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.rental_bills SET lines = '[{"kind":"electric","label":"E","amount":1,"meter":{"readings":["r"],"fromDate":"2026-10-01","toDate":"2026-11-01","fromValue":1200.5,"toValue":1350.25,"usage":149.75,"rate":1600,"sharedWith":3}}]' WHERE id = v_id;
  UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":500000},{"kind":"other","label":"Discount","amount":-5000}]' WHERE id = v_id;
  BEGIN
    UPDATE public.rental_tenancies SET charges = '[{"label":"Parking","amount":0}]' WHERE id = v_t;
    RAISE EXCEPTION 'A zero charge was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_tenancies SET charges = '[{"label":"","amount":100}]' WHERE id = v_t;
    RAISE EXCEPTION 'A nameless charge was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_tenancies SET charges = jsonb_build_array(jsonb_build_object('label', E'\u00a0', 'amount', 100)) WHERE id = v_t;
    RAISE EXCEPTION 'A blank-looking charge name was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.rental_tenancies SET charges = '[{"label":"Parking","amount":100000}]' WHERE id = v_t;

  -- 7. Viewers can't issue.
  PERFORM public.rental_add_member('00000000-0000-0000-0000-0000000ab009', '00000000-0000-0000-0000-0000000aa002', 'viewer');
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa002', true);
  IF (SELECT count(*) FROM public.rental_bills WHERE property_id = '00000000-0000-0000-0000-0000000ab009') = 0
  THEN RAISE EXCEPTION 'Viewer cannot read bills'; END IF;
  BEGIN
    PERFORM public.rental_issue_bill(v_t, 'monthly', '2027-01', '2027-01-06', '[{"kind":"rent","label":"Rent","amount":1}]');
    RAISE EXCEPTION 'Viewer issued a bill';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
END $$;

-- Utilities billed by the month's actual bill amount.
DO $$ BEGIN
  UPDATE public.rental_units SET electric_mode = 'monthly', electric_amount_centavos = 0 WHERE id = '00000000-0000-0000-0000-0000000ac002';
  BEGIN
    UPDATE public.rental_units SET electric_amount_centavos = 1000 WHERE id = '00000000-0000-0000-0000-0000000ac002';
    RAISE EXCEPTION 'A monthly-bill room took a price';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO public.rental_utility_bills (property_id, unit_id, kind, period, amount_centavos)
  VALUES ('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000ac002', 'electric', '2026-11', 234500);
  BEGIN
    INSERT INTO public.rental_utility_bills (property_id, unit_id, kind, period, amount_centavos)
    VALUES ('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000ac002', 'electric', '2026-11', 1);
    RAISE EXCEPTION 'Two amounts for one month were accepted';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.rental_utility_bills (property_id, unit_id, kind, period, amount_centavos)
    VALUES ('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000ac002', 'electric', '2026-13', 1);
    RAISE EXCEPTION 'A bad month was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF NOT public.rental_valid_bill_lines('[{"kind":"electric","label":"Electricity","amount":234500,"billMonth":"2026-11"}]')
  THEN RAISE EXCEPTION 'A bill-month line was refused'; END IF;
  IF public.rental_valid_bill_lines('[{"kind":"electric","label":"Electricity","amount":1,"billMonth":"Nov"}]')
  THEN RAISE EXCEPTION 'A bad bill month was accepted'; END IF;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa003', true);
  IF EXISTS (SELECT 1 FROM public.rental_utility_bills) THEN RAISE EXCEPTION 'A stranger can read utility bills'; END IF;
  BEGIN
    INSERT INTO public.rental_utility_bills (property_id, unit_id, kind, period, amount_centavos)
    VALUES ('00000000-0000-0000-0000-0000000ab001', '00000000-0000-0000-0000-0000000ac002', 'electric', '2026-12', 1);
    RAISE EXCEPTION 'A stranger added a utility bill';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
END $$;


-- ── Step A: payments, allocations and payment accounts ─────────────────────
-- Owner aa001 owns Pay House (ab021); friend aa002 owns Friend House (ab022) and is a manager, later a viewer, of
-- Pay House; stranger aa003 has nothing.
RESET ROLE;
CREATE FUNCTION pg_temp.paid(p_bill uuid) RETURNS bigint LANGUAGE sql AS $$
  SELECT coalesce(sum(amount_centavos), 0) FROM public.rental_payment_allocations WHERE bill_id = p_bill
$$;
CREATE FUNCTION pg_temp.credit(p_tenancy uuid) RETURNS bigint LANGUAGE sql AS $$
  SELECT coalesce(sum(p.amount_centavos - (SELECT coalesce(sum(a.amount_centavos), 0)
    FROM public.rental_payment_allocations a WHERE a.payment_id = p.id)), 0)
  FROM public.rental_payments p WHERE p.tenancy_id = p_tenancy AND p.status = 'active'
$$;
-- Never over-allocated: no bill beyond its total, no payment beyond its amount, nothing on void rows.
CREATE FUNCTION pg_temp.check_allocations() RETURNS void LANGUAGE plpgsql AS $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.rental_bills b
    WHERE (SELECT coalesce(sum(a.amount_centavos), 0) FROM public.rental_payment_allocations a WHERE a.bill_id = b.id)
      > greatest(public.rental_bill_total(b.lines), 0))
  THEN RAISE EXCEPTION 'A bill is over-allocated'; END IF;
  IF EXISTS (SELECT 1 FROM public.rental_payments p
    WHERE (SELECT coalesce(sum(a.amount_centavos), 0) FROM public.rental_payment_allocations a WHERE a.payment_id = p.id)
      > p.amount_centavos)
  THEN RAISE EXCEPTION 'A payment is over-allocated'; END IF;
  IF EXISTS (SELECT 1 FROM public.rental_payment_allocations a
    JOIN public.rental_payments p ON p.id = a.payment_id JOIN public.rental_bills b ON b.id = a.bill_id
    WHERE p.status = 'void' OR b.status = 'void')
  THEN RAISE EXCEPTION 'A void payment or bill keeps allocations'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab021', 'Pay House');
INSERT INTO public.rental_units (id, property_id, name, kind, capacity) VALUES
  ('00000000-0000-0000-0000-0000000ac021', '00000000-0000-0000-0000-0000000ab021', 'P1', 'room', 1),
  ('00000000-0000-0000-0000-0000000ac022', '00000000-0000-0000-0000-0000000ab021', 'P2', 'room', 1);
INSERT INTO public.rental_renters (id, property_id, full_name) VALUES
  ('00000000-0000-0000-0000-0000000ad021', '00000000-0000-0000-0000-0000000ab021', 'Payer One'),
  ('00000000-0000-0000-0000-0000000ad022', '00000000-0000-0000-0000-0000000ab021', 'Payer Two');
SELECT public.rental_add_member('00000000-0000-0000-0000-0000000ab021', '00000000-0000-0000-0000-0000000aa002', 'manager');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa002', true);
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab022', 'Friend House');
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);

DO $$ DECLARE v_today date := (now() AT TIME ZONE 'Asia/Manila')::date; v_t uuid; v_t2 uuid;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid; b9 uuid; p1 uuid; p2 uuid; p3 uuid; p4 uuid; v_rent jsonb := '[{"kind":"rent","label":"Rent","amount":100000}]';
BEGIN
  -- No move-in bill: move-in on the due day with no advance or deposit.
  v_t := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac021', '00000000-0000-0000-0000-0000000ad021',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 0);
  v_t2 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac022', '00000000-0000-0000-0000-0000000ad022',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 0);
  b1 := public.rental_issue_bill(v_t, 'monthly', '2026-08', '2026-08-05', v_rent);
  b2 := public.rental_issue_bill(v_t, 'monthly', '2026-09', '2026-09-05', v_rent);
  b3 := public.rental_issue_bill(v_t, 'monthly', '2026-10', '2026-10-05', v_rent);
  b9 := public.rental_issue_bill(v_t2, 'monthly', '2026-08', '2026-08-05', v_rent);

  -- FIFO and partial: 1,500 pesos pays August in full and half of September.
  p1 := public.rental_record_payment(v_t, 150000, v_today - 1, 'gcash', 'REF-1', '');
  IF pg_temp.paid(b1) <> 100000 OR pg_temp.paid(b2) <> 50000 OR pg_temp.paid(b3) <> 0 OR pg_temp.paid(b9) <> 0
  THEN RAISE EXCEPTION 'FIFO allocation is wrong: % % %', pg_temp.paid(b1), pg_temp.paid(b2), pg_temp.paid(b3); END IF;
  -- Review Focus 5: the tenancy's advisory lock is held for the rest of the transaction.
  IF NOT EXISTS (SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid() AND granted
    AND ((classid::bigint << 32) | objid::bigint) = hashtextextended('rental_tenancy:' || v_t::text, 0))
  THEN RAISE EXCEPTION 'Recording a payment did not lock the tenancy'; END IF;

  -- Review Focus 1: overpayment is credit, not refused, and pays the next issued bill.
  p2 := public.rental_record_payment(v_t, 200000, v_today, 'cash', '', 'extra');
  IF pg_temp.paid(b2) <> 100000 OR pg_temp.paid(b3) <> 100000
    OR (SELECT sum(amount_centavos) FROM public.rental_payment_allocations WHERE payment_id = p2) <> 150000
  THEN RAISE EXCEPTION 'Overpayment allocation is wrong'; END IF;
  b4 := public.rental_issue_bill(v_t, 'monthly', '2026-11', '2026-11-05', v_rent);
  IF pg_temp.paid(b4) <> 50000 THEN RAISE EXCEPTION 'Credit did not apply to the next bill: %', pg_temp.paid(b4); END IF;
  PERFORM pg_temp.check_allocations();

  -- Review Focus 3: a paid bill can still be edited or cancelled; what no longer fits goes to credit or other bills.
  UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":90000}]' WHERE id = b1;
  IF pg_temp.paid(b1) <> 90000 OR pg_temp.paid(b4) <> 60000
  THEN RAISE EXCEPTION 'Shrinking a paid bill did not move the money on: b1 % b4 %', pg_temp.paid(b1), pg_temp.paid(b4); END IF;
  PERFORM pg_temp.check_allocations();
  UPDATE public.rental_bills SET lines = v_rent WHERE id = b1;
  UPDATE public.rental_bills SET status = 'void', void_reason = 'x' WHERE id = b4;
  IF pg_temp.paid(b4) <> 0 OR pg_temp.credit(v_t) <> 50000
  THEN RAISE EXCEPTION 'Cancelling a part-paid bill did not return its money to credit: %', pg_temp.credit(v_t); END IF;
  b4 := public.rental_issue_bill(v_t, 'monthly', '2026-11', '2026-11-05', v_rent);
  IF pg_temp.paid(b4) <> 50000 THEN RAISE EXCEPTION 'Credit did not pay the replacement bill'; END IF;
  -- Moving a due date reorders who gets paid first.
  UPDATE public.rental_bills SET due_on = '2026-08-01' WHERE id = b4;
  IF pg_temp.paid(b4) <> 100000 OR pg_temp.paid(b3) <> 50000
  THEN RAISE EXCEPTION 'A due date change did not reallocate: b3 % b4 %', pg_temp.paid(b3), pg_temp.paid(b4); END IF;
  UPDATE public.rental_bills SET due_on = '2026-11-05' WHERE id = b4;
  IF pg_temp.paid(b4) <> 50000 OR pg_temp.paid(b3) <> 100000 THEN RAISE EXCEPTION 'Restoring the due date did not reallocate'; END IF;
  PERFORM pg_temp.check_allocations();
  UPDATE public.rental_bills SET due_on = '2026-08-06' WHERE id = b1;

  -- Review Focus 2: voiding the latest payment returns exactly the bills it paid.
  BEGIN
    PERFORM public.rental_void_payment(p2, '   ');
    RAISE EXCEPTION 'A payment was voided without a reason';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'A payment was voided without a reason' THEN RAISE; END IF;
  END;
  PERFORM public.rental_void_payment(p2, 'Bounced');
  IF pg_temp.paid(b1) <> 100000 OR pg_temp.paid(b2) <> 50000 OR pg_temp.paid(b3) <> 0 OR pg_temp.paid(b4) <> 0
    OR (SELECT status || ':' || void_reason FROM public.rental_payments WHERE id = p2) <> 'void:Bounced'
  THEN RAISE EXCEPTION 'Void did not return the bills to unpaid'; END IF;
  BEGIN
    PERFORM public.rental_void_payment(p2, 'Again');
    RAISE EXCEPTION 'A payment was voided twice';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Payment not found or already voided' THEN RAISE; END IF;
  END;
  UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":120000}]' WHERE id = b4;

  -- Pinned allocation: "pay this bill first", capped at what the bill still needs; the rest goes oldest first.
  p3 := public.rental_record_payment(v_t, 30000, v_today, 'bank', 'B-3', '', b3);
  IF pg_temp.paid(b3) <> 30000 OR pg_temp.paid(b2) <> 50000
    OR NOT (SELECT bool_and(pinned) FROM public.rental_payment_allocations WHERE payment_id = p3)
  THEN RAISE EXCEPTION 'Pinned payment went to the wrong bill'; END IF;
  p4 := public.rental_record_payment(v_t, 100000, v_today + 1, 'maya', '', '', b3);
  IF pg_temp.paid(b3) <> 100000 OR pg_temp.paid(b2) <> 80000
    OR (SELECT amount_centavos FROM public.rental_payment_allocations WHERE payment_id = p4 AND pinned) <> 70000
  THEN RAISE EXCEPTION 'Pinned remainder is wrong: b2 % b3 %', pg_temp.paid(b2), pg_temp.paid(b3); END IF;
  PERFORM pg_temp.check_allocations();

  -- Refusals with the messages the app shows.
  BEGIN
    PERFORM public.rental_record_payment(v_t, 1000, v_today, 'cash', '', '', b9);
    RAISE EXCEPTION 'Paid another tenant''s bill';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Bill not found for this tenant' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.rental_record_payment(v_t, 0, v_today, 'cash', '', '');
    RAISE EXCEPTION 'A zero payment was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Amount must be more than zero' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.rental_record_payment(v_t, 1000, v_today + 2, 'cash', '', '');
    RAISE EXCEPTION 'A payment dated two days ahead was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Payment date is too far ahead' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.rental_record_payment(v_t, 1000, v_today, 'cheque', '', '');
    RAISE EXCEPTION 'An unknown method was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- No client writes on payments or allocations; reallocation is internal.
  BEGIN
    INSERT INTO public.rental_payments (property_id, tenancy_id, amount_centavos, paid_on, method)
    VALUES ('00000000-0000-0000-0000-0000000ab021', v_t, 1, v_today, 'cash');
    RAISE EXCEPTION 'A payment was inserted directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    UPDATE public.rental_payments SET status = 'void' WHERE id = p1;
    RAISE EXCEPTION 'A payment was updated directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.rental_payment_allocations WHERE payment_id = p1;
    RAISE EXCEPTION 'An allocation was deleted directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.rental_payment_allocations (payment_id, bill_id, property_id, amount_centavos)
    VALUES (p1, b4, '00000000-0000-0000-0000-0000000ab021', 1);
    RAISE EXCEPTION 'An allocation was inserted directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.rental_reallocate(v_t);
    RAISE EXCEPTION 'A client ran rental_reallocate';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF has_function_privilege('anon', 'public.rental_record_payment(uuid, integer, date, text, text, text, uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.rental_void_payment(uuid, text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.rental_reallocate(uuid)', 'EXECUTE')
  THEN RAISE EXCEPTION 'Payment functions are executable by the wrong roles'; END IF;

  -- Payment proofs: reserve, upload only to a reserved path, metadata guard.
  INSERT INTO public.rental_payment_proofs (id, payment_id, property_id, name, mime_type, size)
  VALUES ('00000000-0000-0000-0000-0000000a7021', p1, '00000000-0000-0000-0000-0000000ab021', 'gcash.png', 'image/png', 100);
  IF (SELECT storage_path FROM public.rental_payment_proofs WHERE id = '00000000-0000-0000-0000-0000000a7021')
    <> '00000000-0000-0000-0000-0000000ab021/payments/' || p1 || '/00000000-0000-0000-0000-0000000a7021'
  THEN RAISE EXCEPTION 'Proof storage path is wrong'; END IF;
  BEGIN
    INSERT INTO public.rental_payment_proofs (payment_id, property_id, name, mime_type, size)
    VALUES (p1, '00000000-0000-0000-0000-0000000ab022', 'x.png', 'image/png', 1);
    RAISE EXCEPTION 'A proof was filed under another property';
  EXCEPTION WHEN insufficient_privilege OR foreign_key_violation THEN NULL; END;
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('rental-files', '00000000-0000-0000-0000-0000000ab021/payments/' || p1 || '/00000000-0000-0000-0000-0000000a7021');
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('rental-files', '00000000-0000-0000-0000-0000000ab021/payments/' || p1 || '/00000000-0000-0000-0000-0000000a7999');
    RAISE EXCEPTION 'An unreserved proof path was uploaded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.rental_payment_proofs SET ready = true WHERE id = '00000000-0000-0000-0000-0000000a7021';
  BEGIN
    UPDATE public.rental_payment_proofs SET name = 'other.png' WHERE id = '00000000-0000-0000-0000-0000000a7021';
    RAISE EXCEPTION 'Proof metadata was changed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.rental_payment_proofs WHERE id = '00000000-0000-0000-0000-0000000a7021';
    RAISE EXCEPTION 'Proof metadata was deleted while the file is stored';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Remove the stored payment proof before deleting its metadata' THEN RAISE; END IF;
  END;

  -- Payment accounts: owner writes; qr_path must sit under the property's folder.
  INSERT INTO public.rental_payment_accounts (id, property_id, kind, label, account_name, account_number)
  VALUES ('00000000-0000-0000-0000-0000000af021', '00000000-0000-0000-0000-0000000ab021', 'gcash', 'GCash', 'Owner P.', '0917');
  UPDATE public.rental_payment_accounts SET qr_path = '00000000-0000-0000-0000-0000000ab021/00000000-0000-0000-0000-0000000af021-1.png'
  WHERE id = '00000000-0000-0000-0000-0000000af021';
  BEGIN
    UPDATE public.rental_payment_accounts SET qr_path = '00000000-0000-0000-0000-0000000ab022/x.png'
    WHERE id = '00000000-0000-0000-0000-0000000af021';
    RAISE EXCEPTION 'A QR path outside the property was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN
    UPDATE public.rental_payment_accounts SET property_id = '00000000-0000-0000-0000-0000000ab022'
    WHERE id = '00000000-0000-0000-0000-0000000af021';
    RAISE EXCEPTION 'An account moved property';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.rental_payment_accounts (property_id, kind, label)
    VALUES ('00000000-0000-0000-0000-0000000ab021', 'paypal', 'PayPal');
    RAISE EXCEPTION 'An unknown account kind was accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('rental-qr', '00000000-0000-0000-0000-0000000ab021/00000000-0000-0000-0000-0000000af021-1.png');

  -- As the manager friend: records and reads proofs, but can't touch accounts or the QR bucket.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa002', true);
  PERFORM public.rental_record_payment(v_t2, 5000, v_today, 'cash', '', '');
  IF pg_temp.paid(b9) <> 5000 THEN RAISE EXCEPTION 'Manager could not record a payment'; END IF;
  IF (SELECT count(*) FROM public.rental_payment_proofs) <> 1 THEN RAISE EXCEPTION 'Manager cannot read proofs'; END IF;
  BEGIN
    INSERT INTO public.rental_payment_accounts (property_id, kind, label)
    VALUES ('00000000-0000-0000-0000-0000000ab021', 'maya', 'Maya');
    RAISE EXCEPTION 'Manager added a payment account';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.rental_payment_accounts SET label = 'Hacked' WHERE id = '00000000-0000-0000-0000-0000000af021';
  DELETE FROM public.rental_payment_accounts WHERE id = '00000000-0000-0000-0000-0000000af021';
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('rental-qr', '00000000-0000-0000-0000-0000000ab021/m-1.png');
    RAISE EXCEPTION 'Manager uploaded a QR image';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  -- Cross-property: a tenancy of Pay House can't be paid as if it were Friend House's (friend owns Friend House).
  BEGIN
    INSERT INTO public.rental_payment_proofs (payment_id, property_id, name, mime_type, size)
    VALUES (p1, '00000000-0000-0000-0000-0000000ab022', 'x.png', 'image/png', 1);
    RAISE EXCEPTION 'A proof was attached across properties';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  -- As a viewer: reads payments and allocations, never proofs; can't record or void.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
  IF (SELECT label FROM public.rental_payment_accounts WHERE id = '00000000-0000-0000-0000-0000000af021') <> 'GCash'
  THEN RAISE EXCEPTION 'Manager changed or removed a payment account'; END IF;
  UPDATE public.rental_property_members SET role = 'viewer' WHERE user_id = '00000000-0000-0000-0000-0000000aa002'
    AND property_id = '00000000-0000-0000-0000-0000000ab021';
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa002', true);
  IF (SELECT count(*) FROM public.rental_payments) = 0 OR (SELECT count(*) FROM public.rental_payment_allocations) = 0
    OR (SELECT count(*) FROM public.rental_payment_accounts) <> 1
  THEN RAISE EXCEPTION 'Viewer cannot read payments, allocations or accounts'; END IF;
  IF (SELECT count(*) FROM public.rental_payment_proofs) <> 0 THEN RAISE EXCEPTION 'Viewer can read payment proofs'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'rental-files') THEN RAISE EXCEPTION 'Viewer can read proof files'; END IF;
  BEGIN
    PERFORM public.rental_record_payment(v_t, 1000, v_today, 'cash', '', '');
    RAISE EXCEPTION 'Viewer recorded a payment';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'Only managers can record payments' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.rental_void_payment(p1, 'No');
    RAISE EXCEPTION 'Viewer voided a payment';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'Only managers can record payments' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO public.rental_payment_proofs (payment_id, property_id, name, mime_type, size)
    VALUES (p1, '00000000-0000-0000-0000-0000000ab021', 'x.png', 'image/png', 1);
    RAISE EXCEPTION 'Viewer reserved a proof';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- As a stranger: sees nothing, can't record or void.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa003', true);
  IF EXISTS (SELECT 1 FROM public.rental_payments) OR EXISTS (SELECT 1 FROM public.rental_payment_allocations)
    OR EXISTS (SELECT 1 FROM public.rental_payment_accounts) OR EXISTS (SELECT 1 FROM public.rental_payment_proofs)
  THEN RAISE EXCEPTION 'A stranger can read payments'; END IF;
  BEGIN
    PERFORM public.rental_record_payment(v_t, 1000, v_today, 'cash', '', '');
    RAISE EXCEPTION 'Stranger recorded a payment';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.rental_void_payment(p1, 'No');
    RAISE EXCEPTION 'Stranger voided a payment';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'Only managers can record payments' THEN RAISE; END IF;
  END;
  -- Review Focus 4: an unknown id answers like a real one, so ids can't be probed.
  BEGIN
    PERFORM public.rental_void_payment(gen_random_uuid(), 'No');
    RAISE EXCEPTION 'Voiding an unknown payment did not fail';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'Only managers can record payments' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
END $$;

-- Review Focus 2: a pinned allocation whose bill shrinks is clamped, and dropped when the bill is cancelled.
RESET ROLE;
DO $$ DECLARE v_t uuid := (SELECT id FROM public.rental_tenancies WHERE renter_id = '00000000-0000-0000-0000-0000000ad021');
  b3 uuid; v_paid bigint; v_owed bigint;
BEGIN
  SELECT id INTO b3 FROM public.rental_bills WHERE tenancy_id = v_t AND period = '2026-10' AND status = 'issued';
  UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":60000}]' WHERE id = b3;
  IF pg_temp.paid(b3) <> 60000 OR (SELECT sum(amount_centavos) FROM public.rental_payment_allocations WHERE bill_id = b3 AND pinned) <> 60000
  THEN RAISE EXCEPTION 'Pinned allocations were not clamped: %', pg_temp.paid(b3); END IF;
  PERFORM pg_temp.check_allocations();
  UPDATE public.rental_bills SET status = 'void', void_reason = 'test' WHERE id = b3;
  IF pg_temp.paid(b3) <> 0 THEN RAISE EXCEPTION 'Allocations stayed on a cancelled bill'; END IF;
  PERFORM pg_temp.check_allocations();
  -- Everything paid (2,800) still lands somewhere: owed 1,000 + 1,000 + 1,200 = 3,200.
  SELECT sum(a.amount_centavos) INTO v_paid FROM public.rental_payment_allocations a
    JOIN public.rental_payments p ON p.id = a.payment_id WHERE p.tenancy_id = v_t;
  IF v_paid <> 280000 THEN RAISE EXCEPTION 'Payments were lost after the bill was cancelled: %', v_paid; END IF;
  -- Composite FK: a payment's tenancy must belong to its property.
  BEGIN
    INSERT INTO public.rental_payments (property_id, tenancy_id, amount_centavos, paid_on, method)
    VALUES ('00000000-0000-0000-0000-0000000ab022', v_t, 1, '2026-10-01', 'cash');
    RAISE EXCEPTION 'A payment was filed under another property';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  IF NOT (SELECT public FROM storage.buckets WHERE id = 'rental-qr')
    OR (SELECT file_size_limit FROM storage.buckets WHERE id = 'rental-qr') <> 2097152
  THEN RAISE EXCEPTION 'QR bucket is not public or has the wrong size limit'; END IF;
END $$;

-- Bills issued before payment tracking started: one "paid before tracking" payment per tenant clears them.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab031', 'Old House');
INSERT INTO public.rental_units (id, property_id, name, kind, capacity)
VALUES ('00000000-0000-0000-0000-0000000ac031', '00000000-0000-0000-0000-0000000ab031', 'O1', 'room', 1);
INSERT INTO public.rental_renters (id, property_id, full_name)
VALUES ('00000000-0000-0000-0000-0000000ad031', '00000000-0000-0000-0000-0000000ab031', 'Old Tenant');
SELECT public.rental_add_member('00000000-0000-0000-0000-0000000ab031', '00000000-0000-0000-0000-0000000aa002', 'viewer');
DO $$ DECLARE v_today date := (now() AT TIME ZONE 'Asia/Manila')::date; v_t uuid; e1 uuid; e2 uuid; n1 uuid;
  px uuid; py uuid; pz uuid; v_marked uuid; v_rent jsonb := '[{"kind":"rent","label":"Rent","amount":100000}]';
  v_house uuid := '00000000-0000-0000-0000-0000000ab031';
BEGIN
  -- New properties track everything; the start date is not client-editable.
  IF (SELECT payments_tracked_from FROM public.rental_properties WHERE id = v_house) IS NOT NULL
  THEN RAISE EXCEPTION 'A new property has a payment tracking start'; END IF;
  BEGIN
    UPDATE public.rental_properties SET payments_tracked_from = v_today WHERE id = v_house;
    RAISE EXCEPTION 'A client set the payment tracking start';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF public.rental_mark_earlier_paid(v_house) <> 0 THEN RAISE EXCEPTION 'Marked bills paid with no tracking start'; END IF;

  v_t := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac031', '00000000-0000-0000-0000-0000000ad031',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 0);
  e1 := public.rental_issue_bill(v_t, 'monthly', '2026-08', '2026-08-05', v_rent);
  e2 := public.rental_issue_bill(v_t, 'monthly', '2026-09', '2026-09-05', v_rent);
  n1 := public.rental_issue_bill(v_t, 'monthly', '2026-10', '2026-10-05', v_rent);
  -- As if the property existed when tracking shipped: e1 and e2 were issued before it.
  RESET ROLE;
  UPDATE public.rental_properties SET payments_tracked_from = v_today - 10 WHERE id = v_house;
  UPDATE public.rental_bills SET issued_on = v_today - 40 WHERE id IN (e1, e2);
  SET LOCAL ROLE authenticated;

  px := public.rental_record_payment(v_t, 30000, v_today, 'cash', '', '');
  IF pg_temp.paid(e1) <> 30000 THEN RAISE EXCEPTION 'Tracked payment did not pay the oldest bill'; END IF;

  -- A viewer or stranger can't mark bills paid, and gets the same message either way.
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa002', true);
  BEGIN
    PERFORM public.rental_mark_earlier_paid(v_house);
    RAISE EXCEPTION 'Viewer marked earlier bills paid';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'Only managers can record payments' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa003', true);
  BEGIN
    PERFORM public.rental_mark_earlier_paid(v_house);
    RAISE EXCEPTION 'Stranger marked earlier bills paid';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'Only managers can record payments' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);

  IF public.rental_mark_earlier_paid(v_house) <> 1 THEN RAISE EXCEPTION 'Expected one payment for one tenant'; END IF;
  SELECT id INTO v_marked FROM public.rental_payments WHERE tenancy_id = v_t AND notes = 'Paid before payment tracking';
  IF (SELECT amount_centavos || ':' || method || ':' || paid_on FROM public.rental_payments WHERE id = v_marked)
    <> '170000:other:' || (v_today - 10)
  THEN RAISE EXCEPTION 'Earlier-bills payment has the wrong amount, method or date'; END IF;
  IF pg_temp.paid(e1) <> 100000 OR pg_temp.paid(e2) <> 100000 OR pg_temp.paid(n1) <> 0
  THEN RAISE EXCEPTION 'Earlier bills not paid exactly: e1 % e2 % n1 %', pg_temp.paid(e1), pg_temp.paid(e2), pg_temp.paid(n1); END IF;
  IF public.rental_mark_earlier_paid(v_house) <> 0 THEN RAISE EXCEPTION 'Marked earlier bills paid twice'; END IF;
  -- The earlier-bills payment carries its receipt snapshot too.
  IF (SELECT receipt FROM public.rental_payments WHERE id = v_marked) <> jsonb_build_object(
    'applied', jsonb_build_array(
      jsonb_build_object('billId', e1, 'number', (SELECT number FROM public.rental_bills WHERE id = e1), 'amount', 70000),
      jsonb_build_object('billId', e2, 'number', (SELECT number FROM public.rental_bills WHERE id = e2), 'amount', 100000)),
    'creditCentavos', 0, 'balanceCentavos', 100000)
  THEN RAISE EXCEPTION 'Earlier-bills receipt snapshot is wrong: %', (SELECT receipt FROM public.rental_payments WHERE id = v_marked); END IF;
  PERFORM pg_temp.check_allocations();

  -- Automatic allocation follows the order payments were recorded, not their dates: a back-dated payment goes last.
  py := public.rental_record_payment(v_t, 60000, v_today, 'cash', '', '');
  pz := public.rental_record_payment(v_t, 60000, v_today - 20, 'cash', '', '');
  IF (SELECT sum(amount_centavos) FROM public.rental_payment_allocations WHERE payment_id = px AND bill_id = e1) <> 30000
    OR (SELECT sum(amount_centavos) FROM public.rental_payment_allocations WHERE payment_id = py AND bill_id = n1) <> 60000
    OR (SELECT sum(amount_centavos) FROM public.rental_payment_allocations WHERE payment_id = pz) <> 40000
  THEN RAISE EXCEPTION 'Allocation did not follow the recording order'; END IF;
  PERFORM pg_temp.check_allocations();
END $$;

-- Receipts never change after issue: each payment keeps what it paid, its credit and the balance at record time.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab041', 'Receipt House');
INSERT INTO public.rental_units (id, property_id, name, kind, capacity)
VALUES ('00000000-0000-0000-0000-0000000ac041', '00000000-0000-0000-0000-0000000ab041', 'R1', 'room', 1);
INSERT INTO public.rental_renters (id, property_id, full_name)
VALUES ('00000000-0000-0000-0000-0000000ad041', '00000000-0000-0000-0000-0000000ab041', 'Receipt Tenant');
DO $$ DECLARE v_today date := (now() AT TIME ZONE 'Asia/Manila')::date; v_t uuid; b1 uuid; b2 uuid; b3 uuid;
  p1 uuid; p2 uuid; r1 jsonb; r2 jsonb; v_rent jsonb := '[{"kind":"rent","label":"Rent","amount":100000}]';
BEGIN
  v_t := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac041', '00000000-0000-0000-0000-0000000ad041',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 0);
  b1 := public.rental_issue_bill(v_t, 'monthly', '2026-08', '2026-08-05', v_rent);
  b2 := public.rental_issue_bill(v_t, 'monthly', '2026-09', '2026-09-05', v_rent);
  p1 := public.rental_record_payment(v_t, 150000, v_today, 'cash', '', '');
  p2 := public.rental_record_payment(v_t, 80000, v_today, 'cash', '', '');
  SELECT receipt INTO r1 FROM public.rental_payments WHERE id = p1;
  SELECT receipt INTO r2 FROM public.rental_payments WHERE id = p2;
  IF r1 <> jsonb_build_object('applied', jsonb_build_array(
      jsonb_build_object('billId', b1, 'number', (SELECT number FROM public.rental_bills WHERE id = b1), 'amount', 100000),
      jsonb_build_object('billId', b2, 'number', (SELECT number FROM public.rental_bills WHERE id = b2), 'amount', 50000)),
    'creditCentavos', 0, 'balanceCentavos', 50000)
  THEN RAISE EXCEPTION 'First receipt snapshot is wrong: %', r1; END IF;
  IF r2 <> jsonb_build_object('applied', jsonb_build_array(
      jsonb_build_object('billId', b2, 'number', (SELECT number FROM public.rental_bills WHERE id = b2), 'amount', 50000)),
    'creditCentavos', 30000, 'balanceCentavos', 0)
  THEN RAISE EXCEPTION 'Second receipt snapshot is wrong: %', r2; END IF;

  -- A client can't rewrite a receipt.
  BEGIN
    UPDATE public.rental_payments SET receipt = '{}' WHERE id = p1;
    RAISE EXCEPTION 'A client rewrote a receipt';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- A later bill takes the credit, a bill is edited and another cancelled, the first payment is voided:
  -- allocations move, receipts stay.
  b3 := public.rental_issue_bill(v_t, 'monthly', '2026-10', '2026-10-05', v_rent);
  IF pg_temp.paid(b3) <> 30000 THEN RAISE EXCEPTION 'Credit did not move to the later bill'; END IF;
  RESET ROLE;
  UPDATE public.rental_bills SET lines = '[{"kind":"rent","label":"Rent","amount":120000}]' WHERE id = b2;
  UPDATE public.rental_bills SET status = 'void', void_reason = 'test' WHERE id = b3;
  SET LOCAL ROLE authenticated;
  PERFORM public.rental_void_payment(p1, 'bounced');
  IF NOT EXISTS (SELECT 1 FROM public.rental_payment_allocations WHERE payment_id = p2 AND bill_id = b1)
  THEN RAISE EXCEPTION 'Voiding did not reallocate the later payment'; END IF;
  IF (SELECT receipt FROM public.rental_payments WHERE id = p1) <> r1 OR (SELECT receipt FROM public.rental_payments WHERE id = p2) <> r2
  THEN RAISE EXCEPTION 'A receipt changed after issue'; END IF;
  PERFORM pg_temp.check_allocations();
END $$;

RESET ROLE;
DO $$ BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'rental-files') THEN RAISE EXCEPTION 'Rental bucket is public'; END IF;
END $$;
ROLLBACK;
