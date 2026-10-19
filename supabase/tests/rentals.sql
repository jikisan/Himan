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


-- ── Step C: contracts, signing links and invite uploads ─────────────────────
RESET ROLE;
-- Expects p_sql to fail with message p_msg (or with SQLSTATE p_msg when it is 5 characters).
CREATE FUNCTION pg_temp.refused(p_sql text, p_msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    IF (CASE WHEN char_length(p_msg) = 5 THEN SQLSTATE ELSE SQLERRM END) <> p_msg THEN
      RAISE EXCEPTION 'Expected "%", got "%" (%) from: %', p_msg, SQLERRM, SQLSTATE, p_sql;
    END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'Not refused: %', p_sql;
END $$;

-- Review Focus 1: anon executes only the three link RPCs (plus the upload check its storage policy needs) and has
-- no table grants; every SECURITY DEFINER rental function pins search_path.
DO $$ DECLARE v_bad text; BEGIN
  SELECT string_agg(p.proname, ', ') INTO v_bad FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'rental\_%' AND has_function_privilege('anon', p.oid, 'EXECUTE')
    AND p.prorettype <> 'trigger'::regtype -- trigger functions can't be called directly
    AND p.proname NOT IN ('rental_link_get', 'rental_link_submit_details', 'rental_link_sign', 'rental_link_can_upload');
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'anon can execute %', v_bad; END IF;
  IF NOT has_function_privilege('anon', 'public.rental_link_get(text)', 'EXECUTE')
    OR NOT has_function_privilege('anon', 'public.rental_link_submit_details(text, jsonb)', 'EXECUTE')
    OR NOT has_function_privilege('anon', 'public.rental_link_sign(text, text, text, text, text, text)', 'EXECUTE')
  THEN RAISE EXCEPTION 'anon cannot execute the link RPCs'; END IF;
  SELECT string_agg(p.proname, ', ') INTO v_bad FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace AND p.proname LIKE 'rental\_%' AND p.prosecdef
    AND NOT coalesce(p.proconfig @> ARRAY['search_path=""'], false);
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'SECURITY DEFINER without search_path: %', v_bad; END IF;
  SELECT string_agg(t, ', ') INTO v_bad FROM unnest(ARRAY['public.rental_contract_templates', 'public.rental_contract_texts',
    'public.rental_tenancy_links']) t
  WHERE has_any_column_privilege('anon', t, 'SELECT, INSERT, UPDATE') OR has_table_privilege('anon', t, 'DELETE')
    OR has_table_privilege('authenticated', t, 'DELETE');
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Table grants too wide on %', v_bad; END IF;
  IF (SELECT public FROM storage.buckets WHERE id = 'rental-link-uploads')
    OR (SELECT file_size_limit FROM storage.buckets WHERE id = 'rental-link-uploads') <> 10485760
    OR (SELECT allowed_mime_types FROM storage.buckets WHERE id = 'rental-link-uploads') <> ARRAY['application/pdf', 'image/jpeg', 'image/png']
  THEN RAISE EXCEPTION 'Link uploads bucket is public or has the wrong limits'; END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
INSERT INTO public.rental_properties (id, name, lessor_name) VALUES ('00000000-0000-0000-0000-0000000ab051', 'Contract House', 'Lessor Person');
INSERT INTO public.rental_units (id, property_id, name, kind, capacity) VALUES
  ('00000000-0000-0000-0000-0000000ac051', '00000000-0000-0000-0000-0000000ab051', 'C1', 'room', 1),
  ('00000000-0000-0000-0000-0000000ac052', '00000000-0000-0000-0000-0000000ab051', 'C2', 'room', 1),
  ('00000000-0000-0000-0000-0000000ac053', '00000000-0000-0000-0000-0000000ab051', 'C3', 'room', 1);
INSERT INTO public.rental_renters (id, property_id, full_name) VALUES
  ('00000000-0000-0000-0000-0000000ad051', '00000000-0000-0000-0000-0000000ab051', 'New Tenant'),
  ('00000000-0000-0000-0000-0000000ad052', '00000000-0000-0000-0000-0000000ab051', 'Old Tenant'),
  ('00000000-0000-0000-0000-0000000ad053', '00000000-0000-0000-0000-0000000ab051', 'Gone Tenant');
SELECT public.rental_add_member('00000000-0000-0000-0000-0000000ab051', '00000000-0000-0000-0000-0000000aa002', 'manager');

DO $$ DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_house uuid := '00000000-0000-0000-0000-0000000ab051';
  v_owner text := '00000000-0000-0000-0000-0000000aa001'; v_friend text := '00000000-0000-0000-0000-0000000aa002';
  v_stranger text := '00000000-0000-0000-0000-0000000aa003';
  v_png_t text := 'data:image/png;base64,iVBORw0KGgoVEVOQU5U'; v_png_l text := 'data:image/png;base64,iVBORw0KGgoTEVTU09S';
  v_invalid text := 'This link isn''t valid anymore'; v_mgr text := 'Only managers can manage contracts';
  v_hash1 text := '0d705191a1408862c6cadb10d5fa6820b49b0d465ae884cf98db6c5e430760ba';
  v_hash2 text := '4a2e231ff47c3cda5552d51d909d179697fec17f7a69a1bd48f811a80bab0e13';
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_x1 uuid; v_x2 uuid; v_x3 uuid; v_b1 uuid;
  v_tok1 text; v_tok2 text; v_tok3 text; v_old text; v_id1 text; v_id2 text; v_id3 text; v_id4 text;
  v_j jsonb; v_details jsonb; v_n integer;
BEGIN
  -- Owner: saved signature must be a small PNG data URL.
  PERFORM pg_temp.refused(format('UPDATE public.rental_properties SET lessor_signature = %L WHERE id = %L',
    'data:image/jpeg;base64,AAAA', v_house), '23514');
  PERFORM pg_temp.refused(format('UPDATE public.rental_properties SET lessor_signature = %L WHERE id = %L',
    'data:image/png;base64,' || repeat('A', 153600), v_house), '23514');
  -- Base64 that isn't a PNG (no PNG header) is refused too.
  PERFORM pg_temp.refused(format('UPDATE public.rental_properties SET lessor_signature = %L WHERE id = %L',
    'data:image/png;base64,QUJDRA==', v_house), '23514');
  UPDATE public.rental_properties SET lessor_signature = v_png_l, address = '1 Main St', lessor_address = '' WHERE id = v_house;
  IF public.rental_get_lessor_signature(v_house) IS DISTINCT FROM v_png_l THEN RAISE EXCEPTION 'Owner cannot read the saved signature'; END IF;

  -- Template: 1..80 clauses of {id, text ≤ 4000}.
  INSERT INTO public.rental_contract_templates (property_id, clauses)
  VALUES (v_house, '[{"id":"rent","text":"Rent is {{monthly_rent}}."}]');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_templates SET clauses = %L WHERE property_id = %L', '[]', v_house), '23514');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_templates SET clauses = %L WHERE property_id = %L',
    jsonb_build_array(jsonb_build_object('id', 'a', 'text', repeat('x', 4001))), v_house), '23514');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_templates SET clauses = %L WHERE property_id = %L',
    (SELECT jsonb_agg(jsonb_build_object('id', 'c' || i, 'text', 'x')) FROM generate_series(1, 81) i), v_house), '23514');

  v_t1 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac051', '00000000-0000-0000-0000-0000000ad051',
    '2026-10-01', '2026-10-01', '2027-10-01', 500000, 1, 1, 500000);
  v_t2 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac052', '00000000-0000-0000-0000-0000000ad052',
    '2026-10-01', '2026-10-01', '2027-10-01', 500000, 1, 1, 500000);
  v_t3 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac053', '00000000-0000-0000-0000-0000000ad053',
    '2026-01-05', '2026-01-05', '2027-01-05', 500000, 5, 0, 0);
  -- The landlord picks how each contract is signed (20261019000000).
  INSERT INTO public.rental_contract_texts (contract_id, property_id, body, special_terms, sign_mode)
  VALUES ((SELECT id FROM public.rental_contracts WHERE tenancy_id = v_t1), v_house, '["Rent ₱1","Second"]', 'No pets', 'notarize')
  RETURNING id INTO v_x1;
  INSERT INTO public.rental_contract_texts (contract_id, property_id, body, special_terms, sign_mode)
  VALUES ((SELECT id FROM public.rental_contracts WHERE tenancy_id = v_t2), v_house, '["Rent ₱1","Second"]', 'No pets', 'esign')
  RETURNING id INTO v_x2;
  IF (SELECT status FROM public.rental_contract_texts WHERE id = v_x1) <> 'draft' THEN RAISE EXCEPTION 'New contract is not a draft'; END IF;
  -- Clients can't pick the status, file a text under another property, or store a malformed body.
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_contract_texts (contract_id, property_id, body, status) VALUES (%L, %L, %L, %L)',
    (SELECT id FROM public.rental_contracts WHERE tenancy_id = v_t3), v_house, '["x"]', 'signed'), '42501');
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_contract_texts (contract_id, property_id, body) VALUES (%L, %L, %L)',
    (SELECT id FROM public.rental_contracts WHERE tenancy_id = v_t3), '00000000-0000-0000-0000-0000000ab001', '["x"]'), '23503');
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_contract_texts (contract_id, property_id, body) VALUES (%L, %L, %L)',
    (SELECT id FROM public.rental_contracts WHERE tenancy_id = v_t3), v_house, '[]'), '23514');
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_contract_texts (contract_id, property_id, body) VALUES (%L, %L, %L)',
    (SELECT id FROM public.rental_contracts WHERE tenancy_id = v_t3), v_house, '[1]'), '23514');

  -- Links: 32 random bytes as base64url; regenerating replaces the token.
  v_tok1 := public.rental_create_link(v_t1, 'new');
  v_tok2 := public.rental_create_link(v_t2, 'existing');
  v_tok3 := public.rental_create_link(v_t3, 'existing');
  IF v_tok1 !~ '^[A-Za-z0-9_-]{43}$' OR v_tok1 = v_tok2 THEN RAISE EXCEPTION 'Token is not 32 random bytes in base64url: %', v_tok1; END IF;
  v_old := v_tok2;
  v_tok2 := public.rental_create_link(v_t2, 'existing');
  IF v_tok2 = v_old THEN RAISE EXCEPTION 'Regenerating kept the old token'; END IF;
  PERFORM pg_temp.refused(format('SELECT public.rental_create_link(%L, %L)', v_t1, 'other'), 'Link kind must be new or existing');
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_tenancy_links (tenancy_id, property_id, token, kind) VALUES (%L, %L, %L, %L)',
    v_t3, v_house, 'weak', 'new'), '42501');
  PERFORM pg_temp.refused(format('UPDATE public.rental_tenancy_links SET status = %L WHERE tenancy_id = %L', 'accepted', v_t1), '42501');
  PERFORM public.rental_end_tenancy(v_t3, v_today - 100);

  -- A payment (with a private note) and a payment account for the renter page.
  SELECT id INTO v_b1 FROM public.rental_bills WHERE tenancy_id = v_t1;
  PERFORM public.rental_record_payment(v_t1, 100000, v_today, 'gcash', 'REF1', 'private note');
  INSERT INTO public.rental_payment_accounts (property_id, kind, label, account_name, account_number)
  VALUES (v_house, 'gcash', 'GCash', 'Lessor P.', '0917');
  PERFORM public.rental_send_contract(v_x1);
  PERFORM pg_temp.refused(format('SELECT public.rental_send_contract(%L)', v_x1), 'Only drafts can be sent');

  -- Manager: reads links, can't change the owner's saved signature or template.
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  IF (SELECT count(*) FROM public.rental_tenancy_links WHERE property_id = v_house) <> 3 THEN RAISE EXCEPTION 'Manager cannot read links'; END IF;
  UPDATE public.rental_properties SET lessor_signature = NULL WHERE id = v_house;
  PERFORM pg_temp.refused(format('SELECT lessor_signature FROM public.rental_properties WHERE id = %L', v_house), '42501');
  PERFORM pg_temp.refused(format('SELECT public.rental_get_lessor_signature(%L)', v_house), '42501');
  IF (SELECT name FROM public.rental_properties WHERE id = v_house) <> 'Contract House' THEN RAISE EXCEPTION 'Manager cannot read the property'; END IF;
  UPDATE public.rental_contract_templates SET clauses = '[{"id":"x","text":"Hacked"}]' WHERE property_id = v_house;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  IF public.rental_get_lessor_signature(v_house) IS DISTINCT FROM v_png_l
    OR (SELECT clauses->0->>'text' FROM public.rental_contract_templates WHERE property_id = v_house) <> 'Rent is {{monthly_rent}}.'
  THEN RAISE EXCEPTION 'A manager changed the saved signature or the template'; END IF;

  -- Stranger: every manager RPC refuses with the same message, known id or not.
  PERFORM set_config('request.jwt.claim.sub', v_stranger, true);
  PERFORM pg_temp.refused(format('SELECT public.rental_create_link(%L, %L)', v_t1, 'new'), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_create_link(%L, %L)', gen_random_uuid(), 'new'), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_revoke_link(%L)', v_t1), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_reopen_link(%L)', v_t1), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_accept_details(%L)', v_t1), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_send_contract(%L)', v_x2), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_countersign(%L)', v_x1), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_get_lessor_signature(%L)', v_house), '42501');
  PERFORM pg_temp.refused(format('SELECT public.rental_set_notarized_scan(%L, %L)', v_x1, 'x'), v_mgr);
  IF EXISTS (SELECT 1 FROM public.rental_tenancy_links) OR EXISTS (SELECT 1 FROM public.rental_contract_texts)
    OR EXISTS (SELECT 1 FROM public.rental_contract_templates)
  THEN RAISE EXCEPTION 'A stranger can read links, contracts or templates'; END IF;

  -- Anonymous, round 1. Review Focus 1: guessed, regenerated-away and expired tokens get the same answer.
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_get(%L)', 'guessed-token'), v_invalid);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_get(%L)', v_old), v_invalid);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_get(%L)', v_tok3), v_invalid);
  PERFORM pg_temp.refused('SELECT public.rental_link_get(NULL)', v_invalid);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_old, 'X', 'esign', v_png_t, 'UA'), v_invalid);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_submit_details(%L, %L)', 'guessed-token', '{}'), v_invalid);
  PERFORM pg_temp.refused('SELECT 1 FROM public.rental_tenancy_links', '42501');
  PERFORM pg_temp.refused('SELECT 1 FROM public.rental_contract_texts', '42501');
  PERFORM pg_temp.refused('SELECT 1 FROM public.rental_contract_templates', '42501');
  PERFORM pg_temp.refused(format('SELECT public.rental_create_link(%L, %L)', v_t1, 'new'), '42501');

  -- The page shows this tenancy's bills, payments and accounts; no notes, contacts, other tenants or saved signature.
  v_j := public.rental_link_get(v_tok1);
  IF v_j->>'kind' <> 'new' OR v_j->>'status' <> 'open' OR v_j->>'tenantName' <> 'New Tenant'
    OR v_j->'property'->>'lessorName' <> 'Lessor Person' OR v_j->'property'->>'lessorAddress' <> '1 Main St' THEN RAISE EXCEPTION 'Link page header is wrong: %', v_j; END IF;
  IF v_j->'contract'->>'id' <> v_x1::text OR v_j->'contract'->>'status' <> 'sent' OR (v_j->'contract'->>'lessorSigned')::boolean
    OR v_j->'contract'->'body' <> '["Rent ₱1","Second"]' OR v_j->'contract'->>'specialTerms' <> 'No pets'
  THEN RAISE EXCEPTION 'Link page contract is wrong: %', v_j->'contract'; END IF;
  IF jsonb_array_length(v_j->'bills') <> 1 OR v_j->'bills'->0->>'id' <> v_b1::text
    OR (v_j->'bills'->0->>'paid')::integer <> 100000
    OR (v_j->'bills'->0->>'balance')::integer <> (v_j->'bills'->0->>'total')::integer - 100000
  THEN RAISE EXCEPTION 'Link page bills are wrong: %', v_j->'bills'; END IF;
  IF jsonb_array_length(v_j->'payments') <> 1 OR v_j->'payments'->0->>'reference' <> 'REF1'
    OR (v_j->'payments'->0->>'amount')::integer <> 100000
    OR v_j->'payments'->0->'billNumbers'->>0 <> (v_j->'bills'->0->>'number')
    OR NOT v_j->'payments'->0->'receipt' ? 'applied'
  THEN RAISE EXCEPTION 'Link page payments are wrong: %', v_j->'payments'; END IF;
  IF jsonb_array_length(v_j->'accounts') <> 1 OR v_j->'accounts'->0->>'accountNumber' <> '0917'
  THEN RAISE EXCEPTION 'Link page accounts are wrong: %', v_j->'accounts'; END IF;
  IF v_j::text LIKE '%private note%' OR v_j::text LIKE '%Old Tenant%' OR v_j::text LIKE '%Gone Tenant%'
    OR v_j::text LIKE '%TEVTU09S%' OR v_j::text LIKE '%rental-files%'
  THEN RAISE EXCEPTION 'Link page leaks notes, other tenants or the saved signature: %', v_j; END IF;
  -- Wrong tenancy: the existing tenant's link shows only their own (unsent) contract: none.
  v_j := public.rental_link_get(v_tok2);
  IF v_j->>'kind' <> 'existing' OR v_j->'contract' <> 'null'::jsonb OR v_j->>'tenantName' <> 'Old Tenant'
    OR jsonb_array_length(v_j->'payments') <> 0
  THEN RAISE EXCEPTION 'Existing-tenant link shows the wrong tenancy: %', v_j; END IF;

  -- Review Focus 2 and 5: a draft can't be signed; an existing tenant can't submit details; a new tenant can't sign yet.
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok2, 'Old Tenant', 'esign', v_png_t, 'UA'),
    'The contract hasn''t been sent to you yet');
  v_details := jsonb_build_object('fullName', 'New Tenant Full', 'phone', '0917 000 0000', 'address', '12 Street',
    'emergencyName', 'Mom', 'emergencyPhone', '0918 111', 'facebook', 'fb.me/nt', 'email', 'nt@example.com', 'occupants', 2);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_submit_details(%L, %L)', v_tok2, v_details), 'Your details are already on file');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok1, 'New Tenant', 'esign', v_png_t, 'UA'),
    'Send your details first');

  -- Review Focus 3: anon uploads only into an open new-tenant link folder, named {token}/{uuid}.{ext}; never reads or lists.
  v_id1 := v_tok1 || '/' || gen_random_uuid() || '.png';
  v_id2 := v_tok1 || '/' || gen_random_uuid() || '.pdf';
  v_id3 := v_tok1 || '/' || gen_random_uuid() || '.jpg';
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads', v_tok1 || '/id.png'), '42501');
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads',
    v_tok1 || '/' || gen_random_uuid() || '.exe'), '42501');
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads',
    v_tok2 || '/' || gen_random_uuid() || '.png'), '42501');
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads',
    v_old || '/' || gen_random_uuid() || '.png'), '42501');
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-files',
    v_house || '/renters/x/y'), '42501');
  -- Nested or traversal-looking names are refused at upload time, even inside an open link's folder.
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads',
    v_tok1 || '/sub/' || gen_random_uuid() || '.png'), '42501');
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads',
    v_tok1 || '/../' || v_house || '/' || gen_random_uuid() || '.png'), '42501');
  INSERT INTO storage.objects (bucket_id, name) VALUES ('rental-link-uploads', v_id1), ('rental-link-uploads', v_id2),
    ('rental-link-uploads', v_id3);
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads',
    v_tok1 || '/' || gen_random_uuid() || '.png'), '42501');
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id IN ('rental-link-uploads', 'rental-files'))
  THEN RAISE EXCEPTION 'anon can read or list uploads'; END IF;

  PERFORM pg_temp.refused(format('SELECT public.rental_link_submit_details(%L, %L)', v_tok1,
    (v_details - 'phone') || jsonb_build_object('idPaths', jsonb_build_array(v_id1))),
    'Fill in your full name, mobile number, home address and emergency contact');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_submit_details(%L, %L)', v_tok1,
    v_details || '{"idPaths":[]}'), 'Upload a photo of your valid ID (up to 3)');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_submit_details(%L, %L)', v_tok1,
    v_details || jsonb_build_object('idPaths', jsonb_build_array(v_tok1 || '/' || gen_random_uuid() || '.png'))),
    'Upload a photo of your valid ID (up to 3)');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_submit_details(%L, %L)', v_tok1,
    v_details || jsonb_build_object('idPaths', jsonb_build_array(v_house || '/renters/x/y'))),
    'Upload a photo of your valid ID (up to 3)');
  PERFORM public.rental_link_submit_details(v_tok1, v_details || jsonb_build_object('idPaths', jsonb_build_array(v_id1, v_id2, v_id3)));
  PERFORM pg_temp.refused(format('SELECT public.rental_link_submit_details(%L, %L)', v_tok1,
    v_details || jsonb_build_object('idPaths', jsonb_build_array(v_id1))), 'Your details were already sent');
  v_id4 := v_tok1 || '/' || gen_random_uuid() || '.png';
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-link-uploads', v_id4), '42501');
  v_j := public.rental_link_get(v_tok1);
  IF v_j->>'status' <> 'submitted' OR v_j::text LIKE '%0917 000 0000%' OR v_j::text LIKE '%' || v_id1 || '%'
  THEN RAISE EXCEPTION 'Submitted details leak back through the link: %', v_j; END IF;

  -- Signing input checks, and a stale page's hash.
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok1, ' ', 'esign', v_png_t, 'UA'), 'Type your full name');
  -- 'Choose how to sign' now applies only to texts sent without a mode: see Step E.
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok1, 'N', 'esign',
    'data:image/jpeg;base64,AAAA', 'UA'), 'Draw your signature again');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok1, 'N', 'esign',
    'data:image/png;base64,QUJDRA==', 'UA'), 'Draw your signature again');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok1, 'N', 'esign',
    'data:image/png;base64,' || repeat('A', 153600), 'UA'), 'Draw your signature again');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L, %L)', v_tok1, 'N', 'esign', v_png_t, 'UA',
    repeat('0', 64)), 'The contract changed. Reload the page to read the latest version');

  -- Owner: details stay off the renter record until Accept; the landlord edits the sent text and revokes a link.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  IF (SELECT phone || address || full_name FROM public.rental_renters WHERE id = '00000000-0000-0000-0000-0000000ad051') <> 'New Tenant'
  THEN RAISE EXCEPTION 'Submitted details reached the renter before Accept'; END IF;
  IF (SELECT submitted_details->>'phone' FROM public.rental_tenancy_links WHERE tenancy_id = v_t1) <> '0917 000 0000'
    OR (SELECT submitted_details->'idPaths' FROM public.rental_tenancy_links WHERE tenancy_id = v_t1) <> jsonb_build_array(v_id1, v_id2, v_id3)
  THEN RAISE EXCEPTION 'Submitted details were not kept for review'; END IF;
  UPDATE public.rental_contract_texts SET body = '["Rent ₱1","Second, edited"]' WHERE id = v_x1;
  IF NOT FOUND THEN RAISE EXCEPTION 'A sent contract could not be edited'; END IF;
  PERFORM public.rental_send_contract(v_x2);
  PERFORM public.rental_revoke_link(v_t2);
  UPDATE public.rental_tenancies SET move_out = v_today - 80 WHERE id = v_t3;
  UPDATE public.rental_properties SET lessor_address = 'Lessor Home' WHERE id = v_house;

  -- Anonymous, round 2: revoked is invalid, 80 days after move-out is still valid; stale hash; sign once.
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_get(%L)', v_tok2), v_invalid);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok2, 'Old Tenant', 'esign', v_png_t, 'UA'), v_invalid);
  IF public.rental_link_get(v_tok3)->'property'->>'lessorAddress' <> 'Lessor Home' THEN
    RAISE EXCEPTION 'Link page lessor address is not the lessor''s'; END IF;
  IF public.rental_link_get(v_tok3)->>'tenantName' <> 'Gone Tenant' THEN RAISE EXCEPTION 'A link 80 days after move-out stopped working'; END IF;
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L, %L)', v_tok1, 'N', 'notarize', v_png_t, 'UA', v_hash1),
    'The contract changed. Reload the page to read the latest version');
  -- The hash of the text the tenant read is mandatory: without it (or with a wrong one) nothing is signed.
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok1, 'New Tenant Full', 'notarize', v_png_t, 'UA'),
    'The contract changed. Reload the page to read the latest version');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L, %L)', v_tok1, 'New Tenant Full', 'notarize', v_png_t, 'UA',
    repeat('0', 64)), 'The contract changed. Reload the page to read the latest version');
  PERFORM public.rental_link_sign(v_tok1, '  New Tenant Full ', 'notarize', v_png_t, repeat('U', 600), v_hash2);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L)', v_tok1, 'N', 'esign', v_png_t, 'UA'),
    'You already signed this contract');
  v_j := public.rental_link_get(v_tok1);
  IF v_j->'contract'->>'status' <> 'signed' OR v_j->'contract'->>'contentHash' <> v_hash2 OR v_j->'contract'->>'signMode' <> 'notarize'
    OR v_j->'contract'->>'tenantSignature' <> v_png_t OR (v_j->'contract'->>'lessorSigned')::boolean
    OR v_j->'contract'->'lessorSignature' <> 'null'::jsonb
  THEN RAISE EXCEPTION 'Signed contract on the link is wrong: %', v_j->'contract'; END IF;

  -- Owner: regenerating a revoked link gives a working new token.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  v_old := v_tok2;
  v_tok2 := public.rental_create_link(v_t2, 'existing');
  IF (SELECT tenant_name || tenant_user_agent FROM public.rental_contract_texts WHERE id = v_x1) <> 'New Tenant Full' || repeat('U', 500)
  THEN RAISE EXCEPTION 'Signer name or user agent stored wrong'; END IF;

  -- Anonymous, round 3: the existing tenant signs; the hash follows the plan's canonical text.
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_get(%L)', v_old), v_invalid);
  PERFORM public.rental_link_sign(v_tok2, 'Old Tenant', 'esign', v_png_t, 'UA', v_hash1);
  v_j := public.rental_link_get(v_tok2);
  IF v_j->'contract'->>'id' <> v_x2::text OR v_j->'contract'->>'contentHash' <> v_hash1
  THEN RAISE EXCEPTION 'Existing tenant signed the wrong contract or hash: %', v_j->'contract'; END IF;
  IF public.rental_link_get(v_tok1)->'contract'->>'contentHash' <> v_hash2 THEN RAISE EXCEPTION 'Signing X touched Y'; END IF;

  -- Manager (friend). Review Focus 4: signed text is frozen; countersign needs the tenant signature.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  UPDATE public.rental_contract_texts SET body = '["changed"]', special_terms = 'changed' WHERE id = v_x2;
  IF FOUND THEN RAISE EXCEPTION 'A manager edited a signed contract'; END IF;
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET tenant_signature = NULL WHERE id = %L', v_x2), '42501');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET status = %L WHERE id = %L', 'countersigned', v_x2), '42501');
  INSERT INTO public.rental_contract_texts (contract_id, property_id, body, sign_mode)
  VALUES ((SELECT id FROM public.rental_contracts WHERE tenancy_id = v_t3), v_house, '["Gone"]', 'esign') RETURNING id INTO v_x3;
  PERFORM pg_temp.refused(format('SELECT public.rental_countersign(%L)', v_x3), 'The tenant hasn''t signed yet');
  PERFORM public.rental_send_contract(v_x3);
  PERFORM pg_temp.refused(format('SELECT public.rental_countersign(%L)', v_x3), 'The tenant hasn''t signed yet');
  PERFORM pg_temp.refused(format('SELECT public.rental_countersign(%L, %L)', v_x2, 'data:image/gif;base64,AA'), 'Draw your signature again');
  -- The saved signature is the owner's: a manager who isn't the owner draws their own.
  PERFORM pg_temp.refused(format('SELECT public.rental_countersign(%L)', v_x2), 'Draw your signature to countersign');
  PERFORM public.rental_countersign(v_x2, v_png_t);
  IF (SELECT status || lessor_signature || lessor_signed_by FROM public.rental_contract_texts WHERE id = v_x2)
    <> 'countersigned' || v_png_t || v_friend THEN RAISE EXCEPTION 'Countersign did not store the drawn signature'; END IF;
  PERFORM pg_temp.refused(format('SELECT public.rental_countersign(%L)', v_x2), 'This contract is already countersigned');
  PERFORM pg_temp.refused(format('SELECT public.rental_set_notarized_scan(%L, %L)', v_x2, v_house || '/contracts/' || v_x2 || '/s.pdf'),
    'Only contracts signed for notarizing take a scan');
  PERFORM pg_temp.refused(format('SELECT public.rental_set_notarized_scan(%L, %L)', v_x1, v_house || '/contracts/' || v_x2 || '/s.pdf'),
    'The scan must be stored under this contract');
  INSERT INTO storage.objects (bucket_id, name) VALUES ('rental-files', v_house || '/contracts/' || v_x1 || '/s.pdf');
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-files',
    v_house || '/contracts/' || v_x2 || '/s.pdf'), '42501');
  PERFORM public.rental_set_notarized_scan(v_x1, v_house || '/contracts/' || v_x1 || '/s.pdf');
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  PERFORM public.rental_countersign(v_x1);
  IF (SELECT status || lessor_signature || lessor_signed_by FROM public.rental_contract_texts WHERE id = v_x1)
    <> 'countersigned' || v_png_l || v_owner THEN RAISE EXCEPTION 'Owner countersign did not use the saved signature'; END IF;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);

  -- Accept copies the details into the renter row and hands back the ID paths; once only. Managers see the uploads.
  IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'rental-link-uploads' AND name LIKE v_tok1 || '/%') <> 3
  THEN RAISE EXCEPTION 'Manager cannot see the link uploads'; END IF;
  v_j := public.rental_accept_details(v_t1);
  IF v_j <> jsonb_build_object('idPaths', jsonb_build_array(v_id1, v_id2, v_id3)) THEN RAISE EXCEPTION 'Accept returned %', v_j; END IF;
  IF (SELECT row(full_name, phone, address, emergency_name, emergency_phone, facebook, email, occupants)::text
    FROM public.rental_renters WHERE id = '00000000-0000-0000-0000-0000000ad051')
    <> row('New Tenant Full', '0917 000 0000', '12 Street', 'Mom', '0918 111', 'fb.me/nt', 'nt@example.com', 2)::text
  THEN RAISE EXCEPTION 'Accept did not copy the details'; END IF;
  IF (SELECT status FROM public.rental_tenancy_links WHERE tenancy_id = v_t1) <> 'accepted' THEN RAISE EXCEPTION 'Link not accepted'; END IF;
  PERFORM pg_temp.refused(format('SELECT public.rental_accept_details(%L)', v_t1), 'There are no details waiting to be accepted');
  PERFORM public.rental_reopen_link(v_t1);
  IF (SELECT status || coalesce(submitted_at::text, '') FROM public.rental_tenancy_links WHERE tenancy_id = v_t1) <> 'open'
  THEN RAISE EXCEPTION 'Reopen did not reset the link'; END IF;

  -- Even the database owner can't change a signed text, only the scan and lessor fields.
  RESET ROLE;
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET body = %L WHERE id = %L', '["changed"]', v_x2),
    'A signed contract can''t be changed');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET content_hash = %L WHERE id = %L', repeat('0', 64), v_x2),
    'A signed contract can''t be changed');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET tenant_signed_at = NULL, status = %L WHERE id = %L', 'sent', v_x2),
    'A signed contract can''t be changed');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET status = %L WHERE id = %L', 'signed', v_x2),
    'A signed contract can''t be changed');
  UPDATE public.rental_contract_texts SET notarized_scan_path = NULL WHERE id = v_x1;

  -- Anonymous, round 4: the lessor signature shows once countersigned; a reopened link takes a third file, not a fourth.
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  v_j := public.rental_link_get(v_tok2);
  IF NOT (v_j->'contract'->>'lessorSigned')::boolean OR v_j->'contract'->>'lessorSignature' <> v_png_t
  THEN RAISE EXCEPTION 'Countersigned contract hides the lessor signature: %', v_j->'contract'; END IF;
  -- Uploads count from the reopen on (each real upload is its own transaction, hence clock_timestamp here).
  INSERT INTO storage.objects (bucket_id, name, created_at) VALUES ('rental-link-uploads', v_id4, clock_timestamp());
  INSERT INTO storage.objects (bucket_id, name, created_at) VALUES
    ('rental-link-uploads', v_tok1 || '/' || gen_random_uuid() || '.png', clock_timestamp()),
    ('rental-link-uploads', v_tok1 || '/' || gen_random_uuid() || '.png', clock_timestamp());
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name, created_at) VALUES (%L, %L, clock_timestamp())',
    'rental-link-uploads', v_tok1 || '/' || gen_random_uuid() || '.png'), '42501');
  -- Resubmitting without Messenger, email or people count.
  PERFORM public.rental_link_submit_details(v_tok1, (v_details - 'facebook' - 'email' - 'occupants')
    || jsonb_build_object('phone', '0917 999', 'idPaths', jsonb_build_array(v_id4)));

  -- Accepting a resubmission keeps what the tenant left empty.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  v_j := public.rental_accept_details(v_t1);
  IF v_j <> jsonb_build_object('idPaths', jsonb_build_array(v_id4)) THEN RAISE EXCEPTION 'Resubmitted accept returned %', v_j; END IF;
  IF (SELECT row(phone, facebook, email, occupants)::text FROM public.rental_renters WHERE id = '00000000-0000-0000-0000-0000000ad051')
    <> row('0917 999', 'fb.me/nt', 'nt@example.com', 2)::text
  THEN RAISE EXCEPTION 'Accept overwrote details the tenant left empty'; END IF;

  -- Viewer: sees contracts and templates, never links, tokens, uploads or the saved signature; can't act.
  UPDATE public.rental_property_members SET role = 'viewer' WHERE user_id = v_friend::uuid AND property_id = v_house;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  IF EXISTS (SELECT 1 FROM public.rental_tenancy_links) THEN RAISE EXCEPTION 'Viewer can read link tokens'; END IF;
  PERFORM pg_temp.refused(format('SELECT lessor_signature FROM public.rental_properties WHERE id = %L', v_house), '42501');
  PERFORM pg_temp.refused(format('SELECT public.rental_get_lessor_signature(%L)', v_house), '42501');
  IF (SELECT count(*) FROM public.rental_contract_texts WHERE property_id = v_house) <> 3
    OR NOT EXISTS (SELECT 1 FROM public.rental_contract_templates WHERE property_id = v_house)
  THEN RAISE EXCEPTION 'Viewer cannot read contracts or the template'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'rental-link-uploads') THEN RAISE EXCEPTION 'Viewer can read link uploads'; END IF;
  DELETE FROM storage.objects WHERE bucket_id = 'rental-link-uploads';
  PERFORM pg_temp.refused(format('SELECT public.rental_create_link(%L, %L)', v_t1, 'new'), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_accept_details(%L)', v_t1), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_countersign(%L)', v_x2), v_mgr);
  PERFORM pg_temp.refused(format('SELECT public.rental_send_contract(%L)', v_x3), v_mgr);
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_contract_texts (contract_id, property_id, body) VALUES (%L, %L, %L)',
    gen_random_uuid(), v_house, '["x"]'), '42501');
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_contract_templates (property_id, clauses) VALUES (%L, %L)',
    '00000000-0000-0000-0000-0000000ab002', '[{"id":"a","text":"b"}]'), '42501');

  -- Stranger can't read uploads; the owner (a manager) can delete them.
  PERFORM set_config('request.jwt.claim.sub', v_stranger, true);
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'rental-link-uploads') THEN RAISE EXCEPTION 'Stranger can read link uploads'; END IF;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  DELETE FROM storage.objects WHERE bucket_id = 'rental-link-uploads' AND name = v_id3;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN RAISE EXCEPTION 'Owner could not delete a link upload (viewer deleted it?)'; END IF;
END $$;

