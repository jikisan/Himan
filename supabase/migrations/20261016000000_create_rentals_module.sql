-- Rentals: landlord-side rent management. Access is per property through
-- rental_property_members; every policy calls rental_has_role (SECURITY DEFINER)
-- so policies never query the members table directly and cannot recurse.

CREATE FUNCTION public.rental_role_rank(p_role text) RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT array_position(ARRAY['viewer', 'manager', 'owner'], p_role)
$$;

CREATE TABLE public.rental_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 300),
  owner_name text NOT NULL DEFAULT '' CHECK (char_length(owner_name) <= 160),
  owner_address text NOT NULL DEFAULT '' CHECK (char_length(owner_address) <= 300),
  lessor_name text NOT NULL DEFAULT '' CHECK (char_length(lessor_name) <= 160),
  lessor_civil_status text NOT NULL DEFAULT '' CHECK (char_length(lessor_civil_status) <= 40),
  lessor_address text NOT NULL DEFAULT '' CHECK (char_length(lessor_address) <= 300),
  lessor_capacity text NOT NULL DEFAULT 'owner' CHECK (lessor_capacity IN ('owner', 'representative')),
  signing_city text NOT NULL DEFAULT '' CHECK (char_length(signing_city) <= 120),
  invoice_prefix text NOT NULL DEFAULT 'INV' CHECK (invoice_prefix ~ '^[A-Z0-9]{1,10}$'),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rental_property_members (
  property_id uuid NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, user_id)
);
CREATE UNIQUE INDEX rental_property_members_one_owner ON public.rental_property_members(property_id) WHERE role = 'owner';
CREATE INDEX rental_property_members_user_id_idx ON public.rental_property_members(user_id);

CREATE FUNCTION public.rental_has_role(p_property_id uuid, p_min_role text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rental_property_members m
    WHERE m.property_id = p_property_id AND m.user_id = (SELECT auth.uid())
      AND public.rental_role_rank(m.role) >= public.rental_role_rank(p_min_role)
  )
$$;

-- Storage object names are text; never cast a foreign path segment to uuid.
CREATE FUNCTION public.rental_has_role_text(p_property_id text, p_min_role text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN p_property_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN public.rental_has_role(p_property_id::uuid, p_min_role) ELSE false END
$$;

CREATE TABLE public.rental_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  kind text NOT NULL CHECK (kind IN ('whole', 'room', 'bedspace')),
  capacity integer NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 50),
  electric_mode text NOT NULL DEFAULT 'none' CHECK (electric_mode IN ('none', 'submeter', 'fixed')),
  electric_amount_centavos integer NOT NULL DEFAULT 0 CHECK (electric_amount_centavos BETWEEN 0 AND 2000000000),
  water_mode text NOT NULL DEFAULT 'none' CHECK (water_mode IN ('none', 'submeter', 'fixed')),
  water_amount_centavos integer NOT NULL DEFAULT 0 CHECK (water_amount_centavos BETWEEN 0 AND 2000000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id),
  UNIQUE (property_id, name),
  CHECK (kind = 'bedspace' OR capacity = 1),
  CHECK ((electric_mode = 'none') = (electric_amount_centavos = 0)),
  CHECK ((water_mode = 'none') = (water_amount_centavos = 0))
);

CREATE TABLE public.rental_renters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 160),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 40),
  facebook text NOT NULL DEFAULT '' CHECK (char_length(facebook) <= 200),
  email text NOT NULL DEFAULT '' CHECK (char_length(email) <= 200),
  address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 300),
  emergency_name text NOT NULL DEFAULT '' CHECK (char_length(emergency_name) <= 160),
  emergency_phone text NOT NULL DEFAULT '' CHECK (char_length(emergency_phone) <= 40),
  occupants integer NOT NULL DEFAULT 1 CHECK (occupants BETWEEN 1 AND 50),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id)
);
CREATE INDEX rental_renters_property_id_idx ON public.rental_renters(property_id);

CREATE TABLE public.rental_renter_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id uuid NOT NULL,
  property_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 255),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size integer NOT NULL CHECK (size BETWEEN 1 AND 10485760),
  storage_path text GENERATED ALWAYS AS
    (property_id::text || '/renters/' || renter_id::text || '/' || id::text) STORED UNIQUE,
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (renter_id, property_id) REFERENCES public.rental_renters(id, property_id) ON DELETE CASCADE
);
CREATE INDEX rental_renter_files_renter_idx ON public.rental_renter_files(renter_id, property_id);

