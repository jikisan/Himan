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

RESET ROLE;
DO $$ BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'rental-files') THEN RAISE EXCEPTION 'Rental bucket is public'; END IF;
END $$;
ROLLBACK;