-- ── Step D: deposit settlement ─────────────────────────────────────────────
-- Owner aa001 owns Settle House (ab061); friend aa002 owns Friend House (ab022) and joins Settle House as a
-- manager, later a viewer; stranger aa003 has nothing.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab061', 'Settle House');
INSERT INTO public.rental_units (id, property_id, name, kind, capacity)
  SELECT ('00000000-0000-0000-0000-0000000ac06' || n)::uuid, '00000000-0000-0000-0000-0000000ab061', 'S' || n, 'room', 1
  FROM generate_series(1, 6) n;
INSERT INTO public.rental_renters (id, property_id, full_name)
  SELECT ('00000000-0000-0000-0000-0000000ad06' || n)::uuid, '00000000-0000-0000-0000-0000000ab061', 'Leaver ' || n
  FROM generate_series(1, 6) n;

DO $$ DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_house uuid := '00000000-0000-0000-0000-0000000ab061'; v_friend_house uuid := '00000000-0000-0000-0000-0000000ab022';
  v_owner text := '00000000-0000-0000-0000-0000000aa001'; v_friend text := '00000000-0000-0000-0000-0000000aa002';
  v_stranger text := '00000000-0000-0000-0000-0000000aa003';
  v_mgr text := 'Only managers can settle deposits'; v_none text := 'No deposit to settle';
  v_lines_msg text := 'Add a label and an amount for each deduction';
  v_rent jsonb := '[{"kind":"rent","label":"Rent","amount":100000}]';
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_t4 uuid; v_t5 uuid; v_t6 uuid; v_void uuid;
  v_s1 uuid; v_s4 uuid; v_s5 uuid; v_s6 uuid; v_p uuid; v_r public.rental_settlements;
  v_settle text := 'SELECT public.rental_settle_deposit(%L, %L::jsonb, %L, %L::date, %L, %L, %L)';