CREATE TABLE public.rental_tenancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.rental_properties(id) ON DELETE RESTRICT,
  unit_id uuid NOT NULL,
  renter_id uuid NOT NULL,
  move_in date NOT NULL,
  move_out date,
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, property_id),
  CHECK (move_out IS NULL OR move_out >= move_in),
  FOREIGN KEY (unit_id, property_id) REFERENCES public.rental_units(id, property_id) ON DELETE RESTRICT,
  FOREIGN KEY (renter_id, property_id) REFERENCES public.rental_renters(id, property_id) ON DELETE RESTRICT
);
CREATE INDEX rental_tenancies_unit_active_idx ON public.rental_tenancies(unit_id) WHERE move_out IS NULL;
CREATE UNIQUE INDEX rental_tenancies_one_active_per_renter_unit
  ON public.rental_tenancies(unit_id, renter_id) WHERE move_out IS NULL;

CREATE TABLE public.rental_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenancy_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_rent_centavos integer NOT NULL CHECK (monthly_rent_centavos BETWEEN 1 AND 2000000000),
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  advance_months integer NOT NULL DEFAULT 1 CHECK (advance_months BETWEEN 0 AND 12),
  deposit_centavos integer NOT NULL DEFAULT 0 CHECK (deposit_centavos BETWEEN 0 AND 2000000000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date),
  FOREIGN KEY (tenancy_id, property_id) REFERENCES public.rental_tenancies(id, property_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX rental_contracts_one_active ON public.rental_contracts(tenancy_id) WHERE status = 'active';

-- ── Triggers ────────────────────────────────────────────────────────────────

-- Lessor defaults come from the creator's profile; created_by never changes.
CREATE FUNCTION public.rental_property_defaults() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.created_by <> OLD.created_by THEN RAISE EXCEPTION 'Property creator cannot be changed'; END IF;
    RETURN NEW;
  END IF;
  IF NEW.lessor_name = '' THEN
    NEW.lessor_name := coalesce((SELECT p.full_name FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())), '');
  END IF;
  IF NEW.lessor_address = '' THEN
    NEW.lessor_address := coalesce((SELECT p.location FROM public.profiles p WHERE p.user_id = (SELECT auth.uid())), '');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_property_defaults BEFORE INSERT OR UPDATE ON public.rental_properties
  FOR EACH ROW EXECUTE FUNCTION public.rental_property_defaults();

CREATE FUNCTION public.rental_property_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.rental_property_members (property_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_property_owner AFTER INSERT ON public.rental_properties
  FOR EACH ROW EXECUTE FUNCTION public.rental_property_owner();

-- ponytail: "active" = move_out IS NULL. A planned future move-out stops counting
-- as soon as it is recorded; date-overlap occupancy is not modelled.
CREATE FUNCTION public.rental_tenancy_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_capacity integer; v_active integer;
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.property_id, NEW.unit_id, NEW.renter_id)
    IS DISTINCT FROM (OLD.property_id, OLD.unit_id, OLD.renter_id) THEN
    RAISE EXCEPTION 'Tenancy unit and renter cannot be changed';
  END IF;
  IF NEW.move_out IS NOT NULL THEN RETURN NEW; END IF;
  -- Row lock serializes concurrent starts and capacity edits on the same unit.
  SELECT capacity INTO v_capacity FROM public.rental_units WHERE id = NEW.unit_id FOR UPDATE;
  SELECT count(*) INTO v_active FROM public.rental_tenancies
  WHERE unit_id = NEW.unit_id AND move_out IS NULL AND id <> NEW.id;
  IF v_active >= v_capacity THEN RAISE EXCEPTION 'This unit is full'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_tenancy_guard BEFORE INSERT OR UPDATE ON public.rental_tenancies
  FOR EACH ROW EXECUTE FUNCTION public.rental_tenancy_guard();

CREATE FUNCTION public.rental_unit_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.property_id <> OLD.property_id THEN RAISE EXCEPTION 'Units cannot move between properties'; END IF;
  IF NEW.capacity < (SELECT count(*) FROM public.rental_tenancies WHERE unit_id = NEW.id AND move_out IS NULL) THEN
    RAISE EXCEPTION 'Capacity is below current occupants';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_unit_guard BEFORE UPDATE ON public.rental_units
  FOR EACH ROW EXECUTE FUNCTION public.rental_unit_guard();

CREATE FUNCTION public.rental_renter_file_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.id, NEW.renter_id, NEW.property_id, NEW.name, NEW.mime_type, NEW.size)
      IS DISTINCT FROM (OLD.id, OLD.renter_id, OLD.property_id, OLD.name, OLD.mime_type, OLD.size) THEN
      RAISE EXCEPTION 'Renter file metadata cannot be reassigned';
    END IF;
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'rental-files' AND name = OLD.storage_path) THEN
    RAISE EXCEPTION 'Remove the stored renter file before deleting its metadata';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER rental_renter_file_guard BEFORE UPDATE OR DELETE ON public.rental_renter_files
  FOR EACH ROW EXECUTE FUNCTION public.rental_renter_file_guard();

