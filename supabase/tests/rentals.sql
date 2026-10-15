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

RESET ROLE;
DO $$ BEGIN
  IF (SELECT public FROM storage.buckets WHERE id = 'rental-files') THEN RAISE EXCEPTION 'Rental bucket is public'; END IF;
END $$;
ROLLBACK;