BEGIN
  -- T1: deposit 2,000 + advance 1,000 on the move-in bill (no prorated rent: move-in on the due day).
  v_t1 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac061', '00000000-0000-0000-0000-0000000ad061',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 1, 200000);
  -- T2: move-in bill only part paid. T3: no move-in bill at all. T4–T6: deposit 1,000, paid.
  v_t2 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac062', '00000000-0000-0000-0000-0000000ad062',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 100000);
  v_t3 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac063', '00000000-0000-0000-0000-0000000ad063',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 0);
  v_t4 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac064', '00000000-0000-0000-0000-0000000ad064',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 100000);
  v_t5 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac065', '00000000-0000-0000-0000-0000000ad065',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 100000);
  v_t6 := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac066', '00000000-0000-0000-0000-0000000ad066',
    '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0, 100000);
  PERFORM public.rental_record_payment(v_t1, 300000, v_today, 'cash', '', '');
  PERFORM public.rental_record_payment(v_t2, 50000, v_today, 'cash', '', '');
  PERFORM public.rental_record_payment(v_t4, 100000, v_today, 'cash', '', '');
  PERFORM public.rental_record_payment(v_t5, 100000, v_today, 'cash', '', '');
  PERFORM public.rental_record_payment(v_t6, 100000, v_today, 'cash', '', '');
  -- T1 owes 1,500 on monthly bills (September half paid, October unpaid); a cancelled bill and a voided payment don't count.
  PERFORM public.rental_issue_bill(v_t1, 'monthly', '2026-09', '2026-09-05', v_rent);
  PERFORM public.rental_issue_bill(v_t1, 'monthly', '2026-10', '2026-10-05', v_rent);
  v_p := public.rental_issue_bill(v_t1, 'monthly', '2026-11', '2026-11-05', v_rent);
  UPDATE public.rental_bills SET status = 'void', void_reason = 'x' WHERE id = v_p;
  PERFORM public.rental_record_payment(v_t1, 50000, v_today, 'cash', '', '');
  v_void := public.rental_record_payment(v_t1, 70000, v_today, 'cash', '', '');
  PERFORM public.rental_void_payment(v_void, 'Bounced');

  -- Review Focus 2: not moved out yet, so nothing to settle.
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[]', false, v_today, 'cash', '', ''), v_none);
  UPDATE public.rental_tenancies SET move_out = v_today WHERE id IN (v_t1, v_t2, v_t3, v_t4, v_t5, v_t6);
  -- Move-in bill not fully paid, or no move-in bill: nothing to settle either.
  PERFORM pg_temp.refused(format(v_settle, v_t2, '[]', false, v_today, 'cash', '', ''), v_none);
  PERFORM pg_temp.refused(format(v_settle, v_t3, '[]', false, v_today, 'cash', '', ''), v_none);

  -- Strangers and other-property managers can't settle (same answer for an unknown tenancy).
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[]', false, v_today, 'cash', '', ''), v_mgr);
  PERFORM set_config('request.jwt.claim.sub', v_stranger, true);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[]', false, v_today, 'cash', '', ''), v_mgr);
  PERFORM pg_temp.refused(format(v_settle, gen_random_uuid(), '[]', false, v_today, 'cash', '', ''), v_mgr);
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);

  -- Deduction lines are validated; refund fields are required only when something is refunded.
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[{"label":"  ","amount":100}]', false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[{"label":"Cleaning","amount":0}]', false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[{"label":"Cleaning","amount":-500}]', false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[{"label":"Cleaning","amount":1.5}]', false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[{"label":"Cleaning","amount":"100"}]', false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[{"label":"Cleaning","amount":2000000001}]', false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, jsonb_build_array(jsonb_build_object('label', repeat('x', 81), 'amount', 1)),
    false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, (SELECT jsonb_agg(jsonb_build_object('label', 'L' || n, 'amount', 1))
    FROM generate_series(1, 31) n), false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '{"label":"Cleaning","amount":100}', false, v_today, 'cash', '', ''), v_lines_msg);
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[]', false, v_today + 2, 'cash', '', ''), 'Settlement date is too far ahead');
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[]', false, v_today, NULL, '', ''), 'Pick how the refund was paid');
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[]', false, v_today, 'cheque', '', ''), 'Pick how the refund was paid');

  -- Review Focus 1: deposit and unpaid bills come from SQL. 2,000 − 1,500 unpaid − 100 cleaning = 400 refund.
  v_s1 := public.rental_settle_deposit(v_t1, '[{"label":" Cleaning ","amount":10000,"deposit":9999999}]',
    false, v_today + 1, 'gcash', ' G-1 ', 'Keys returned');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s1;
  IF (v_r.property_id, v_r.tenancy_id, v_r.deposit_centavos, v_r.unpaid_bills_centavos, v_r.refund_centavos, v_r.owed_centavos)
    IS DISTINCT FROM (v_house, v_t1, 200000, 150000, 40000, 0)
  THEN RAISE EXCEPTION 'Settlement figures are wrong: %', row_to_json(v_r); END IF;
  IF v_r.lines <> '[{"label":"Cleaning","amount":10000}]'::jsonb OR v_r.forfeit OR v_r.status <> 'settled'
    OR v_r.refunded_on <> v_today + 1 OR v_r.refund_method <> 'gcash' OR v_r.refund_reference <> 'G-1'
    OR v_r.notes <> 'Keys returned' OR v_r.settled_by <> v_owner::uuid OR v_r.settled_at IS NULL
  THEN RAISE EXCEPTION 'Settlement was stored wrong: %', row_to_json(v_r); END IF;
  -- A second settlement is refused.
  PERFORM pg_temp.refused(format(v_settle, v_t1, '[]', false, v_today, 'cash', '', ''), 'This deposit is already settled');

  -- Over-deduction: refund 0, the tenant still owes the rest; refund fields are not recorded.
  v_s4 := public.rental_settle_deposit(v_t4, '[{"label":"Broken door","amount":150000}]', false, v_today, 'cash', 'X', '');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s4;
  IF (v_r.deposit_centavos, v_r.unpaid_bills_centavos, v_r.refund_centavos, v_r.owed_centavos, v_r.refunded_on, v_r.refund_method, v_r.refund_reference)
    IS DISTINCT FROM (100000, 0, 0, 50000, NULL::date, NULL::text, '')
  THEN RAISE EXCEPTION 'Over-deduction stored wrong: %', row_to_json(v_r); END IF;
  -- Forfeit: refund 0, whatever the lines; a zero refund needs no method or date.
  v_s5 := public.rental_settle_deposit(v_t5, '[]', true, NULL, NULL, NULL, 'Left early');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s5;
  IF (v_r.refund_centavos, v_r.owed_centavos, v_r.forfeit, v_r.refunded_on, v_r.refund_method)
    IS DISTINCT FROM (0, 0, true, NULL::date, NULL::text)
  THEN RAISE EXCEPTION 'Forfeit stored wrong: %', row_to_json(v_r); END IF;

  -- No direct writes on settlements, even for the owner; the invariant also holds in the table.
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_settlements (property_id, tenancy_id, deposit_centavos, '
    'unpaid_bills_centavos, refund_centavos) VALUES (%L, %L, 1, 0, 1)', v_house, v_t6), '42501');
  PERFORM pg_temp.refused(format('UPDATE public.rental_settlements SET refund_centavos = 200000 WHERE id = %L', v_s1), '42501');
  PERFORM pg_temp.refused(format('DELETE FROM public.rental_settlements WHERE id = %L', v_s1), '42501');
  IF has_function_privilege('anon', 'public.rental_settle_deposit(uuid, jsonb, boolean, date, text, text, text)', 'EXECUTE')
  THEN RAISE EXCEPTION 'anon can settle deposits'; END IF;
  RESET ROLE;
  PERFORM pg_temp.refused(format('UPDATE public.rental_settlements SET refund_centavos = 200000 WHERE id = %L', v_s1), '23514');
  PERFORM pg_temp.refused(format('UPDATE public.rental_settlements SET owed_centavos = 1 WHERE id = %L', v_s1), '23514');
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);

  -- Settlement proofs: reserve, upload only to a reserved path, metadata guard, no cross-property rows.
  INSERT INTO public.rental_settlement_proofs (id, settlement_id, property_id, name, mime_type, size)
  VALUES ('00000000-0000-0000-0000-0000000a7061', v_s1, v_house, 'refund.png', 'image/png', 100);
  IF (SELECT storage_path FROM public.rental_settlement_proofs WHERE id = '00000000-0000-0000-0000-0000000a7061')
    <> v_house || '/settlements/' || v_s1 || '/00000000-0000-0000-0000-0000000a7061'
  THEN RAISE EXCEPTION 'Settlement proof storage path is wrong'; END IF;
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('rental-files', v_house || '/settlements/' || v_s1 || '/00000000-0000-0000-0000-0000000a7061');
  PERFORM pg_temp.refused(format('INSERT INTO storage.objects (bucket_id, name) VALUES (%L, %L)', 'rental-files',
    v_house || '/settlements/' || v_s1 || '/00000000-0000-0000-0000-0000000a7999'), '42501');
  UPDATE public.rental_settlement_proofs SET ready = true WHERE id = '00000000-0000-0000-0000-0000000a7061';
  PERFORM pg_temp.refused(format('UPDATE public.rental_settlement_proofs SET name = %L WHERE id = %L', 'x.png',
    '00000000-0000-0000-0000-0000000a7061'), '42501');
  PERFORM pg_temp.refused(format('DELETE FROM public.rental_settlement_proofs WHERE id = %L', '00000000-0000-0000-0000-0000000a7061'),
    'Remove the stored settlement proof before deleting its metadata');
  RESET ROLE;
  PERFORM pg_temp.refused(format('UPDATE public.rental_settlement_proofs SET settlement_id = %L WHERE id = %L', v_s4,
    '00000000-0000-0000-0000-0000000a7061'), 'Settlement proof metadata cannot be reassigned');
  SET LOCAL ROLE authenticated;

  -- Friend joins as a manager: settles T6, but can't file a proof under Friend House or upload into it.
  PERFORM public.rental_add_member(v_house, v_friend::uuid, 'manager');
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  v_s6 := public.rental_settle_deposit(v_t6, '[]', false, v_today, 'bank', '', '');
  IF (SELECT refund_centavos FROM public.rental_settlements WHERE id = v_s6) <> 100000
  THEN RAISE EXCEPTION 'Manager settlement refund is wrong'; END IF;
  IF (SELECT count(*) FROM public.rental_settlement_proofs) <> 1 THEN RAISE EXCEPTION 'Manager cannot read settlement proofs'; END IF;
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_settlement_proofs (settlement_id, property_id, name, mime_type, size) '
    'VALUES (%L, %L, %L, %L, 1)', v_s6, v_friend_house, 'x.png', 'image/png'), '23503');

  -- As a viewer: reads settlements, never proofs; can't settle or reserve.
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  UPDATE public.rental_property_members SET role = 'viewer' WHERE user_id = v_friend::uuid AND property_id = v_house;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  IF (SELECT count(*) FROM public.rental_settlements WHERE property_id = v_house) <> 4
  THEN RAISE EXCEPTION 'Viewer cannot read settlements'; END IF;
  IF EXISTS (SELECT 1 FROM public.rental_settlement_proofs) THEN RAISE EXCEPTION 'Viewer can read settlement proofs'; END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'rental-files' AND name LIKE v_house || '/%')
  THEN RAISE EXCEPTION 'Viewer can read settlement proof files'; END IF;
  PERFORM pg_temp.refused(format(v_settle, v_t2, '[]', false, v_today, 'cash', '', ''), v_mgr);
  PERFORM pg_temp.refused(format('INSERT INTO public.rental_settlement_proofs (settlement_id, property_id, name, mime_type, size) '
    'VALUES (%L, %L, %L, %L, 1)', v_s1, v_house, 'x.png', 'image/png'), '42501');

  -- As a stranger: sees nothing.
  PERFORM set_config('request.jwt.claim.sub', v_stranger, true);
  IF EXISTS (SELECT 1 FROM public.rental_settlements) OR EXISTS (SELECT 1 FROM public.rental_settlement_proofs)
  THEN RAISE EXCEPTION 'A stranger can read settlements'; END IF;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