CREATE TRIGGER rental_properties_updated_at BEFORE UPDATE ON public.rental_properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER rental_units_updated_at BEFORE UPDATE ON public.rental_units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER rental_renters_updated_at BEFORE UPDATE ON public.rental_renters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER rental_tenancies_updated_at BEFORE UPDATE ON public.rental_tenancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER rental_contracts_updated_at BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_property_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_renters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_renter_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tenancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;
-- UPDATE is column-scoped: ownership and parent keys (property_id, user_id,
-- tenancy_id, renter_id, unit_id, created_by) can never be rewritten through the API,
-- so a row cannot be moved into a property the caller has no rights on.
REVOKE ALL ON public.rental_properties, public.rental_property_members, public.rental_units,
  public.rental_renters, public.rental_renter_files, public.rental_tenancies, public.rental_contracts FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.rental_properties, public.rental_units, public.rental_renters,
  public.rental_renter_files TO authenticated;
GRANT SELECT, DELETE ON public.rental_property_members TO authenticated;
GRANT SELECT, INSERT ON public.rental_tenancies, public.rental_contracts TO authenticated;
GRANT UPDATE (name, address, owner_name, owner_address, lessor_name, lessor_civil_status, lessor_address,
  lessor_capacity, signing_city, invoice_prefix, archived_at) ON public.rental_properties TO authenticated;
GRANT UPDATE (role) ON public.rental_property_members TO authenticated;
GRANT UPDATE (name, kind, capacity, electric_mode, electric_amount_centavos, water_mode, water_amount_centavos)
  ON public.rental_units TO authenticated;
GRANT UPDATE (full_name, phone, facebook, email, address, emergency_name, emergency_phone, occupants, notes)
  ON public.rental_renters TO authenticated;
GRANT UPDATE (ready) ON public.rental_renter_files TO authenticated;
GRANT UPDATE (move_out, notes) ON public.rental_tenancies TO authenticated;
GRANT UPDATE (start_date, end_date, monthly_rent_centavos, due_day, advance_months, deposit_centavos, status)
  ON public.rental_contracts TO authenticated;

-- created_by = auth.uid() lets INSERT ... RETURNING pass before the owner trigger fires.
CREATE POLICY "Members read properties" ON public.rental_properties FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()) OR public.rental_has_role(id, 'viewer'));
CREATE POLICY "Users create properties" ON public.rental_properties FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY "Owners update properties" ON public.rental_properties FOR UPDATE TO authenticated
  USING (public.rental_has_role(id, 'owner')) WITH CHECK (public.rental_has_role(id, 'owner'));
CREATE POLICY "Owners delete properties" ON public.rental_properties FOR DELETE TO authenticated
  USING (public.rental_has_role(id, 'owner'));

-- Inserts only through rental_add_member (friend check). The owner row is untouchable.
CREATE POLICY "Members read members" ON public.rental_property_members FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Owners change member roles" ON public.rental_property_members FOR UPDATE TO authenticated
  USING (role <> 'owner' AND public.rental_has_role(property_id, 'owner'))
  WITH CHECK (role IN ('manager', 'viewer'));
CREATE POLICY "Owners remove members, members leave" ON public.rental_property_members FOR DELETE TO authenticated
  USING (role <> 'owner' AND (public.rental_has_role(property_id, 'owner') OR user_id = (SELECT auth.uid())));

CREATE POLICY "Members read units" ON public.rental_units FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Owners write units" ON public.rental_units FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'owner'));
CREATE POLICY "Owners update units" ON public.rental_units FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'owner')) WITH CHECK (public.rental_has_role(property_id, 'owner'));
CREATE POLICY "Owners delete units" ON public.rental_units FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'owner'));

CREATE POLICY "Members read renters" ON public.rental_renters FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers create renters" ON public.rental_renters FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers update renters" ON public.rental_renters FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers delete renters" ON public.rental_renters FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

CREATE POLICY "Managers read renter files" ON public.rental_renter_files FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers reserve renter files" ON public.rental_renter_files FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers finish renter uploads" ON public.rental_renter_files FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers delete renter files" ON public.rental_renter_files FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

CREATE POLICY "Members read tenancies" ON public.rental_tenancies FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers create tenancies" ON public.rental_tenancies FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers update tenancies" ON public.rental_tenancies FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));

