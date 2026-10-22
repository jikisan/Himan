-- Government groups: every user has Personal and Business, plus any custom groups.
CREATE TABLE public.government_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  kind text NOT NULL DEFAULT 'custom' CHECK (kind IN ('personal', 'business', 'custom')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);
-- One Personal and one Business per user; custom names cannot repeat.
CREATE UNIQUE INDEX government_groups_default_kind_idx ON public.government_groups(user_id, kind) WHERE kind <> 'custom';
CREATE UNIQUE INDEX government_groups_name_idx ON public.government_groups(user_id, lower(btrim(name)));

ALTER TABLE public.government_groups ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.government_groups TO authenticated;
GRANT UPDATE (name) ON public.government_groups TO authenticated;

CREATE POLICY "Owners read government groups" ON public.government_groups
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners add government groups" ON public.government_groups
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Owners rename custom government groups" ON public.government_groups
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id AND kind = 'custom')
  WITH CHECK ((SELECT auth.uid()) = user_id AND kind = 'custom');
CREATE POLICY "Owners delete custom government groups" ON public.government_groups
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id AND kind = 'custom');

-- Creates the two default groups for the caller; safe to call repeatedly.
CREATE FUNCTION public.government_ensure_groups()
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  INSERT INTO public.government_groups (user_id, name, kind)
  SELECT (SELECT auth.uid()), v.name, v.kind FROM (VALUES ('Personal', 'personal'), ('Business', 'business')) AS v(name, kind)
  WHERE (SELECT auth.uid()) IS NOT NULL
  ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.government_ensure_groups() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.government_ensure_groups() TO authenticated;

-- Backfill: defaults for every user who has records, and every record lands in Personal.
INSERT INTO public.government_groups (user_id, name, kind)
SELECT u.user_id, v.name, v.kind
FROM (SELECT DISTINCT user_id FROM public.government_records) u
CROSS JOIN (VALUES ('Personal', 'personal'), ('Business', 'business')) AS v(name, kind);

ALTER TABLE public.government_records ADD COLUMN group_id uuid;
UPDATE public.government_records r SET group_id = g.id
FROM public.government_groups g WHERE g.user_id = r.user_id AND g.kind = 'personal';
ALTER TABLE public.government_records ALTER COLUMN group_id SET NOT NULL;
ALTER TABLE public.government_records ADD FOREIGN KEY (group_id, user_id)
  REFERENCES public.government_groups(id, user_id) ON DELETE RESTRICT;
CREATE INDEX government_records_group_id_idx ON public.government_records(group_id, user_id);

-- New records without a group land in Personal.
CREATE FUNCTION public.government_default_group() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NEW.group_id IS NULL THEN
    INSERT INTO public.government_groups (user_id, name, kind) VALUES (NEW.user_id, 'Personal', 'personal')
    ON CONFLICT DO NOTHING;
    SELECT id INTO NEW.group_id FROM public.government_groups WHERE user_id = NEW.user_id AND kind = 'personal';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER government_records_default_group BEFORE INSERT ON public.government_records
  FOR EACH ROW EXECUTE FUNCTION public.government_default_group();

-- Deleting a group moves its records to Personal first, in one transaction.
CREATE FUNCTION public.government_delete_group(p_group_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE personal_id uuid;
BEGIN
  PERFORM public.government_ensure_groups();
  SELECT id INTO personal_id FROM public.government_groups WHERE user_id = (SELECT auth.uid()) AND kind = 'personal';
  PERFORM 1 FROM public.government_groups WHERE id = p_group_id AND user_id = (SELECT auth.uid()) AND kind = 'custom' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Group not found or cannot be deleted'; END IF;
  UPDATE public.government_records SET group_id = personal_id, updated_at = now()
  WHERE group_id = p_group_id AND user_id = (SELECT auth.uid());
  DELETE FROM public.government_groups WHERE id = p_group_id AND user_id = (SELECT auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.government_delete_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.government_delete_group(uuid) TO authenticated;