END $$;

-- Step D review fixes: bills taken from the deposit become paid, tenant credit counts, the move-in side freezes.
INSERT INTO public.rental_units (id, property_id, name, kind, capacity)
  SELECT ('00000000-0000-0000-0000-0000000ac07' || n)::uuid, '00000000-0000-0000-0000-0000000ab061', 'R' || n, 'room', 1
  FROM generate_series(1, 6) n;
INSERT INTO public.rental_renters (id, property_id, full_name)
  SELECT ('00000000-0000-0000-0000-0000000ad07' || n)::uuid, '00000000-0000-0000-0000-0000000ab061', 'Mover ' || n
  FROM generate_series(1, 6) n;
CREATE FUNCTION pg_temp.balance(p_bill uuid) RETURNS bigint LANGUAGE sql AS $$
  SELECT public.rental_bill_total(b.lines) - coalesce((SELECT sum(a.amount_centavos) FROM public.rental_payment_allocations a
    JOIN public.rental_payments p ON p.id = a.payment_id WHERE a.bill_id = b.id AND p.status = 'active'), 0)
  FROM public.rental_bills b WHERE b.id = p_bill
$$;
CREATE FUNCTION pg_temp.owed(p_tenancy uuid) RETURNS bigint LANGUAGE sql AS $$
  SELECT coalesce(sum(greatest(pg_temp.balance(b.id), 0)), 0) FROM public.rental_bills b
  WHERE b.tenancy_id = p_tenancy AND b.status = 'issued'
