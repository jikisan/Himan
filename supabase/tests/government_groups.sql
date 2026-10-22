-- Run after the government_groups migration. Fixtures and assertions are rolled back.
BEGIN;
INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000a0001', 'groups-owner@example.com'),
  ('00000000-0000-0000-0000-0000000a0002', 'groups-other@example.com');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000a0001', true);

-- A record saved without a group lands in Personal; defaults are created on demand.
INSERT INTO public.government_records (id, user_id, agency, label, registered_name)
VALUES ('00000000-0000-0000-0000-0000000a0101', auth.uid(), 'SSS', 'No group', 'Test Person');
SELECT public.government_ensure_groups();
SELECT public.government_ensure_groups();
DO $$ BEGIN
  IF (SELECT count(*) FROM public.government_groups) <> 2 THEN RAISE EXCEPTION 'Defaults duplicated or missing'; END IF;
  IF (SELECT g.kind FROM public.government_records r JOIN public.government_groups g ON g.id = r.group_id) <> 'personal' THEN
    RAISE EXCEPTION 'Record did not default to Personal'; END IF;
END $$;

INSERT INTO public.government_groups (id, user_id, name) VALUES
  ('00000000-0000-0000-0000-0000000a0201', auth.uid(), 'Family');
UPDATE public.government_records SET group_id = '00000000-0000-0000-0000-0000000a0201';
DO $$ BEGIN
  BEGIN
    INSERT INTO public.government_groups (user_id, name) VALUES (auth.uid(), ' family ');
    RAISE EXCEPTION 'Duplicate group name was allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    INSERT INTO public.government_groups (user_id, name, kind) VALUES (auth.uid(), 'Work', 'business');
    RAISE EXCEPTION 'Second Business group was allowed';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  BEGIN
    DELETE FROM public.government_groups WHERE id = '00000000-0000-0000-0000-0000000a0201';
    RAISE EXCEPTION 'Group with records deleted directly';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  -- Default groups cannot be renamed or deleted.
  UPDATE public.government_groups SET name = 'Renamed' WHERE kind = 'personal';
  IF EXISTS (SELECT 1 FROM public.government_groups WHERE name = 'Renamed') THEN RAISE EXCEPTION 'Default group renamed'; END IF;
  DELETE FROM public.government_groups WHERE kind <> 'custom';
  IF (SELECT count(*) FROM public.government_groups WHERE kind <> 'custom') <> 2 THEN RAISE EXCEPTION 'Default group deleted'; END IF;
  BEGIN
    PERFORM public.government_delete_group((SELECT id FROM public.government_groups WHERE kind = 'personal'));
    RAISE EXCEPTION 'Personal deletion allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Group not found or cannot be deleted' THEN RAISE; END IF;
  END;
END $$;

-- Another account sees nothing and cannot file into or delete the owner's group.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000a0002', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.government_groups) THEN RAISE EXCEPTION 'Groups leaked across users'; END IF;
  BEGIN
    INSERT INTO public.government_records (user_id, agency, label, registered_name, group_id)
    VALUES (auth.uid(), 'SSS', 'x', 'x', '00000000-0000-0000-0000-0000000a0201');
    RAISE EXCEPTION 'Cross-user group link allowed';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  BEGIN
    PERFORM public.government_delete_group('00000000-0000-0000-0000-0000000a0201');
    RAISE EXCEPTION 'Cross-user group deletion allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Group not found or cannot be deleted' THEN RAISE; END IF;
  END;
END $$;

-- Deleting a custom group moves its records to Personal.
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000a0001', true);
SELECT public.government_delete_group('00000000-0000-0000-0000-0000000a0201');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.government_groups WHERE kind = 'custom') THEN RAISE EXCEPTION 'Group not deleted'; END IF;
  IF (SELECT g.kind FROM public.government_records r JOIN public.government_groups g ON g.id = r.group_id) <> 'personal' THEN
    RAISE EXCEPTION 'Records were not moved to Personal'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