CREATE POLICY "Members read contracts" ON public.rental_contracts FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers create contracts" ON public.rental_contracts FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers update contracts" ON public.rental_contracts FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));

-- ── RPCs ────────────────────────────────────────────────────────────────────

CREATE FUNCTION public.rental_list_members(p_property_id uuid)
RETURNS TABLE (user_id uuid, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT m.user_id, u.email::text, m.role
  FROM public.rental_property_members m JOIN auth.users u ON u.id = m.user_id
  WHERE m.property_id = p_property_id AND public.rental_has_role(p_property_id, 'owner')
  ORDER BY public.rental_role_rank(m.role) DESC, u.email
$$;

CREATE FUNCTION public.rental_add_member(p_property_id uuid, p_user_id uuid, p_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.rental_has_role(p_property_id, 'owner') THEN RAISE EXCEPTION 'Only the owner can share this property'; END IF;
  IF p_role IS NULL OR p_role NOT IN ('manager', 'viewer') THEN RAISE EXCEPTION 'Role must be manager or viewer'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.friendships f WHERE f.status = 'accepted' AND (
      (f.requester_id = (SELECT auth.uid()) AND f.addressee_id = p_user_id) OR
      (f.addressee_id = (SELECT auth.uid()) AND f.requester_id = p_user_id))
  ) THEN RAISE EXCEPTION 'You can only share with friends'; END IF;
  INSERT INTO public.rental_property_members (property_id, user_id, role) VALUES (p_property_id, p_user_id, p_role)
  ON CONFLICT (property_id, user_id) DO UPDATE SET role = EXCLUDED.role
  WHERE public.rental_property_members.role <> 'owner';
END;
$$;

-- SECURITY INVOKER: RLS still decides whether the caller may write.
CREATE FUNCTION public.rental_start_tenancy(p_unit_id uuid, p_renter_id uuid, p_move_in date, p_start date,
  p_end date, p_rent integer, p_due_day integer, p_advance integer, p_deposit integer) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_property uuid; v_tenancy uuid;
BEGIN
  SELECT property_id INTO v_property FROM public.rental_units WHERE id = p_unit_id;
  IF v_property IS NULL THEN RAISE EXCEPTION 'Unit not found'; END IF;
  INSERT INTO public.rental_tenancies (property_id, unit_id, renter_id, move_in)
  VALUES (v_property, p_unit_id, p_renter_id, p_move_in) RETURNING id INTO v_tenancy;
  INSERT INTO public.rental_contracts (property_id, tenancy_id, start_date, end_date, monthly_rent_centavos,
    due_day, advance_months, deposit_centavos)
  VALUES (v_property, v_tenancy, p_start, p_end, p_rent, p_due_day, p_advance, p_deposit);
  RETURN v_tenancy;
END;
$$;

CREATE FUNCTION public.rental_end_tenancy(p_tenancy_id uuid, p_move_out date) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  UPDATE public.rental_tenancies SET move_out = p_move_out WHERE id = p_tenancy_id AND move_out IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tenancy not found or already ended'; END IF;
  UPDATE public.rental_contracts SET status = 'ended' WHERE tenancy_id = p_tenancy_id AND status = 'active';
END;
$$;

REVOKE ALL ON FUNCTION public.rental_role_rank(text), public.rental_has_role(uuid, text),
  public.rental_has_role_text(text, text), public.rental_list_members(uuid),
  public.rental_add_member(uuid, uuid, text),
  public.rental_start_tenancy(uuid, uuid, date, date, date, integer, integer, integer, integer),
  public.rental_end_tenancy(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rental_role_rank(text), public.rental_has_role(uuid, text),
  public.rental_has_role_text(text, text), public.rental_list_members(uuid),
  public.rental_add_member(uuid, uuid, text),
  public.rental_start_tenancy(uuid, uuid, date, date, date, integer, integer, integer, integer),
  public.rental_end_tenancy(uuid, date) TO authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rental-files', 'rental-files', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']);

CREATE POLICY "Managers read rental files" ON storage.objects FOR SELECT TO authenticated USING (
  bucket_id = 'rental-files' AND public.rental_has_role_text((storage.foldername(name))[1], 'manager'));
CREATE POLICY "Managers upload reserved rental files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'rental-files' AND public.rental_has_role_text((storage.foldername(name))[1], 'manager')
  AND EXISTS (SELECT 1 FROM public.rental_renter_files f WHERE f.storage_path = storage.objects.name AND NOT f.ready));
CREATE POLICY "Managers delete rental files" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'rental-files' AND public.rental_has_role_text((storage.foldername(name))[1], 'manager'));