$$;

DO $$ DECLARE
  v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_t uuid[] := '{}'; v_b uuid[] := '{}'; v_s uuid; v_r public.rental_settlements; v_p public.rental_payments;
  v_move_in uuid; v_later uuid; v_later_pay uuid; v_n integer;
  v_final text := '[{"kind":"other","label":"Final bill","amount":%s}]';
  v_frozen_pay text := 'This deposit is already settled, so its payments can''t be voided';
  v_frozen_bill text := 'This deposit is already settled, so the move-in bill can''t change';
BEGIN
  -- R1–R3: deposit 5,000 / 1,000 / 5,000 paid, then a final bill of 1,200 / 1,500 / 1,200 left unpaid.
  -- R4–R6: deposit 1,000 paid with 1,300, so 300 sits as credit.
  FOR n IN 1..6 LOOP
    v_t := v_t || public.rental_start_tenancy(('00000000-0000-0000-0000-0000000ac07' || n)::uuid,
      ('00000000-0000-0000-0000-0000000ad07' || n)::uuid, '2026-08-05', '2026-08-05', '2027-08-05', 100000, 5, 0,
      CASE WHEN n IN (1, 3) THEN 500000 ELSE 100000 END);
    PERFORM public.rental_record_payment(v_t[n], CASE WHEN n IN (1, 3) THEN 500000 WHEN n = 2 THEN 100000 ELSE 130000 END,
      v_today, 'cash', '', '');
    IF n <= 3 THEN
      v_b := v_b || public.rental_issue_bill(v_t[n], 'final', '2026-10', v_today,
        format(v_final, CASE WHEN n = 2 THEN 150000 ELSE 120000 END)::jsonb);
    END IF;
  END LOOP;
  UPDATE public.rental_tenancies SET move_out = v_today WHERE id = ANY (v_t);

  -- Unpaid 1,200 from a 5,000 deposit: the final bill is paid from the deposit, nothing is owed, 3,800 comes back.
  v_s := public.rental_settle_deposit(v_t[1], '[]', false, v_today, 'cash', '', '');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s;
  IF (v_r.deposit_centavos, v_r.unpaid_bills_centavos, v_r.credit_centavos, v_r.refund_centavos, v_r.owed_centavos)
    IS DISTINCT FROM (500000, 120000, 0, 380000, 0) THEN RAISE EXCEPTION 'Unpaid-bill settlement is wrong: %', row_to_json(v_r); END IF;
  IF pg_temp.balance(v_b[1]) <> 0 OR pg_temp.owed(v_t[1]) <> 0 THEN RAISE EXCEPTION 'The final bill was not paid from the deposit'; END IF;
  SELECT * INTO v_p FROM public.rental_payments WHERE tenancy_id = v_t[1] AND notes = 'Taken from the deposit';
  IF (v_p.amount_centavos, v_p.method, v_p.paid_on, v_p.status) IS DISTINCT FROM (120000, 'other', v_today, 'active')
    OR jsonb_array_length(v_p.receipt->'applied') <> 1 OR (v_p.receipt->>'balanceCentavos')::bigint <> 0
    OR NOT EXISTS (SELECT 1 FROM public.rental_payment_allocations WHERE payment_id = v_p.id AND bill_id = v_b[1] AND pinned)
  THEN RAISE EXCEPTION 'Deposit payment is wrong: %', row_to_json(v_p); END IF;

  -- Over-deduction: the deposit pays 1,000 of the 1,500 bill; exactly 500 stays open and owed.
  v_s := public.rental_settle_deposit(v_t[2], '[]', false, NULL, NULL, NULL, '');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s;
  IF (v_r.refund_centavos, v_r.owed_centavos) IS DISTINCT FROM (0, 50000) OR pg_temp.balance(v_b[2]) <> 50000
    OR pg_temp.owed(v_t[2]) <> 50000 THEN RAISE EXCEPTION 'Over-deduction left the wrong amount open: %', row_to_json(v_r); END IF;

  -- Forfeit still pays the bills from the deposit.
  v_s := public.rental_settle_deposit(v_t[3], '[]', true, NULL, NULL, NULL, '');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s;
  IF (v_r.refund_centavos, v_r.owed_centavos) IS DISTINCT FROM (0, 0) OR pg_temp.balance(v_b[3]) <> 0
  THEN RAISE EXCEPTION 'Forfeit did not settle the bills: %', row_to_json(v_r); END IF;

  -- Credit adds to the refund: 1,000 deposit + 300 credit.
  v_s := public.rental_settle_deposit(v_t[4], '[]', false, v_today, 'cash', '', '');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s;
  IF (v_r.credit_centavos, v_r.refund_centavos, v_r.owed_centavos) IS DISTINCT FROM (30000, 130000, 0)
  THEN RAISE EXCEPTION 'Credit did not add to the refund: %', row_to_json(v_r); END IF;
  -- Credit offsets deductions: 1,000 + 300 − 1,200 = 100 back.
  v_s := public.rental_settle_deposit(v_t[5], '[{"label":"Damage","amount":120000}]', false, v_today, 'cash', '', '');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s;
  IF (v_r.credit_centavos, v_r.refund_centavos, v_r.owed_centavos) IS DISTINCT FROM (30000, 10000, 0)
  THEN RAISE EXCEPTION 'Credit did not offset deductions: %', row_to_json(v_r); END IF;
  -- Forfeit keeps the deposit but returns the credit less what the deductions exceed it by: 300 − 100 = 200.
  v_s := public.rental_settle_deposit(v_t[6], '[{"label":"Damage","amount":110000}]', true, v_today, 'cash', '', '');
  SELECT * INTO v_r FROM public.rental_settlements WHERE id = v_s;
  IF (v_r.credit_centavos, v_r.refund_centavos, v_r.owed_centavos) IS DISTINCT FROM (30000, 20000, 0)
  THEN RAISE EXCEPTION 'Forfeit with credit is wrong: %', row_to_json(v_r); END IF;

  -- Once settled, the move-in side is frozen: no voiding its payments, no changing or cancelling the move-in bill.
  FOR v_p IN SELECT * FROM public.rental_payments WHERE tenancy_id = v_t[1] LOOP
    PERFORM pg_temp.refused(format('SELECT public.rental_void_payment(%L, %L)', v_p.id, 'Oops'), v_frozen_pay);
  END LOOP;
  SELECT id INTO v_move_in FROM public.rental_bills WHERE tenancy_id = v_t[1] AND kind = 'move_in';
  PERFORM pg_temp.refused(format('UPDATE public.rental_bills SET lines = %L WHERE id = %L',
    '[{"kind":"deposit","label":"Deposit","amount":100}]', v_move_in), v_frozen_bill);
  PERFORM pg_temp.refused(format('UPDATE public.rental_bills SET status = %L, void_reason = %L WHERE id = %L', 'void', 'x', v_move_in),
    v_frozen_bill);
  -- A later final bill still issues, takes a payment, can be edited, and that payment can be voided.
  v_later := public.rental_issue_bill(v_t[1], 'final', '2026-11', v_today, format(v_final, 20000)::jsonb);
  v_later_pay := public.rental_record_payment(v_t[1], 20000, v_today, 'cash', '', '', v_later);
  IF pg_temp.balance(v_later) <> 0 THEN RAISE EXCEPTION 'Later final bill was not paid'; END IF;
  UPDATE public.rental_bills SET due_on = v_today + 3 WHERE id = v_later;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n <> 1 THEN RAISE EXCEPTION 'Later final bill could not be edited'; END IF;
  PERFORM public.rental_void_payment(v_later_pay, 'Wrong amount');

  -- The table re-asserts the credit formulas.
  RESET ROLE;
  PERFORM pg_temp.refused(format('UPDATE public.rental_settlements SET credit_centavos = 1 WHERE id = %L', v_s), '23514');
  SET LOCAL ROLE authenticated;
END $$;
-- ── Step E: landlord-chosen sign mode ──────────────────────────────────────
-- Owner aa001 owns Sign House (ab081); friend aa002 joins it as a manager, later a viewer.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa001', true);
INSERT INTO public.rental_properties (id, name) VALUES ('00000000-0000-0000-0000-0000000ab081', 'Sign House');
INSERT INTO public.rental_units (id, property_id, name, kind, capacity)
  SELECT ('00000000-0000-0000-0000-0000000ac08' || n)::uuid, '00000000-0000-0000-0000-0000000ab081', 'S' || n, 'room', 1
  FROM generate_series(1, 3) n;
INSERT INTO public.rental_renters (id, property_id, full_name)
  SELECT ('00000000-0000-0000-0000-0000000ad08' || n)::uuid, '00000000-0000-0000-0000-0000000ab081', 'Signer ' || n
  FROM generate_series(1, 3) n;
SELECT public.rental_add_member('00000000-0000-0000-0000-0000000ab081', '00000000-0000-0000-0000-0000000aa002', 'manager');

DO $$ DECLARE
  v_house uuid := '00000000-0000-0000-0000-0000000ab081';
  v_owner text := '00000000-0000-0000-0000-0000000aa001'; v_friend text := '00000000-0000-0000-0000-0000000aa002';
  v_png text := 'data:image/png;base64,iVBORw0KGgoUEVORA';
  v_frozen text := 'The sign mode can''t be changed after the contract is sent';
  v_stale text := 'The contract changed. Reload the page to read the latest version';
  v_ta uuid; v_tc uuid; v_td uuid; v_xa uuid; v_xc uuid; v_xd uuid; v_toka text; v_tokc text; v_ha text; v_hc text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  v_ta := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac081', '00000000-0000-0000-0000-0000000ad081',
    '2026-11-10', '2026-11-10', '2027-11-10', 500000, 1, 1, 500000);
  v_tc := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac082', '00000000-0000-0000-0000-0000000ad082',
    '2026-11-10', '2026-11-10', '2027-11-10', 500000, 1, 1, 500000);

  -- Required to send; managers set and change it while the text is a draft.
  INSERT INTO public.rental_contract_texts (contract_id, property_id, body)
  VALUES ((SELECT id FROM public.rental_contracts WHERE tenancy_id = v_ta), v_house, '["Sign A"]') RETURNING id INTO v_xa;
  PERFORM pg_temp.refused(format('SELECT public.rental_send_contract(%L)', v_xa), 'Choose how the contract is signed');
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET sign_mode = %L WHERE id = %L', 'wet', v_xa), '23514');
  UPDATE public.rental_contract_texts SET sign_mode = 'notarize' WHERE id = v_xa;
  IF NOT FOUND THEN RAISE EXCEPTION 'A manager could not set the sign mode on a draft'; END IF;
  UPDATE public.rental_contract_texts SET sign_mode = 'esign' WHERE id = v_xa;
  IF NOT FOUND THEN RAISE EXCEPTION 'A manager could not change the sign mode on a draft'; END IF;
  PERFORM public.rental_send_contract(v_xa);

  -- Sent: frozen for managers and everyone else; the text itself can still be edited.
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET sign_mode = %L WHERE id = %L', 'notarize', v_xa), v_frozen);
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET sign_mode = NULL WHERE id = %L', v_xa), v_frozen);
  RESET ROLE;
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET sign_mode = %L WHERE id = %L', 'notarize', v_xa), v_frozen);
  SET LOCAL ROLE authenticated;
  UPDATE public.rental_contract_texts SET special_terms = 'Edited' WHERE id = v_xa;
  IF NOT FOUND THEN RAISE EXCEPTION 'A sent contract could not be edited'; END IF;
  v_toka := public.rental_create_link(v_ta, 'existing');

  -- Tenant: a page showing another mode is stale; the stored mode is used with the page's mode or none.
  RESET ROLE;
  v_ha := public.rental_contract_hash('["Sign A"]', 'Edited');
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  IF public.rental_link_get(v_toka)->'contract'->>'signMode' <> 'esign' THEN RAISE EXCEPTION 'Link page shows the wrong mode'; END IF;
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L, %L)', v_toka, 'A', 'notarize', v_png, 'UA', v_ha), v_stale);
  PERFORM public.rental_link_sign(v_toka, 'Signer One', 'esign', v_png, 'UA', v_ha);
  IF public.rental_link_get(v_toka)->'contract'->>'signMode' <> 'esign' THEN RAISE EXCEPTION 'Signing changed the stored mode'; END IF;

  -- Signed: still frozen (RLS hides it from managers; the guard stops everyone else).
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  UPDATE public.rental_contract_texts SET sign_mode = 'notarize' WHERE id = v_xa;
  IF FOUND THEN RAISE EXCEPTION 'A manager changed the sign mode after the tenant signed'; END IF;
  RESET ROLE;
  PERFORM pg_temp.refused(format('UPDATE public.rental_contract_texts SET sign_mode = %L WHERE id = %L', 'notarize', v_xa),
    'A signed contract can''t be changed');
  SET LOCAL ROLE authenticated;
  PERFORM public.rental_countersign(v_xa, v_png);

  -- Legacy texts sent without a mode (status set directly here) take the tenant's choice, validated as before.
  INSERT INTO public.rental_contract_texts (contract_id, property_id, body)
  VALUES ((SELECT id FROM public.rental_contracts WHERE tenancy_id = v_tc), v_house, '["Legacy C"]') RETURNING id INTO v_xc;
  v_tokc := public.rental_create_link(v_tc, 'existing');
  RESET ROLE;
  UPDATE public.rental_contract_texts SET status = 'sent' WHERE id = v_xc;
  v_hc := public.rental_contract_hash('["Legacy C"]', '');
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, %L, %L, %L, %L)', v_tokc, 'C', 'wet', v_png, 'UA', v_hc),
    'Choose how to sign');
  PERFORM pg_temp.refused(format('SELECT public.rental_link_sign(%L, %L, NULL, %L, %L, %L)', v_tokc, 'C', v_png, 'UA', v_hc),
    'Choose how to sign');
  PERFORM public.rental_link_sign(v_tokc, 'C', 'notarize', v_png, 'UA', v_hc);
  IF public.rental_link_get(v_tokc)->'contract'->>'signMode' <> 'notarize' THEN RAISE EXCEPTION 'Legacy fallback did not store the tenant''s mode'; END IF;

  -- Viewer: can't set the sign mode.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  v_td := public.rental_start_tenancy('00000000-0000-0000-0000-0000000ac083', '00000000-0000-0000-0000-0000000ad083',
    '2026-11-10', '2026-11-10', '2027-11-10', 500000, 1, 1, 500000);
  INSERT INTO public.rental_contract_texts (contract_id, property_id, body)
  VALUES ((SELECT id FROM public.rental_contracts WHERE tenancy_id = v_td), v_house, '["Draft D"]') RETURNING id INTO v_xd;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  UPDATE public.rental_property_members SET role = 'viewer' WHERE user_id = v_friend::uuid AND property_id = v_house;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  UPDATE public.rental_contract_texts SET sign_mode = 'esign' WHERE id = v_xd;
  IF FOUND THEN RAISE EXCEPTION 'A viewer set a sign mode'; END IF;
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
END $$;
-- ── Contract not needed: managers dismiss the contract nudge, viewers and strangers can't ───────────────
-- Sign House (ab081) from Step E: friend aa002 is a viewer there now.
SET LOCAL ROLE authenticated;
DO $$ DECLARE
  v_house uuid := '00000000-0000-0000-0000-0000000ab081';
  v_owner text := '00000000-0000-0000-0000-0000000aa001'; v_friend text := '00000000-0000-0000-0000-0000000aa002';
  v_stranger text := '00000000-0000-0000-0000-0000000aa003';
  v_t uuid := (SELECT id FROM public.rental_tenancies WHERE renter_id = '00000000-0000-0000-0000-0000000ad081');
BEGIN
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  IF (SELECT contract_not_needed FROM public.rental_tenancies WHERE id = v_t) THEN RAISE EXCEPTION 'contract_not_needed defaults to true'; END IF;

  -- A manager (not the owner) sets and unsets it.
  UPDATE public.rental_property_members SET role = 'manager' WHERE user_id = v_friend::uuid AND property_id = v_house;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  UPDATE public.rental_tenancies SET contract_not_needed = true WHERE id = v_t;
  IF NOT FOUND THEN RAISE EXCEPTION 'A manager could not mark the contract not needed'; END IF;
  UPDATE public.rental_tenancies SET contract_not_needed = false WHERE id = v_t;
  IF NOT FOUND THEN RAISE EXCEPTION 'A manager could not undo contract not needed'; END IF;

  -- A viewer and a stranger can't.
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  UPDATE public.rental_property_members SET role = 'viewer' WHERE user_id = v_friend::uuid AND property_id = v_house;
  PERFORM set_config('request.jwt.claim.sub', v_friend, true);
  UPDATE public.rental_tenancies SET contract_not_needed = true WHERE id = v_t;
  IF FOUND THEN RAISE EXCEPTION 'A viewer marked the contract not needed'; END IF;
  PERFORM set_config('request.jwt.claim.sub', v_stranger, true);
  UPDATE public.rental_tenancies SET contract_not_needed = true WHERE id = v_t;
  IF FOUND THEN RAISE EXCEPTION 'A stranger marked the contract not needed'; END IF;

  -- The owner can; NULL is refused.
  PERFORM set_config('request.jwt.claim.sub', v_owner, true);
  UPDATE public.rental_tenancies SET contract_not_needed = true WHERE id = v_t;
  IF NOT FOUND THEN RAISE EXCEPTION 'The owner could not mark the contract not needed'; END IF;
  PERFORM pg_temp.refused(format('UPDATE public.rental_tenancies SET contract_not_needed = NULL WHERE id = %L', v_t), '23502');
  IF NOT (SELECT contract_not_needed FROM public.rental_tenancies WHERE id = v_t) THEN RAISE EXCEPTION 'contract_not_needed was not kept'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'rental-files') THEN RAISE EXCEPTION 'Rental bucket is public'; END IF;
END $$;
ROLLBACK;
