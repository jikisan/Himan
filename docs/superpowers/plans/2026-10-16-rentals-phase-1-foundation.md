---
type: plan
area: rentals
status: draft
created: 2026-10-16
spec: docs/superpowers/specs/2026-10-16-rentals-design.md
---

# Rentals Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A landlord can create properties and units, share a property with a friend by role, record renters (with private valid-ID files), and start or end a tenancy with its contract terms. The database enforces unit capacity and role-based access.

**Architecture:** New `@himan/shared/rentals` module (zod-validated domain + Supabase repositories) on 7 tables and one private bucket. Access is per **property** through `rental_property_members` and a single `SECURITY DEFINER` helper, `rental_has_role(property_id, min_role)`, used by every policy. Web gets one `/rentals` page: a property picker plus Units / Renters / Tenancies tabs. This copies the government module's patterns (zod row mappers, reserve-then-upload files, guard triggers, sensitive React Query).

**Tech Stack:** Supabase (Postgres, RLS, Storage), TypeScript, zod 4, date-fns, React 19, TanStack Query 5, Vitest + Testing Library. Task 1 spikes `@react-pdf/renderer` only to check the build; the library ships in Phase 2. `signature_pad` and `to-words` arrive in Phase 3.

**Spec:** `docs/superpowers/specs/2026-10-16-rentals-design.md`. Read it first.

**Phase scope:** Phase 1 only. Billing, payments, PDFs, contract text, signing, the share link and settlement belong to Phases 2–4. Do not build them here.

## Global Constraints

- Conventional commits (`feat:`, `test:`, `docs:`, `chore:`). **No AI attribution, no `Co-Authored-By` line.** The body is proper sentences starting with verbs, one per line.
- Money is **integer centavos** everywhere (DB `integer`, TS `number`). Max `2_000_000_000` centavos (fits Postgres `integer`).
- Dates are `YYYY-MM-DD` strings / Postgres `date`. "Today" is **Asia/Manila** (`manilaToday()`).
- Unit `kind !== 'bedspace'` ⇒ `capacity === 1`. Mode `none` ⇔ amount `0`.
- Roles rank `viewer < manager < owner`. Exactly one `owner` per property, which is the creator. Shares go to **accepted friends** only, as `manager` or `viewer`.
- Write access: properties, units, members → **owner**. Renters, renter files, tenancies, contracts → **manager**. Renter ID files are **never visible to viewers**.
- Storage paths start with `{property_id}/`. Bucket `rental-files` is **private**, PDF/JPEG/PNG only, 10 MB.
- Tenancies are **never deleted** (no DELETE policy). Ending one sets `move_out`.
- Every function: `SET search_path = ''`, then `REVOKE ALL … FROM PUBLIC, anon`, then `GRANT EXECUTE … TO authenticated`.
- Inside `packages/shared`, imports use `.js` extensions. No DOM APIs in `packages/shared`.
- Inter-module imports go through `index.ts` / package subpaths only.
- Tests: `cd web && npm run test:run -- <path>`. SQL: local Supabase (`supabase start`), then `psql … -f supabase/tests/rentals.sql`.
- **Never `supabase db push` to the linked remote** without asking the user (`docs/modules/government.md` notes unrelated migration-history drift).

## Review Focus

1. **Creator reads back their new property.** `INSERT … RETURNING` runs the SELECT policy *before* the AFTER trigger adds the owner membership. Expected: insert succeeds and returns the id. → The SELECT policy includes `created_by = auth.uid()`. Pinned in Task 2 SQL test.
2. **Last bed taken twice.** Two "Start tenancy" calls hit a bedspace with one free slot. Expected: one succeeds, the other fails with `This unit is full`. Shrinking capacity below current occupants also fails. → The capacity trigger locks the unit row. Pinned in Task 2 SQL test (sequential overfill and shrink).
3. **Sharing abuse.** Sharing with a non-friend, a manager or viewer calling `rental_add_member`, or anyone granting `owner`. Expected: all rejected, and the owner row can't be removed or demoted. Pinned in Task 2 SQL test.
4. **Peso input the way people type it.** Expected `"10,000"`, `"₱ 1,500.5"` and `" 250 "` to parse. Expected `"abc"`, `"-5"`, `"1.005"` and `""` to give a readable error, never `NaN` or a float. Pinned in Task 3 domain test.
5. **Viewer and renter IDs.** A viewer opens a renter. Expected: contact details are visible and the ID files list is empty, with no signed URL possible. Pinned in Task 2 SQL test (RLS) and Task 6 (UI hides the files section for viewers).

---

### Task 1: Spike — `@react-pdf/renderer` builds under rolldown-vite

The spec marks this as unverified. If it fails, the Phase 2 PDF approach changes, so find out first. Nothing from this task is committed except a note in the spec.

**Files:**
- Temp create, then delete: `web/src/pdf-spike.tsx`
- Modify: `docs/superpowers/specs/2026-10-16-rentals-design.md` (PDFs section, one line)

**Interfaces:** none.

- [ ] **Step 1: Install and write a throwaway document**

```bash
cd /Users/jk/Developer/Personal/Himan && npm install @react-pdf/renderer --workspace web
```

`web/src/pdf-spike.tsx`:
```tsx
import { Document, Page, Text, pdf } from '@react-pdf/renderer';

export async function spike(): Promise<Blob> {
  return pdf(<Document><Page size="A4"><Text>₱10,000.00 — TEN THOUSAND PESOS</Text></Page></Document>).toBlob();
}
```

Temporarily add to `web/src/main.tsx` (last line): `import('./pdf-spike').then((m) => m.spike()).then((b) => console.log('pdf-spike', b.size));`

- [ ] **Step 2: Build and run**

Run: `cd web && npm run build`
Expected: build passes. Then `npm run dev`, open the app and check the console for `pdf-spike <bytes>` with no errors.

Also check the peso glyph: save the blob (`URL.createObjectURL`) and open it. If `₱` renders as a box, note that Phase 2 must `Font.register` a font with U+20B1 (the Archivo font in `web/public/assets/fonts/` already ships).

- [ ] **Step 3: Revert and record**

```bash
cd /Users/jk/Developer/Personal/Himan && git checkout web/src/main.tsx && rm web/src/pdf-spike.tsx && npm uninstall @react-pdf/renderer --workspace web
```

Append to the spec's **PDFs** section: `Spike 2026-10-16: builds under rolldown-vite, bundle +<N> KB gzip, ₱ glyph <ok | needs Font.register>.` If the build failed, write the error there and **stop: report to the user before Task 2.**

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-10-16-rentals-design.md
git commit -m "docs: record react-pdf build spike for rentals"
```

---

### Task 2: Migration — tables, roles, capacity, files bucket, SQL tests

**Files:**
- Create: `supabase/migrations/20261016000000_create_rentals_module.sql`
- Create: `supabase/tests/rentals.sql`

**Interfaces:**
- Consumes: `auth.users`, `public.profiles(user_id, full_name, location)`, `public.friendships(requester_id, addressee_id, status)`, `public.update_updated_at_column()`.
- Produces tables: `rental_properties`, `rental_property_members`, `rental_units`, `rental_renters`, `rental_renter_files`, `rental_tenancies`, `rental_contracts`. Bucket: `rental-files`.
- Produces functions (callable by `authenticated`):
  - `rental_has_role(p_property_id uuid, p_min_role text) → boolean`
  - `rental_list_members(p_property_id uuid) → TABLE(user_id uuid, email text, role text)`
  - `rental_add_member(p_property_id uuid, p_user_id uuid, p_role text) → void`
  - `rental_start_tenancy(p_unit_id uuid, p_renter_id uuid, p_move_in date, p_start date, p_end date, p_rent integer, p_due_day integer, p_advance integer, p_deposit integer) → uuid`
  - `rental_end_tenancy(p_tenancy_id uuid, p_move_out date) → void`
- Error messages the UI shows verbatim: `This unit is full`, `Capacity is below current occupants`, `You can only share with friends`, `Only the owner can share this property`, `Role must be manager or viewer`, `Tenancy not found or already ended`, `Tenancy unit and renter cannot be changed`, `Remove the stored renter file before deleting its metadata`.

- [ ] **Step 1: Write the failing SQL test**

`supabase/tests/rentals.sql`:
```sql
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
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Tenancy unit and renter cannot be changed' THEN RAISE; END IF;
  END;

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

-- As the friend (viewer).
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000aa002', true);
DO $$ BEGIN
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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/jk/Developer/Personal/Himan && supabase start && supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/rentals.sql
```
Expected: FAIL with `relation "public.rental_properties" does not exist`.

- [ ] **Step 3: Write the migration**

`supabase/migrations/20261016000000_create_rentals_module.sql`:
```sql
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
    NEW.lessor_name := coalesce((SELECT p.full_name FROM public.profiles p WHERE p.user_id = NEW.created_by), '');
  END IF;
  IF NEW.lessor_address = '' THEN
    NEW.lessor_address := coalesce((SELECT p.location FROM public.profiles p WHERE p.user_id = NEW.created_by), '');
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_properties, public.rental_property_members,
  public.rental_units, public.rental_renters, public.rental_renter_files TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rental_tenancies, public.rental_contracts TO authenticated;

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
  WHERE m.property_id = p_property_id AND public.rental_has_role(p_property_id, 'viewer')
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
```

- [ ] **Step 4: Run the SQL test to verify it passes**

```bash
supabase db reset && psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/rentals.sql
```
Expected: ends with `ROLLBACK` and no `ERROR`. If a fixture fails because `profiles` or `friendships` need extra NOT NULL columns, add them to the fixture inserts. Don't loosen the migration.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20261016000000_create_rentals_module.sql supabase/tests/rentals.sql
git commit -m "feat: add rentals schema with per-property roles and capacity guard" -m "Adds properties, members, units, renters, renter files, tenancies and contracts with RLS through rental_has_role.
Enforces unit capacity, friend-only sharing and immutable tenancy history in the database.
Adds rollback-only SQL assertions for isolation, sharing and capacity."
```

---

### Task 3: Shared domain — money, roles, occupancy, schemas, types

**Files:**
- Create: `packages/shared/src/modules/rentals/domain/money.ts`
- Create: `packages/shared/src/modules/rentals/domain/roles.ts`
- Create: `packages/shared/src/modules/rentals/domain/schemas.ts`
- Create: `packages/shared/src/modules/rentals/domain/types.ts`
- Create: `packages/shared/src/modules/rentals/domain/index.ts`
- Create: `packages/shared/src/modules/rentals/index.ts`
- Modify: `packages/shared/package.json` (exports: add `"./rentals": "./src/modules/rentals/index.ts"` after `"./government"`)
- Test: `web/src/modules/rentals/__tests__/rentals.domain.test.ts`

**Interfaces:**
- Produces:
  - `parsePesos(input: string): number` (centavos; throws `Error('Enter an amount like 10,000 or 1,500.50')` / `Error('Amount is too large')`)
  - `formatPesos(centavos: number): string` → `"₱10,000.00"`
  - `centavosToInput(centavos: number): string` → `"10000.00"`, `""` for 0
  - `manilaToday(now?: Date): string` → `YYYY-MM-DD`
  - `RENTAL_ROLES`, `type RentalRole`, `hasRentalRole(role: RentalRole | null | undefined, min: RentalRole): boolean`
  - `unitOccupancy(unit: { id: string; capacity: number }, tenancies: { unitId: string; moveOut: string | null }[]): { occupied: number; capacity: number; free: number }`
  - Schemas + inferred inputs: `propertySchema`/`PropertyInput`, `unitSchema`/`UnitInput`, `renterSchema`/`RenterInput`, `startTenancySchema`/`StartTenancyInput`
  - Constants: `UNIT_KINDS`, `UTILITY_MODES`, `LESSOR_CAPACITIES`, `RENTAL_FILE_TYPES`, `RENTAL_FILE_LIMIT`; `validateRentalFile(name, mimeType, size): string`
  - Types: `RentalProperty`, `RentalUnit`, `Renter`, `RenterFile`, `RentalTenancy`, `RentalContract`, `RentalMember`

- [ ] **Step 1: Write the failing test**

`web/src/modules/rentals/__tests__/rentals.domain.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parsePesos, formatPesos, centavosToInput, manilaToday, hasRentalRole, unitOccupancy,
  unitSchema, startTenancySchema, renterSchema, validateRentalFile, RENTAL_FILE_LIMIT } from '@himan/shared/rentals';

const unit = { name: 'Room A', kind: 'bedspace' as const, capacity: 2, electricMode: 'submeter' as const,
  electricAmountCentavos: 1250, waterMode: 'fixed' as const, waterAmountCentavos: 20000 };
const tenancy = { unitId: '00000000-0000-0000-0000-000000000001', renterId: '00000000-0000-0000-0000-000000000002',
  moveIn: '2026-10-01', startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 1000000,
  dueDay: 30, advanceMonths: 1, depositCentavos: 1000000 };

describe('pesos', () => {
  it('parses amounts the way people type them', () => {
    expect(parsePesos('10,000')).toBe(1000000);
    expect(parsePesos('₱ 1,500.5')).toBe(150050);
    expect(parsePesos(' 250 ')).toBe(25000);
    expect(parsePesos('0.05')).toBe(5);
  });
  it('rejects anything that is not a non-negative amount with at most two decimals', () => {
    for (const bad of ['abc', '-5', '1.005', '', '1,2,3.4.5']) {
      expect(() => parsePesos(bad)).toThrow('Enter an amount like 10,000 or 1,500.50');
    }
    expect(() => parsePesos('20,000,001')).toThrow('Amount is too large');
  });
  it('formats centavos as Philippine pesos and back to an editable value', () => {
    expect(formatPesos(1000000)).toBe('₱10,000.00');
    expect(centavosToInput(150050)).toBe('1500.50');
    expect(centavosToInput(0)).toBe('');
  });
  it('uses the Manila calendar day', () => {
    expect(manilaToday(new Date('2026-10-15T17:30:00Z'))).toBe('2026-10-16');
  });
});

describe('roles and occupancy', () => {
  it('ranks viewer below manager below owner', () => {
    expect(hasRentalRole('owner', 'manager')).toBe(true);
    expect(hasRentalRole('viewer', 'manager')).toBe(false);
    expect(hasRentalRole(null, 'viewer')).toBe(false);
  });
  it('counts only active tenancies of the unit', () => {
    const tenancies = [{ unitId: 'u', moveOut: null }, { unitId: 'u', moveOut: '2026-01-01' }, { unitId: 'x', moveOut: null }];
    expect(unitOccupancy({ id: 'u', capacity: 2 }, tenancies)).toEqual({ occupied: 1, capacity: 2, free: 1 });
  });
});

describe('schemas', () => {
  it('allows capacity above one only for bedspace', () => {
    expect(unitSchema.safeParse(unit).success).toBe(true);
    expect(unitSchema.safeParse({ ...unit, kind: 'room' }).success).toBe(false);
  });
  it('requires an amount exactly when a utility is billed', () => {
    expect(unitSchema.safeParse({ ...unit, electricAmountCentavos: 0 }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, waterMode: 'none' }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, waterMode: 'none', waterAmountCentavos: 0 }).success).toBe(true);
  });
  it('rejects a contract that ends before it starts or a due day outside 1–31', () => {
    expect(startTenancySchema.safeParse(tenancy).success).toBe(true);
    expect(startTenancySchema.safeParse({ ...tenancy, endDate: '2026-10-01' }).success).toBe(false);
    expect(startTenancySchema.safeParse({ ...tenancy, dueDay: 32 }).success).toBe(false);
    expect(startTenancySchema.safeParse({ ...tenancy, monthlyRentCentavos: 0 }).success).toBe(false);
  });
  it('accepts a renter with only a name and rejects a malformed email', () => {
    const renter = { fullName: 'Juan Dela Cruz', phone: '', facebook: '', email: '', address: '',
      emergencyName: '', emergencyPhone: '', occupants: 1, notes: '' };
    expect(renterSchema.safeParse(renter).success).toBe(true);
    expect(renterSchema.safeParse({ ...renter, email: 'not-an-email' }).success).toBe(false);
  });
  it('limits renter files to PDF, JPEG, PNG up to 10 MB', () => {
    expect(validateRentalFile('id.PNG', '', RENTAL_FILE_LIMIT)).toBe('image/png');
    expect(() => validateRentalFile('id.html', 'text/html', 10)).toThrow('PDF, JPEG, or PNG');
    expect(() => validateRentalFile('id.pdf', 'application/pdf', RENTAL_FILE_LIMIT + 1)).toThrow('10 MB');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd web && npm run test:run -- src/modules/rentals/__tests__/rentals.domain.test.ts`
Expected: FAIL. The import of `@himan/shared/rentals` doesn't resolve.

- [ ] **Step 3: Implement**

`packages/shared/src/modules/rentals/domain/money.ts`:
```ts
const MAX_CENTAVOS = 2_000_000_000;

export function parsePesos(input: string): number {
  const cleaned = input.replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error('Enter an amount like 10,000 or 1,500.50');
  const [whole, fraction = ''] = cleaned.split('.');
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos > MAX_CENTAVOS) throw new Error('Amount is too large');
  return centavos;
}

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export const formatPesos = (centavos: number): string => peso.format(centavos / 100);
export const centavosToInput = (centavos: number): string => (centavos ? (centavos / 100).toFixed(2) : '');

export function manilaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
}
```

`packages/shared/src/modules/rentals/domain/roles.ts`:
```ts
export const RENTAL_ROLES = ['viewer', 'manager', 'owner'] as const;
export type RentalRole = (typeof RENTAL_ROLES)[number];

export function hasRentalRole(role: RentalRole | null | undefined, min: RentalRole): boolean {
  return !!role && RENTAL_ROLES.indexOf(role) >= RENTAL_ROLES.indexOf(min);
}

export function unitOccupancy(unit: { id: string; capacity: number },
  tenancies: { unitId: string; moveOut: string | null }[]) {
  const occupied = tenancies.filter((t) => t.unitId === unit.id && t.moveOut === null).length;
  return { occupied, capacity: unit.capacity, free: Math.max(unit.capacity - occupied, 0) };
}
```

`packages/shared/src/modules/rentals/domain/schemas.ts`:
```ts
import { z } from 'zod';

export const UNIT_KINDS = ['whole', 'room', 'bedspace'] as const;
export const UTILITY_MODES = ['none', 'submeter', 'fixed'] as const;
export const LESSOR_CAPACITIES = ['owner', 'representative'] as const;
export const RENTAL_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
export const RENTAL_FILE_LIMIT = 10 * 1024 * 1024;

const centavos = (min: number) => z.number().int().min(min).max(2_000_000_000);
const text = (max: number) => z.string().trim().max(max);

export const propertySchema = z.object({
  name: z.string().trim().min(1, 'Enter a property name').max(120),
  address: text(300), ownerName: text(160), ownerAddress: text(300),
  lessorName: text(160), lessorCivilStatus: text(40), lessorAddress: text(300),
  lessorCapacity: z.enum(LESSOR_CAPACITIES), signingCity: text(120),
  invoicePrefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{1,10}$/, 'Use 1–10 letters or digits'),
});

export const unitSchema = z.object({
  name: z.string().trim().min(1, 'Enter a unit name').max(80),
  kind: z.enum(UNIT_KINDS),
  capacity: z.number().int().min(1).max(50),
  electricMode: z.enum(UTILITY_MODES), electricAmountCentavos: centavos(0),
  waterMode: z.enum(UTILITY_MODES), waterAmountCentavos: centavos(0),
})
  .refine((u) => u.kind === 'bedspace' || u.capacity === 1, { message: 'Only bedspace units hold more than one renter', path: ['capacity'] })
  .refine((u) => (u.electricMode === 'none') === (u.electricAmountCentavos === 0), { message: 'Enter the electricity rate or amount', path: ['electricAmountCentavos'] })
  .refine((u) => (u.waterMode === 'none') === (u.waterAmountCentavos === 0), { message: 'Enter the water rate or amount', path: ['waterAmountCentavos'] });

export const renterSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter the renter’s name').max(160),
  phone: text(40), facebook: text(200),
  email: z.union([z.literal(''), z.email('Enter a valid email')]),
  address: text(300), emergencyName: text(160), emergencyPhone: text(40),
  occupants: z.number().int().min(1).max(50), notes: text(10000),
});

export const startTenancySchema = z.object({
  unitId: z.guid('Choose a unit'), renterId: z.guid('Choose a renter'),
  moveIn: z.iso.date(), startDate: z.iso.date(), endDate: z.iso.date(),
  monthlyRentCentavos: centavos(1), dueDay: z.number().int().min(1).max(31),
  advanceMonths: z.number().int().min(0).max(12), depositCentavos: centavos(0),
}).refine((t) => t.endDate > t.startDate, { message: 'Contract must end after it starts', path: ['endDate'] });

export type PropertyInput = z.infer<typeof propertySchema>;
export type UnitInput = z.infer<typeof unitSchema>;
export type RenterInput = z.infer<typeof renterSchema>;
export type StartTenancyInput = z.infer<typeof startTenancySchema>;

export function validateRentalFile(name: string, mimeType: string | null | undefined, size: number): string {
  if (!name.trim() || name.length > 255) throw new Error('File name must be 1–255 characters');
  if (!Number.isInteger(size) || size <= 0 || size > RENTAL_FILE_LIMIT) throw new Error('Choose a non-empty file up to 10 MB');
  const type = mimeType || ({ pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' } as Record<string, string>)[
    name.split('.').pop()?.toLowerCase() ?? ''];
  if (!RENTAL_FILE_TYPES.some((allowed) => allowed === type)) throw new Error('Choose a PDF, JPEG, or PNG file');
  return type!;
}
```

`packages/shared/src/modules/rentals/domain/types.ts`:
```ts
import type { PropertyInput, RenterInput, UnitInput } from './schemas.js';
import type { RentalRole } from './roles.js';

export interface RentalUnit extends UnitInput { id: string; propertyId: string }
export interface RentalProperty extends PropertyInput {
  id: string; createdBy: string; role: RentalRole; archivedAt: string | null;
  units: RentalUnit[]; createdAt: string; updatedAt: string;
}
export interface RenterFile {
  id: string; renterId: string; propertyId: string; name: string; mimeType: string;
  size: number; storagePath: string; ready: boolean;
}
export interface Renter extends RenterInput { id: string; propertyId: string; files: RenterFile[] }
export interface RentalContract {
  id: string; tenancyId: string; startDate: string; endDate: string; monthlyRentCentavos: number;
  dueDay: number; advanceMonths: number; depositCentavos: number; status: 'draft' | 'active' | 'ended';
}
export interface RentalTenancy {
  id: string; propertyId: string; unitId: string; renterId: string;
  moveIn: string; moveOut: string | null; contracts: RentalContract[];
}
export interface RentalMember { userId: string; email: string; role: RentalRole }
```

`packages/shared/src/modules/rentals/domain/index.ts`:
```ts
export * from './money.js';
export * from './roles.js';
export * from './schemas.js';
export * from './types.js';
```

`packages/shared/src/modules/rentals/index.ts` (infrastructure is added in Task 4):
```ts
export * from './domain/index.js';
```

Add `"./rentals": "./src/modules/rentals/index.ts",` to `packages/shared/package.json` `exports`, after `"./government"`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm run test:run -- src/modules/rentals/__tests__/rentals.domain.test.ts`
Expected: PASS (13 assertions groups, 0 failures). If `formatPesos` prints `PHP 10,000.00` instead of `₱`, the Node ICU is small: run `node -p "process.versions.icu"` and report. Don't change the expected string.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/modules/rentals packages/shared/package.json web/src/modules/rentals/__tests__/rentals.domain.test.ts
git commit -m "feat: add rentals domain for pesos, roles, occupancy and validation" -m "Stores money as integer centavos and parses peso input with clear errors.
Validates units, renters and tenancy terms to mirror the database constraints."
```

---

### Task 4: Shared infrastructure — repositories

**Files:**
- Create: `packages/shared/src/modules/rentals/infrastructure/rows.ts`
- Create: `packages/shared/src/modules/rentals/infrastructure/PropertyRepository.ts`
- Create: `packages/shared/src/modules/rentals/infrastructure/RenterRepository.ts`
- Create: `packages/shared/src/modules/rentals/infrastructure/TenancyRepository.ts`
- Create: `packages/shared/src/modules/rentals/infrastructure/index.ts`
- Modify: `packages/shared/src/modules/rentals/index.ts`
- Test: `web/src/modules/rentals/__tests__/rentals.repository.test.ts`

**Interfaces:**
- Consumes: Task 3 types and schemas; `getSupabase()` from `../../../config/index.js`.
- Produces:
  - `class PropertyRepository { findAll(userId: string): Promise<RentalProperty[]>; save(id: string | null, input: PropertyInput): Promise<string>; setArchived(id: string, archived: boolean): Promise<void>; remove(id: string): Promise<void>; saveUnit(propertyId: string, id: string | null, input: UnitInput): Promise<void>; removeUnit(id: string): Promise<void>; listMembers(propertyId: string): Promise<RentalMember[]>; addMember(propertyId: string, userId: string, role: 'manager' | 'viewer'): Promise<void>; removeMember(propertyId: string, userId: string): Promise<void> }`
  - `class RenterRepository { findAll(): Promise<Renter[]>; save(propertyId: string, id: string | null, input: RenterInput): Promise<string>; remove(id: string): Promise<void>; upload(renterId: string, propertyId: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void>; removeFile(id: string): Promise<void>; fileUrl(id: string, download?: boolean): Promise<string> }`
  - `class TenancyRepository { findAll(): Promise<RentalTenancy[]>; start(input: StartTenancyInput): Promise<string>; end(id: string, moveOut: string): Promise<void> }`
  - `rentalError(error: unknown, fallback: string): Error`: maps Postgres codes to friendly messages and passes `RAISE EXCEPTION` messages through.

- [ ] **Step 1: Write the failing test**

`web/src/modules/rentals/__tests__/rentals.repository.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyRepository, RenterRepository, TenancyRepository } from '@himan/shared/rentals';

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('@himan/shared/config', () => ({ getSupabase: () => mock }));

function result(data: unknown, error: unknown = null) {
  const value = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), insert: vi.fn(() => chain), update: vi.fn(() => chain),
    delete: vi.fn(() => chain), order: vi.fn(() => chain), single: vi.fn(async () => value),
    then: (resolve: (response: typeof value) => unknown) => Promise.resolve(value).then(resolve),
  };
  return chain;
}
const propertyRow = { id: 'p', created_by: 'owner', name: 'House', address: '', owner_name: '', owner_address: '',
  lessor_name: 'Owner', lessor_civil_status: '', lessor_address: '', lessor_capacity: 'owner', signing_city: 'Cebu',
  invoice_prefix: 'INV', archived_at: null, created_at: '', updated_at: '',
  units: [{ id: 'u', property_id: 'p', name: 'Room A', kind: 'bedspace', capacity: 2, electric_mode: 'submeter',
    electric_amount_centavos: 1250, water_mode: 'none', water_amount_centavos: 0 }],
  members: [{ role: 'manager' }] };
const fileRow = { id: 'f', renter_id: 'r', property_id: 'p', name: 'id.png', mime_type: 'image/png', size: 10,
  storage_path: 'p/renters/r/f', ready: false };

beforeEach(() => { vi.clearAllMocks(); mock.from.mockReset(); mock.rpc.mockReset(); mock.storage.from.mockReset(); });

describe('PropertyRepository', () => {
  it('maps the caller’s own role and units, filtering membership by the signed-in user', async () => {
    const query = result([propertyRow]);
    mock.from.mockReturnValue(query);
    const [property] = await new PropertyRepository().findAll('me');
    expect(query.eq).toHaveBeenCalledWith('members.user_id', 'me');
    expect(property.role).toBe('manager');
    expect(property.units[0]).toMatchObject({ propertyId: 'p', electricMode: 'submeter', electricAmountCentavos: 1250 });
  });
  it('turns a tenancy-history foreign key error into an archive hint', async () => {
    mock.from.mockReturnValue(result(null, { code: '23503', message: 'fk' }));
    await expect(new PropertyRepository().remove('p')).rejects.toThrow('Archive it instead');
  });
  it('passes database rule messages through unchanged', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'You can only share with friends' } });
    await expect(new PropertyRepository().addMember('p', 'x', 'viewer')).rejects.toThrow('You can only share with friends');
  });
});

describe('TenancyRepository', () => {
  it('starts a tenancy and its contract in one RPC with centavo amounts', async () => {
    mock.rpc.mockResolvedValue({ data: 't', error: null });
    const id = await new TenancyRepository().start({ unitId: '00000000-0000-0000-0000-000000000001',
      renterId: '00000000-0000-0000-0000-000000000002', moveIn: '2026-10-01', startDate: '2026-10-01',
      endDate: '2027-10-01', monthlyRentCentavos: 1000000, dueDay: 30, advanceMonths: 1, depositCentavos: 1000000 });
    expect(id).toBe('t');
    expect(mock.rpc).toHaveBeenCalledWith('rental_start_tenancy', expect.objectContaining({ p_rent: 1000000, p_due_day: 30 }));
  });
});

describe('RenterRepository files', () => {
  it('removes a failed upload’s object before its reserved metadata', async () => {
    const cleanup = result({ id: 'f' });
    mock.from.mockReturnValueOnce(result(fileRow)).mockReturnValueOnce(result(fileRow)).mockReturnValueOnce(cleanup);
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload: vi.fn(async () => ({ error: new Error('Upload failed') })), remove });
    await expect(new RenterRepository().upload('r', 'p', { name: 'id.png', mimeType: 'image/png', bytes: new ArrayBuffer(10) }))
      .rejects.toThrow('Upload failed');
    expect(remove).toHaveBeenCalledWith(['p/renters/r/f']);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(cleanup.delete.mock.invocationCallOrder[0]);
  });
  it('creates only 60-second signed URLs for ready files', async () => {
    const lookup = result({ ...fileRow, ready: true });
    mock.from.mockReturnValue(lookup);
    const signed = vi.fn(async () => ({ data: { signedUrl: 'https://x/signed' }, error: null }));
    mock.storage.from.mockReturnValue({ createSignedUrl: signed });
    await expect(new RenterRepository().fileUrl('f', true)).resolves.toBe('https://x/signed');
    expect(lookup.eq).toHaveBeenCalledWith('ready', true);
    expect(signed).toHaveBeenCalledWith('p/renters/r/f', 60, { download: 'id.png' });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd web && npm run test:run -- src/modules/rentals/__tests__/rentals.repository.test.ts`
Expected: FAIL with `PropertyRepository is not a constructor` (or not exported).

- [ ] **Step 3: Implement**

`packages/shared/src/modules/rentals/infrastructure/rows.ts`:
```ts
import { z } from 'zod';
import type { RentalContract, RentalProperty, RentalTenancy, RentalUnit, Renter, RenterFile } from '../domain/index.js';
import { RENTAL_ROLES } from '../domain/index.js';

export const unitRow = z.object({
  id: z.string(), property_id: z.string(), name: z.string(), kind: z.enum(['whole', 'room', 'bedspace']),
  capacity: z.number(), electric_mode: z.enum(['none', 'submeter', 'fixed']), electric_amount_centavos: z.number(),
  water_mode: z.enum(['none', 'submeter', 'fixed']), water_amount_centavos: z.number(),
}).transform((r): RentalUnit => ({
  id: r.id, propertyId: r.property_id, name: r.name, kind: r.kind, capacity: r.capacity,
  electricMode: r.electric_mode, electricAmountCentavos: r.electric_amount_centavos,
  waterMode: r.water_mode, waterAmountCentavos: r.water_amount_centavos,
}));

export const propertyRow = z.object({
  id: z.string(), created_by: z.string(), name: z.string(), address: z.string(), owner_name: z.string(),
  owner_address: z.string(), lessor_name: z.string(), lessor_civil_status: z.string(), lessor_address: z.string(),
  lessor_capacity: z.enum(['owner', 'representative']), signing_city: z.string(), invoice_prefix: z.string(),
  archived_at: z.string().nullable(), created_at: z.string(), updated_at: z.string(),
  units: z.array(unitRow).default([]), members: z.array(z.object({ role: z.enum(RENTAL_ROLES) })).min(1),
}).transform((r): RentalProperty => ({
  id: r.id, createdBy: r.created_by, name: r.name, address: r.address, ownerName: r.owner_name,
  ownerAddress: r.owner_address, lessorName: r.lessor_name, lessorCivilStatus: r.lessor_civil_status,
  lessorAddress: r.lessor_address, lessorCapacity: r.lessor_capacity, signingCity: r.signing_city,
  invoicePrefix: r.invoice_prefix, archivedAt: r.archived_at, createdAt: r.created_at, updatedAt: r.updated_at,
  role: r.members[0].role, units: [...r.units].sort((a, b) => a.name.localeCompare(b.name)),
}));

export const fileRow = z.object({
  id: z.string(), renter_id: z.string(), property_id: z.string(), name: z.string(), mime_type: z.string(),
  size: z.number(), storage_path: z.string(), ready: z.boolean(),
}).transform((r): RenterFile => ({
  id: r.id, renterId: r.renter_id, propertyId: r.property_id, name: r.name, mimeType: r.mime_type,
  size: r.size, storagePath: r.storage_path, ready: r.ready,
}));

export const renterRow = z.object({
  id: z.string(), property_id: z.string(), full_name: z.string(), phone: z.string(), facebook: z.string(),
  email: z.string(), address: z.string(), emergency_name: z.string(), emergency_phone: z.string(),
  occupants: z.number(), notes: z.string(), files: z.array(fileRow).default([]),
}).transform((r): Renter => ({
  id: r.id, propertyId: r.property_id, fullName: r.full_name, phone: r.phone, facebook: r.facebook,
  email: r.email, address: r.address, emergencyName: r.emergency_name, emergencyPhone: r.emergency_phone,
  occupants: r.occupants, notes: r.notes, files: r.files,
}));

const contractRow = z.object({
  id: z.string(), tenancy_id: z.string(), start_date: z.string(), end_date: z.string(),
  monthly_rent_centavos: z.number(), due_day: z.number(), advance_months: z.number(),
  deposit_centavos: z.number(), status: z.enum(['draft', 'active', 'ended']),
}).transform((r): RentalContract => ({
  id: r.id, tenancyId: r.tenancy_id, startDate: r.start_date, endDate: r.end_date,
  monthlyRentCentavos: r.monthly_rent_centavos, dueDay: r.due_day, advanceMonths: r.advance_months,
  depositCentavos: r.deposit_centavos, status: r.status,
}));

export const tenancyRow = z.object({
  id: z.string(), property_id: z.string(), unit_id: z.string(), renter_id: z.string(),
  move_in: z.string(), move_out: z.string().nullable(), contracts: z.array(contractRow).default([]),
}).transform((r): RentalTenancy => ({
  id: r.id, propertyId: r.property_id, unitId: r.unit_id, renterId: r.renter_id,
  moveIn: r.move_in, moveOut: r.move_out,
  contracts: [...r.contracts].sort((a, b) => b.startDate.localeCompare(a.startDate)),
}));

// RAISE EXCEPTION (P0001) messages are written for people; pass them through.
export function rentalError(error: unknown, fallback: string): Error {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code === 'P0001' && message) return new Error(message);
  if (code === '23503') return new Error(fallback);
  if (code === '23505') return new Error('That name is already used in this property');
  if (code === '42501') return new Error('You don’t have permission to do that');
  return error instanceof Error ? error : new Error(fallback);
}
```

`packages/shared/src/modules/rentals/infrastructure/PropertyRepository.ts`:
```ts
import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { propertySchema, unitSchema, RENTAL_ROLES } from '../domain/index.js';
import type { PropertyInput, RentalMember, RentalProperty, UnitInput } from '../domain/index.js';
import { propertyRow, rentalError } from './rows.js';

const memberRow = z.object({ user_id: z.string(), email: z.string(), role: z.enum(RENTAL_ROLES) })
  .transform((r): RentalMember => ({ userId: r.user_id, email: r.email, role: r.role }));

export class PropertyRepository {
  // ponytail: no pagination; a landlord has a handful of properties.
  async findAll(userId: string): Promise<RentalProperty[]> {
    const { data, error } = await getSupabase().from('rental_properties')
      .select('*, units:rental_units(*), members:rental_property_members!inner(role)')
      .eq('members.user_id', userId).order('created_at').order('id');
    if (error) throw rentalError(error, 'Could not load properties');
    return z.array(propertyRow).parse(data);
  }

  async save(id: string | null, input: PropertyInput): Promise<string> {
    const v = propertySchema.parse(input);
    const row = { name: v.name, address: v.address, owner_name: v.ownerName, owner_address: v.ownerAddress,
      lessor_name: v.lessorName, lessor_civil_status: v.lessorCivilStatus, lessor_address: v.lessorAddress,
      lessor_capacity: v.lessorCapacity, signing_city: v.signingCity, invoice_prefix: v.invoicePrefix };
    const query = id ? getSupabase().from('rental_properties').update(row).eq('id', id)
      : getSupabase().from('rental_properties').insert(row);
    // Select only the id: the owner membership row is added by a trigger that the
    // same statement's embed cannot see yet.
    const { data, error } = await query.select('id').single();
    if (error) throw rentalError(error, 'Could not save property');
    return z.object({ id: z.string() }).parse(data).id;
  }

  async setArchived(id: string, archived: boolean): Promise<void> {
    const { error } = await getSupabase().from('rental_properties')
      .update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'Could not update property');
  }

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase().from('rental_properties').delete().eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'This property has tenancy history. Archive it instead.');
  }

  async saveUnit(propertyId: string, id: string | null, input: UnitInput): Promise<void> {
    const v = unitSchema.parse(input);
    const row = { name: v.name, kind: v.kind, capacity: v.capacity, electric_mode: v.electricMode,
      electric_amount_centavos: v.electricAmountCentavos, water_mode: v.waterMode, water_amount_centavos: v.waterAmountCentavos };
    const query = id ? getSupabase().from('rental_units').update(row).eq('id', id)
      : getSupabase().from('rental_units').insert({ ...row, property_id: propertyId });
    const { error } = await query.select('id').single();
    if (error) throw rentalError(error, 'Could not save unit');
  }

  async removeUnit(id: string): Promise<void> {
    const { error } = await getSupabase().from('rental_units').delete().eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'This unit has tenancy history and can’t be deleted');
  }

  async listMembers(propertyId: string): Promise<RentalMember[]> {
    const { data, error } = await getSupabase().rpc('rental_list_members', { p_property_id: propertyId });
    if (error) throw rentalError(error, 'Could not load members');
    return z.array(memberRow).parse(data);
  }

  async addMember(propertyId: string, userId: string, role: 'manager' | 'viewer'): Promise<void> {
    const { error } = await getSupabase().rpc('rental_add_member', { p_property_id: propertyId, p_user_id: userId, p_role: role });
    if (error) throw rentalError(error, 'Could not share property');
  }

  async removeMember(propertyId: string, userId: string): Promise<void> {
    const { error } = await getSupabase().from('rental_property_members').delete()
      .eq('property_id', propertyId).eq('user_id', userId).select('user_id').single();
    if (error) throw rentalError(error, 'Could not remove member');
  }
}
```

`packages/shared/src/modules/rentals/infrastructure/RenterRepository.ts`:
```ts
import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { renterSchema, validateRentalFile } from '../domain/index.js';
import type { Renter, RenterInput } from '../domain/index.js';
import { fileRow, renterRow, rentalError } from './rows.js';

const BUCKET = 'rental-files';

export class RenterRepository {
  // Viewers get files: [] because RLS hides rental_renter_files from them.
  async findAll(): Promise<Renter[]> {
    const { data, error } = await getSupabase().from('rental_renters')
      .select('*, files:rental_renter_files(*)').order('full_name').order('id');
    if (error) throw rentalError(error, 'Could not load renters');
    return z.array(renterRow).parse(data);
  }

  async save(propertyId: string, id: string | null, input: RenterInput): Promise<string> {
    const v = renterSchema.parse(input);
    const row = { full_name: v.fullName, phone: v.phone, facebook: v.facebook, email: v.email, address: v.address,
      emergency_name: v.emergencyName, emergency_phone: v.emergencyPhone, occupants: v.occupants, notes: v.notes };
    const query = id ? getSupabase().from('rental_renters').update(row).eq('id', id)
      : getSupabase().from('rental_renters').insert({ ...row, property_id: propertyId });
    const { data, error } = await query.select('id').single();
    if (error) throw rentalError(error, 'Could not save renter');
    return z.object({ id: z.string() }).parse(data).id;
  }

  async remove(id: string): Promise<void> {
    const { data, error } = await getSupabase().from('rental_renter_files').select('id').eq('renter_id', id);
    if (error) throw rentalError(error, 'Could not remove renter');
    for (const file of z.array(z.object({ id: z.string() })).parse(data)) await this.removeFile(file.id);
    const { error: deleteError } = await getSupabase().from('rental_renters').delete().eq('id', id).select('id').single();
    if (deleteError) throw rentalError(deleteError, 'This renter has tenancy history and can’t be deleted');
  }

  async upload(renterId: string, propertyId: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void> {
    const mimeType = validateRentalFile(file.name, file.mimeType, file.bytes.byteLength);
    // Reserve metadata first so interrupted uploads stay visible and removable.
    const { data: reserved, error: reserveError } = await getSupabase().from('rental_renter_files').insert({
      renter_id: renterId, property_id: propertyId, name: file.name, mime_type: mimeType, size: file.bytes.byteLength,
    }).select('*').single();
    if (reserveError) throw rentalError(reserveError, 'Could not attach file');
    const { id, storagePath } = fileRow.parse(reserved);
    try {
      const { error } = await getSupabase().storage.from(BUCKET).upload(storagePath, file.bytes,
        { contentType: mimeType, upsert: false, cacheControl: '0' });
      if (error) throw error;
      const { error: readyError } = await getSupabase().from('rental_renter_files').update({ ready: true })
        .eq('id', id).select('id').single();
      if (readyError) throw readyError;
    } catch (error) {
      try { await this.removeFile(id); }
      catch { throw new Error('Upload incomplete. Remove the incomplete attachment before retrying.'); }
      throw error;
    }
  }

  async removeFile(id: string): Promise<void> {
    const { data, error } = await getSupabase().from('rental_renter_files').select('*').eq('id', id).single();
    if (error) throw rentalError(error, 'Could not remove file');
    const file = fileRow.parse(data);
    const { error: storageError } = await getSupabase().storage.from(BUCKET).remove([file.storagePath]);
    if (storageError) throw storageError;
    const { error: rowError } = await getSupabase().from('rental_renter_files').delete().eq('id', id).select('id').single();
    if (rowError) throw rentalError(rowError, 'Could not remove file');
  }

  async fileUrl(id: string, download = false): Promise<string> {
    const { data, error } = await getSupabase().from('rental_renter_files').select('*')
      .eq('id', id).eq('ready', true).single();
    if (error) throw rentalError(error, 'Could not open file');
    const file = fileRow.parse(data);
    const { data: signed, error: signError } = await getSupabase().storage.from(BUCKET)
      .createSignedUrl(file.storagePath, 60, download ? { download: file.name } : undefined);
    if (signError) throw signError;
    return signed.signedUrl;
  }
}
```

`packages/shared/src/modules/rentals/infrastructure/TenancyRepository.ts`:
```ts
import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { startTenancySchema } from '../domain/index.js';
import type { RentalTenancy, StartTenancyInput } from '../domain/index.js';
import { rentalError, tenancyRow } from './rows.js';

export class TenancyRepository {
  async findAll(): Promise<RentalTenancy[]> {
    const { data, error } = await getSupabase().from('rental_tenancies')
      .select('*, contracts:rental_contracts(*)').order('move_in', { ascending: false }).order('id');
    if (error) throw rentalError(error, 'Could not load tenancies');
    return z.array(tenancyRow).parse(data);
  }

  async start(input: StartTenancyInput): Promise<string> {
    const v = startTenancySchema.parse(input);
    const { data, error } = await getSupabase().rpc('rental_start_tenancy', {
      p_unit_id: v.unitId, p_renter_id: v.renterId, p_move_in: v.moveIn, p_start: v.startDate, p_end: v.endDate,
      p_rent: v.monthlyRentCentavos, p_due_day: v.dueDay, p_advance: v.advanceMonths, p_deposit: v.depositCentavos,
    });
    if (error) throw rentalError(error, 'Could not start tenancy');
    return z.string().parse(data);
  }

  async end(id: string, moveOut: string): Promise<void> {
    const { error } = await getSupabase().rpc('rental_end_tenancy', { p_tenancy_id: id, p_move_out: moveOut });
    if (error) throw rentalError(error, 'Could not end tenancy');
  }
}
```

`packages/shared/src/modules/rentals/infrastructure/index.ts`:
```ts
export { PropertyRepository } from './PropertyRepository.js';
export { RenterRepository } from './RenterRepository.js';
export { TenancyRepository } from './TenancyRepository.js';
```

Replace `packages/shared/src/modules/rentals/index.ts`:
```ts
export * from './domain/index.js';
export * from './infrastructure/index.js';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npm run test:run -- src/modules/rentals/__tests__/`
Expected: PASS, both files.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/modules/rentals web/src/modules/rentals/__tests__/rentals.repository.test.ts
git commit -m "feat: add rentals repositories for properties, renters and tenancies" -m "Maps rows through zod and passes database rule messages through to the user.
Reserves renter file metadata before upload and cleans up failed uploads object-first."
```

---

### Task 5: Web wiring, hook, page shell with properties and units

**Files:**
- Modify: `web/vite.config.ts` (after line 18 `@government`), `web/vitest.config.ts` (after line 36), `web/tsconfig.app.json` (after lines 29–30)
- Modify: `web/src/router/index.tsx` (import near line 22; route after line 60)
- Modify: `web/src/layouts/components/Sidebar.tsx` (nav item after line 32; add `Building2` to the lucide import)
- Modify: `web/src/modules/dashboard/presentation/pages/DashboardPage.tsx` (moreApps after line 105; add `Building2` to the lucide import)
- Create: `web/src/modules/rentals/index.ts`
- Create: `web/src/modules/rentals/infrastructure/index.ts`
- Create: `web/src/modules/rentals/presentation/hooks/useRentals.ts`
- Create: `web/src/modules/rentals/presentation/utils/errorMessage.ts`
- Create: `web/src/modules/rentals/presentation/components/Field.tsx`
- Create: `web/src/modules/rentals/presentation/components/PropertyForm.tsx`
- Create: `web/src/modules/rentals/presentation/components/UnitForm.tsx`
- Create: `web/src/modules/rentals/presentation/pages/RentalsPage.tsx`
- Test: `web/src/modules/rentals/__tests__/RentalsPage.test.tsx`

**Interfaces:**
- Consumes: Task 4 repositories; `FriendRepository` from `@himan/shared/friends` (`getFriends(currentUserId): Promise<FriendType[]>`, where `FriendType.userId` is the other person and `.email` their email); `useAuth` from `@auth/index`.
- Produces:
  - `type RentalAction` (union below) and `useRentals()` returning `{ properties, renters, tenancies, loading, error, online, userId, busy, refetch, run(action: RentalAction): Promise<unknown>, fileUrl(id, download?): Promise<string>, listMembers(propertyId): Promise<RentalMember[]>, listFriends(): Promise<FriendType[]> }`
  - `errorMessage(error: unknown): string`
  - `<Field id label hint? children />`
  - `<PropertyForm property? busy onSave onCancel />`, `<UnitForm unit? busy onSave onCancel />`, where `onSave: (value) => Promise<void>`
  - `RentalsPage` exported from `@rentals`

- [ ] **Step 1: Write the failing page test**

`web/src/modules/rentals/__tests__/RentalsPage.test.tsx`:
```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RentalProperty } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: '', ownerName: '', ownerAddress: '',
  lessorName: 'Owner', lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '',
  invoicePrefix: 'INV', archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [{ id: 'u1', propertyId: 'p', name: 'Room A', kind: 'bedspace', capacity: 2, electricMode: 'none',
    electricAmountCentavos: 0, waterMode: 'none', waterAmountCentavos: 0 }],
};
const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as unknown[], tenancies: [] as unknown[],
  online: true, userId: 'owner', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));

beforeEach(() => { vi.clearAllMocks(); state.properties = [property]; state.renters = []; state.tenancies = []; });
const page = () => render(<MemoryRouter><RentalsPage /></MemoryRouter>);

describe('Rentals page — properties and units', () => {
  it('shows unit occupancy for the selected property', () => {
    page();
    expect(screen.getByText('Room A')).toBeInTheDocument();
    expect(screen.getByText('0 / 2 occupied')).toBeInTheDocument();
  });
  it('hides owner-only controls from a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    page();
    expect(screen.queryByRole('button', { name: 'Add unit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });
  it('keeps the unit form open with a readable error when the rate is not a peso amount', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add unit' }));
    fireEvent.change(screen.getByLabelText('Unit name'), { target: { value: 'Room B' } });
    fireEvent.change(screen.getByLabelText('Electricity'), { target: { value: 'submeter' } });
    fireEvent.change(screen.getByLabelText('Electricity rate per kWh'), { target: { value: 'twelve' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save unit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter an amount like 10,000 or 1,500.50');
    expect(state.run).not.toHaveBeenCalled();
  });
  it('saves a unit in centavos', async () => {
    state.run.mockResolvedValue(undefined);
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add unit' }));
    fireEvent.change(screen.getByLabelText('Unit name'), { target: { value: 'Room B' } });
    fireEvent.change(screen.getByLabelText('Electricity'), { target: { value: 'submeter' } });
    fireEvent.change(screen.getByLabelText('Electricity rate per kWh'), { target: { value: '12.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save unit' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveUnit', propertyId: 'p', id: null,
      input: expect.objectContaining({ name: 'Room B', electricMode: 'submeter', electricAmountCentavos: 1250 }) }));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd web && npm run test:run -- src/modules/rentals/__tests__/RentalsPage.test.tsx`
Expected: FAIL. `../presentation/pages/RentalsPage` cannot be resolved.

- [ ] **Step 3: Wire aliases, route, nav**

`web/vite.config.ts` and `web/vitest.config.ts`, after the `@government` line:
```ts
      '@rentals': path.resolve(__dirname, './src/modules/rentals'),
```
`web/tsconfig.app.json`, after the two `@government` lines:
```json
      "@rentals": ["src/modules/rentals/index.ts"],
      "@rentals/*": ["src/modules/rentals/*"],
```
`web/src/router/index.tsx`: add `import { RentalsPage } from '@rentals';` after the `@government` import, and `<Route path="/rentals" element={<RentalsPage />} />` after the `/government` route.
`Sidebar.tsx`: `{ path: '/rentals', label: 'Rentals', icon: Building2 },` after the Government item.
`DashboardPage.tsx`: `{ to: "/rentals", icon: Building2, label: "Rentals", color: "from-amber-400 to-orange-600" },` after the Government tile.

`web/src/modules/rentals/index.ts`:
```ts
export { RentalsPage } from './presentation/pages/RentalsPage';
```
`web/src/modules/rentals/infrastructure/index.ts`:
```ts
export { PropertyRepository, RenterRepository, TenancyRepository } from '@himan/shared/rentals';
```

- [ ] **Step 4: Write the hook and helpers**

`web/src/modules/rentals/presentation/hooks/useRentals.ts`:
```ts
import { useMemo, useSyncExternalStore } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@auth/index';
import { FriendRepository } from '@himan/shared/friends';
import type { PropertyInput, RenterInput, StartTenancyInput, UnitInput } from '@himan/shared/rentals';
import { PropertyRepository, RenterRepository, TenancyRepository } from '../../infrastructure';

export type RentalAction =
  | { type: 'saveProperty'; id: string | null; input: PropertyInput }
  | { type: 'archiveProperty'; id: string; archived: boolean }
  | { type: 'removeProperty'; id: string }
  | { type: 'saveUnit'; propertyId: string; id: string | null; input: UnitInput }
  | { type: 'removeUnit'; id: string }
  | { type: 'saveRenter'; propertyId: string; id: string | null; input: RenterInput }
  | { type: 'removeRenter'; id: string }
  | { type: 'uploadRenterFile'; renterId: string; propertyId: string; file: { name: string; mimeType?: string | null; bytes: ArrayBuffer } }
  | { type: 'removeRenterFile'; id: string }
  | { type: 'startTenancy'; input: StartTenancyInput }
  | { type: 'endTenancy'; id: string; moveOut: string }
  | { type: 'addMember'; propertyId: string; userId: string; role: 'manager' | 'viewer' }
  | { type: 'removeMember'; propertyId: string; userId: string };

export function useRentals() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repos = useMemo(() => ({ properties: new PropertyRepository(), renters: new RenterRepository(),
    tenancies: new TenancyRepository(), friends: new FriendRepository() }), []);
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  const query = useQuery({
    queryKey: ['rentals', userId], enabled: !!userId && online,
    meta: { sensitive: true }, gcTime: 0, staleTime: 0, retry: false, refetchOnMount: 'always', networkMode: 'always',
    queryFn: async () => {
      const [properties, renters, tenancies] = await Promise.all([
        repos.properties.findAll(userId!), repos.renters.findAll(), repos.tenancies.findAll()]);
      return { properties, renters, tenancies };
    },
  });
  const mutation = useMutation({
    meta: { sensitive: true }, retry: false, gcTime: 0, networkMode: 'always',
    mutationFn: async (a: RentalAction) => {
      if (!userId) throw new Error('Sign in to manage rentals');
      if (!onlineManager.isOnline()) throw new Error('Connect to the internet to continue');
      switch (a.type) {
        case 'saveProperty': return repos.properties.save(a.id, a.input);
        case 'archiveProperty': return repos.properties.setArchived(a.id, a.archived);
        case 'removeProperty': return repos.properties.remove(a.id);
        case 'saveUnit': return repos.properties.saveUnit(a.propertyId, a.id, a.input);
        case 'removeUnit': return repos.properties.removeUnit(a.id);
        case 'saveRenter': return repos.renters.save(a.propertyId, a.id, a.input);
        case 'removeRenter': return repos.renters.remove(a.id);
        case 'uploadRenterFile': return repos.renters.upload(a.renterId, a.propertyId, a.file);
        case 'removeRenterFile': return repos.renters.removeFile(a.id);
        case 'startTenancy': return repos.tenancies.start(a.input);
        case 'endTenancy': return repos.tenancies.end(a.id, a.moveOut);
        case 'addMember': return repos.properties.addMember(a.propertyId, a.userId, a.role);
        case 'removeMember': return repos.properties.removeMember(a.propertyId, a.userId);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['rentals'] }),
  });
  const data = online && userId ? query.data : undefined;
  return {
    properties: data?.properties ?? [], renters: data?.renters ?? [], tenancies: data?.tenancies ?? [],
    loading: query.isLoading, error: query.error, online, userId, busy: mutation.isPending,
    refetch: query.refetch, run: mutation.mutateAsync,
    fileUrl: (id: string, download = false) => repos.renters.fileUrl(id, download),
    listMembers: (propertyId: string) => repos.properties.listMembers(propertyId),
    listFriends: () => repos.friends.getFriends(userId!),
  };
}
```

`web/src/modules/rentals/presentation/utils/errorMessage.ts`:
```ts
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : 'Something went wrong. Retry when connected.';
}
```

`web/src/modules/rentals/presentation/components/Field.tsx`:
```tsx
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

export function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return <div className="space-y-2">
    <Label htmlFor={id}>{label}{hint && <span className="text-muted-foreground"> ({hint})</span>}</Label>
    {children}
  </div>;
}

export const inputClass = 'h-11 w-full rounded-xl border border-input bg-background px-3 text-base';
```

- [ ] **Step 5: Write the property and unit forms**

`web/src/modules/rentals/presentation/components/PropertyForm.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { propertySchema, LESSOR_CAPACITIES } from '@himan/shared/rentals';
import type { PropertyInput, RentalProperty } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: PropertyInput = { name: '', address: '', ownerName: '', ownerAddress: '', lessorName: '',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV' };
const TEXT_FIELDS: [keyof PropertyInput, string, string?][] = [
  ['name', 'Property name'], ['address', 'Property address'], ['ownerName', 'Owner name', 'if not you'],
  ['ownerAddress', 'Owner address'], ['lessorName', 'Lessor name', 'blank uses your profile'],
  ['lessorCivilStatus', 'Lessor civil status'], ['lessorAddress', 'Lessor address'],
  ['signingCity', 'City where contracts are signed'], ['invoicePrefix', 'Invoice prefix'],
];

export function PropertyForm({ property, busy, onSave, onCancel }: {
  property?: RentalProperty; busy: boolean; onSave: (value: PropertyInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<PropertyInput>(() => property ? { ...empty, ...pick(property) } : empty);
  const [error, setError] = useState('');
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    const result = propertySchema.safeParse(form);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try { await onSave(result.data); } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="space-y-4">
      {TEXT_FIELDS.map(([key, label, hint]) => <Field key={key} id={`property-${key}`} label={label} hint={hint}>
        <input id={`property-${key}`} className={inputClass} value={form[key]}
          onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} />
      </Field>)}
      <Field id="property-capacity" label="Lessor signs as">
        <select id="property-capacity" className={inputClass} value={form.lessorCapacity}
          onChange={(event) => setForm((previous) => ({ ...previous, lessorCapacity: event.target.value as PropertyInput['lessorCapacity'] }))}>
          {LESSOR_CAPACITIES.map((value) => <option key={value} value={value}>
            {value === 'owner' ? 'Owner' : 'Authorized representative of the owner'}</option>)}
        </select>
      </Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save property</Button>
      </div>
    </fieldset>
  </form>;
}

function pick(p: RentalProperty): PropertyInput {
  return { name: p.name, address: p.address, ownerName: p.ownerName, ownerAddress: p.ownerAddress,
    lessorName: p.lessorName, lessorCivilStatus: p.lessorCivilStatus, lessorAddress: p.lessorAddress,
    lessorCapacity: p.lessorCapacity, signingCity: p.signingCity, invoicePrefix: p.invoicePrefix };
}
```

`web/src/modules/rentals/presentation/components/UnitForm.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { centavosToInput, parsePesos, unitSchema, UNIT_KINDS, UTILITY_MODES } from '@himan/shared/rentals';
import type { RentalUnit, UnitInput } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

type Utility = 'electric' | 'water';
const KIND_LABEL = { whole: 'Whole house', room: 'Room', bedspace: 'Bedspace (shared room)' } as const;
const RATE_LABEL = { electric: 'Electricity rate per kWh', water: 'Water rate per m³' } as const;
const FIXED_LABEL = { electric: 'Electricity monthly amount', water: 'Water monthly amount' } as const;

export function UnitForm({ unit, busy, onSave, onCancel }: {
  unit?: RentalUnit; busy: boolean; onSave: (value: UnitInput) => Promise<void>; onCancel: () => void;
}) {
  const [name, setName] = useState(unit?.name ?? '');
  const [kind, setKind] = useState<UnitInput['kind']>(unit?.kind ?? 'room');
  const [capacity, setCapacity] = useState(String(unit?.capacity ?? 1));
  const [modes, setModes] = useState({ electric: unit?.electricMode ?? 'none', water: unit?.waterMode ?? 'none' });
  const [amounts, setAmounts] = useState({ electric: centavosToInput(unit?.electricAmountCentavos ?? 0),
    water: centavosToInput(unit?.waterAmountCentavos ?? 0) });
  const [error, setError] = useState('');

  const utility = (key: Utility, label: string) => <>
    <Field id={`unit-${key}`} label={label}>
      <select id={`unit-${key}`} className={inputClass} value={modes[key]}
        onChange={(event) => setModes((m) => ({ ...m, [key]: event.target.value as UnitInput['electricMode'] }))}>
        {UTILITY_MODES.map((mode) => <option key={mode} value={mode}>
          {{ none: 'Not billed', submeter: 'Submeter reading × rate', fixed: 'Fixed monthly amount' }[mode]}</option>)}
      </select>
    </Field>
    {modes[key] !== 'none' && <Field id={`unit-${key}-amount`} label={modes[key] === 'submeter' ? RATE_LABEL[key] : FIXED_LABEL[key]}>
      <input id={`unit-${key}-amount`} inputMode="decimal" className={inputClass} value={amounts[key]}
        onChange={(event) => setAmounts((a) => ({ ...a, [key]: event.target.value }))} />
    </Field>}
  </>;

  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const amount = (key: Utility) => (modes[key] === 'none' ? 0 : parsePesos(amounts[key]));
      const result = unitSchema.safeParse({ name, kind, capacity: kind === 'bedspace' ? Number(capacity) : 1,
        electricMode: modes.electric, electricAmountCentavos: amount('electric'),
        waterMode: modes.water, waterAmountCentavos: amount('water') });
      if (!result.success) { setError(result.error.issues[0].message); return; }
      setError('');
      await onSave(result.data);
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="space-y-4">
      <Field id="unit-name" label="Unit name">
        <input id="unit-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field id="unit-kind" label="Type">
        <select id="unit-kind" className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as UnitInput['kind'])}>
          {UNIT_KINDS.map((value) => <option key={value} value={value}>{KIND_LABEL[value]}</option>)}
        </select>
      </Field>
      {kind === 'bedspace' && <Field id="unit-capacity" label="Beds">
        <input id="unit-capacity" type="number" min={1} max={50} className={inputClass} value={capacity}
          onChange={(event) => setCapacity(event.target.value)} />
      </Field>}
      {utility('electric', 'Electricity')}
      {utility('water', 'Water')}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save unit</Button>
      </div>
    </fieldset>
  </form>;
}
```

- [ ] **Step 6: Write the page shell (Units tab only; Renters/Tenancies tabs come in Tasks 6–7)**

`web/src/modules/rentals/presentation/pages/RentalsPage.tsx`:
```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPesos, hasRentalRole, unitOccupancy } from '@himan/shared/rentals';
import type { RentalUnit } from '@himan/shared/rentals';
import { useRentals } from '../hooks/useRentals';
import type { RentalAction } from '../hooks/useRentals';
import { PropertyForm } from '../components/PropertyForm';
import { UnitForm } from '../components/UnitForm';
import { inputClass } from '../components/Field';
import { errorMessage } from '../utils/errorMessage';

export type RentalsState = ReturnType<typeof useRentals>;
type DialogState = { type: 'property'; id: string | null } | { type: 'unit'; id: string | null } | null;

export function RentalsPage() {
  const rentals = useRentals();
  return <RentalsContent key={rentals.userId ?? 'signed-out'} {...rentals} />;
}

function RentalsContent(state: RentalsState) {
  const { properties, tenancies, loading, error, online, userId, busy, run, refetch } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const ordered = [...properties].sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt));
  const property = ordered.find((p) => p.id === selectedId) ?? ordered[0];
  const role = property?.role;
  const act = async (action: RentalAction, message: string) => { await run(action); toast.success(message); setDialog(null); };
  const tryAct = (action: RentalAction, message: string) => act(action, message).catch((e) => toast.error(errorMessage(e)));
  const editingUnit = dialog?.type === 'unit' ? property?.units.find((u) => u.id === dialog.id) : undefined;

  return <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Building2 className="h-8 w-8 text-primary" />Rentals</h1>
        <p className="mt-2 text-muted-foreground">Your properties, renters and tenancies.</p></div>
      <Button onClick={() => setDialog({ type: 'property', id: null })} disabled={!online || !userId || busy}><Plus className="h-4 w-4" />New property</Button>
    </header>

    {!online ? <div role="status" className="rounded-xl border p-6 text-center">Connect to the internet to manage rentals.</div>
      : !userId ? <p>Sign in to manage rentals.</p>
      : loading ? <p role="status">Loading…</p>
      : error ? <div role="alert" className="rounded-xl border p-6 text-center"><p>Could not load rentals.</p>
          <Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>
      : !property ? <div className="rounded-xl border p-10 text-center"><p className="font-medium">No properties yet</p>
          <p className="mt-2 text-muted-foreground">Add your house first, then its rooms or bedspaces.</p></div>
      : <>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="rentals-property">Property</label>
          <select id="rentals-property" className={`${inputClass} max-w-xs`} value={property.id} onChange={(e) => setSelectedId(e.target.value)}>
            {ordered.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archivedAt ? ' (archived)' : ''}</option>)}
          </select>
          <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{role}</span>
          {hasRentalRole(role, 'owner') && <>
            <Button variant="outline" onClick={() => setDialog({ type: 'property', id: property.id })}><Pencil className="h-4 w-4" />Edit</Button>
            <Button variant="outline" onClick={() => void tryAct({ type: 'archiveProperty', id: property.id, archived: !property.archivedAt },
              property.archivedAt ? 'Property restored' : 'Property archived')}>{property.archivedAt ? 'Unarchive' : 'Archive'}</Button>
          </>}
        </div>

        <Tabs defaultValue="units">
          <TabsList><TabsTrigger value="units">Units</TabsTrigger></TabsList>
          <TabsContent value="units" className="mt-4 space-y-3">
            {hasRentalRole(role, 'owner') && <Button onClick={() => setDialog({ type: 'unit', id: null })}><Plus className="h-4 w-4" />Add unit</Button>}
            {property.units.length === 0 && <p className="text-muted-foreground">No units yet. A whole house is one unit; rooms and bedspaces are one unit each.</p>}
            {property.units.map((unit) => <UnitRow key={unit.id} unit={unit} canEdit={hasRentalRole(role, 'owner')}
              occupancy={unitOccupancy(unit, tenancies)} onEdit={() => setDialog({ type: 'unit', id: unit.id })}
              onRemove={() => void tryAct({ type: 'removeUnit', id: unit.id }, 'Unit deleted')} />)}
          </TabsContent>
        </Tabs>
      </>}

    <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {dialog?.type === 'property' && <>
          <DialogHeader><DialogTitle>{dialog.id ? 'Edit property' : 'New property'}</DialogTitle>
            <DialogDescription>Lessor details appear on contracts.</DialogDescription></DialogHeader>
          <PropertyForm property={dialog.id ? property : undefined} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (input) => { await act({ type: 'saveProperty', id: dialog.id, input }, 'Property saved'); }} />
        </>}
        {dialog?.type === 'unit' && property && <>
          <DialogHeader><DialogTitle>{dialog.id ? 'Edit unit' : 'Add unit'}</DialogTitle>
            <DialogDescription>Rates are what you charge, not Meralco’s.</DialogDescription></DialogHeader>
          <UnitForm unit={editingUnit} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (input) => { await act({ type: 'saveUnit', propertyId: property.id, id: dialog.id, input }, 'Unit saved'); }} />
        </>}
      </DialogContent>
    </Dialog>
  </div>;
}

function UnitRow({ unit, occupancy, canEdit, onEdit, onRemove }: {
  unit: RentalUnit; occupancy: { occupied: number; capacity: number }; canEdit: boolean; onEdit: () => void; onRemove: () => void;
}) {
  const utility = (mode: string, amount: number, per: string) =>
    mode === 'none' ? null : mode === 'fixed' ? `${formatPesos(amount)}/mo` : `${formatPesos(amount)}/${per}`;
  const bills = [utility(unit.electricMode, unit.electricAmountCentavos, 'kWh'), utility(unit.waterMode, unit.waterAmountCentavos, 'm³')].filter(Boolean);
  return <div className="flex items-center justify-between rounded-xl border p-4">
    <div><p className="font-medium">{unit.name}</p>
      <p className="text-sm text-muted-foreground">{occupancy.occupied} / {occupancy.capacity} occupied{bills.length ? ` · ${bills.join(' · ')}` : ''}</p></div>
    {canEdit && <div className="flex gap-2">
      <Button variant="ghost" size="icon" aria-label={`Edit ${unit.name}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${unit.name}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
    </div>}
  </div>;
}
```

`act` throws on failure on purpose: the forms catch it and keep the dialog open with the message (government pattern). Row buttons use `tryAct`, which shows a toast.

- [ ] **Step 7: Run tests, build, lint**

Run: `cd web && npm run test:run -- src/modules/rentals/ && npm run build && npx eslint src/modules/rentals`
Expected: all rentals tests PASS, build passes, no lint errors. The `Share` button doesn't exist yet, so the viewer test's `Share` assertion passes trivially until Task 7 adds it.

- [ ] **Step 8: Commit**

```bash
git add web/vite.config.ts web/vitest.config.ts web/tsconfig.app.json web/src/router/index.tsx web/src/layouts/components/Sidebar.tsx web/src/modules/dashboard/presentation/pages/DashboardPage.tsx web/src/modules/rentals
git commit -m "feat: add rentals page with properties and units" -m "Adds the /rentals route, navigation entries and a hook over the shared repositories.
Lets owners create, edit and archive properties and manage units with utility rates."
```

---

### Task 6: Renters tab with private ID files

**Files:**
- Create: `web/src/modules/rentals/presentation/components/RenterForm.tsx`
- Create: `web/src/modules/rentals/presentation/components/RenterFiles.tsx`
- Modify: `web/src/modules/rentals/presentation/pages/RentalsPage.tsx`
- Test: `web/src/modules/rentals/__tests__/RentalsPage.test.tsx` (append)

**Interfaces:**
- Consumes: `RentalsState` (Task 5), `RentalAction` `saveRenter` / `removeRenter` / `uploadRenterFile` / `removeRenterFile`, `fileUrl`.
- Produces: `<RenterForm renter? busy onSave onCancel />`, `<RenterFiles renter busy run fileUrl />`. `DialogState` gains `{ type: 'renter'; id: string | null }`.

- [ ] **Step 1: Append failing tests**

Add to `RentalsPage.test.tsx`:
```tsx
import type { Renter } from '@himan/shared/rentals';

const renter: Renter = { id: 'r1', propertyId: 'p', fullName: 'Juan Dela Cruz', phone: '0917', facebook: '', email: '',
  address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '',
  files: [{ id: 'f1', renterId: 'r1', propertyId: 'p', name: 'national-id.png', mimeType: 'image/png', size: 10, storagePath: 'p/renters/r1/f1', ready: true }] };

describe('Rentals page — renters', () => {
  it('lists only renters of the selected property', () => {
    state.renters = [renter, { ...renter, id: 'r2', propertyId: 'other', fullName: 'Other Person' }];
    page();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Renters' }));
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.queryByText('Other Person')).not.toBeInTheDocument();
  });
  it('never shows the ID files section to a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    state.renters = [renter];
    page();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Juan Dela Cruz' }));
    expect(screen.queryByText('Valid ID')).not.toBeInTheDocument();
    expect(screen.queryByText('national-id.png')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npm run test:run -- src/modules/rentals/__tests__/RentalsPage.test.tsx`
Expected: FAIL. There is no `Renters` tab.

- [ ] **Step 3: Implement the renter form and files**

`web/src/modules/rentals/presentation/components/RenterForm.tsx`:
```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { renterSchema } from '@himan/shared/rentals';
import type { Renter, RenterInput } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: RenterInput = { fullName: '', phone: '', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
const TEXT: [Exclude<keyof RenterInput, 'occupants' | 'notes'>, string, string][] = [
  ['fullName', 'Full name', 'name'], ['phone', 'Mobile number', 'tel'], ['facebook', 'Facebook / Messenger', 'off'],
  ['email', 'Email', 'email'], ['address', 'Home address', 'street-address'],
  ['emergencyName', 'Emergency contact name', 'off'], ['emergencyPhone', 'Emergency contact number', 'off'],
];

export function RenterForm({ renter, readOnly, busy, onSave, onCancel }: {
  renter?: Renter; readOnly: boolean; busy: boolean; onSave: (value: RenterInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<RenterInput>(() => renter ? {
    fullName: renter.fullName, phone: renter.phone, facebook: renter.facebook, email: renter.email, address: renter.address,
    emergencyName: renter.emergencyName, emergencyPhone: renter.emergencyPhone, occupants: renter.occupants, notes: renter.notes,
  } : empty);
  const [error, setError] = useState('');
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    const result = renterSchema.safeParse(form);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try { await onSave(result.data); } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy || readOnly} className="space-y-4">
      {TEXT.map(([key, label, autoComplete]) => <Field key={key} id={`renter-${key}`} label={label}>
        <input id={`renter-${key}`} className={inputClass} autoComplete={autoComplete} value={form[key]}
          onChange={(event) => setForm((f) => ({ ...f, [key]: event.target.value }))} />
      </Field>)}
      <Field id="renter-occupants" label="Occupants">
        <input id="renter-occupants" type="number" min={1} max={50} className={inputClass} value={form.occupants}
          onChange={(event) => setForm((f) => ({ ...f, occupants: Number(event.target.value) }))} />
      </Field>
      <Field id="renter-notes" label="Notes">
        <textarea id="renter-notes" className={`${inputClass} h-24 py-2`} value={form.notes}
          onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))} />
      </Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!readOnly && <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save renter</Button>
      </div>}
    </fieldset>
  </form>;
}
```

`web/src/modules/rentals/presentation/components/RenterFiles.tsx`:
```tsx
import { useState } from 'react';
import { Eye, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { validateRentalFile } from '@himan/shared/rentals';
import type { Renter, RenterFile } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { errorMessage } from '../utils/errorMessage';

export function RenterFiles({ renter, busy, run, fileUrl }: { renter: Renter } & Pick<RentalsState, 'busy' | 'run' | 'fileUrl'>) {
  const [uploading, setUploading] = useState(false);
  const open = async (file: RenterFile) => {
    const tab = window.open('about:blank', '_blank');
    if (!tab) { toast.error('Allow pop-ups to open this file'); return; }
    tab.opener = null;
    try { tab.location.replace(await fileUrl(file.id)); } catch (e) { tab.close(); toast.error(errorMessage(e)); }
  };
  const upload = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) validateRentalFile(file.name, file.type, file.size);
      for (const file of files) await run({ type: 'uploadRenterFile', renterId: renter.id, propertyId: renter.propertyId,
        file: { name: file.name, mimeType: file.type, bytes: await file.arrayBuffer() } });
      if (files.length) toast.success('ID attached');
    } catch (e) { toast.error(errorMessage(e)); } finally { setUploading(false); }
  };
  return <section className="space-y-3 border-t pt-4">
    <h3 className="font-medium">Valid ID</h3>
    {renter.files.map((file) => <div key={file.id} className="flex items-center justify-between rounded-lg border p-3">
      <span className="truncate text-sm">{file.name}{!file.ready && ' (incomplete)'}</span>
      <div className="flex gap-1">
        {file.ready && <Button variant="ghost" size="icon" aria-label={`View ${file.name}`} onClick={() => void open(file)}><Eye className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" aria-label={`Remove ${file.name}`} disabled={busy}
          onClick={() => void run({ type: 'removeRenterFile', id: file.id }).catch((e) => toast.error(errorMessage(e)))}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>)}
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm">
      <Upload className="h-4 w-4" />{uploading ? 'Uploading…' : 'Attach ID (PDF, JPEG, PNG · 10 MB)'}
      <input type="file" className="sr-only" multiple accept="application/pdf,image/jpeg,image/png" disabled={uploading || busy}
        onChange={(event) => { void upload([...(event.target.files ?? [])]); event.target.value = ''; }} />
    </label>
  </section>;
}
```

- [ ] **Step 4: Add the Renters tab to `RentalsPage.tsx`**

1. Imports: add `RenterForm`, `RenterFiles`, `UserRound` (lucide).
2. `DialogState`: add `| { type: 'renter'; id: string | null }`.
3. Destructure `renters, fileUrl` from `state`. Compute `const propertyRenters = state.renters.filter((r) => r.propertyId === property?.id);`.
4. In `<TabsList>` add `<TabsTrigger value="renters">Renters</TabsTrigger>`. Add this content after the units `TabsContent`:
```tsx
<TabsContent value="renters" className="mt-4 space-y-3">
  {hasRentalRole(role, 'manager') && <Button onClick={() => setDialog({ type: 'renter', id: null })}><Plus className="h-4 w-4" />Add renter</Button>}
  {propertyRenters.length === 0 && <p className="text-muted-foreground">No renters yet.</p>}
  {propertyRenters.map((r) => <button key={r.id} type="button" aria-label={`Open ${r.fullName}`}
    className="flex w-full items-center gap-3 rounded-xl border p-4 text-left hover:bg-muted/50"
    onClick={() => setDialog({ type: 'renter', id: r.id })}>
    <UserRound className="h-5 w-5 text-muted-foreground" />
    <span><span className="block font-medium">{r.fullName}</span>
      <span className="text-sm text-muted-foreground">{[r.phone, r.facebook].filter(Boolean).join(' · ') || 'No contact saved'}</span></span>
  </button>)}
</TabsContent>
```
5. In the dialog add:
```tsx
{dialog?.type === 'renter' && property && (() => {
  const renter = propertyRenters.find((r) => r.id === dialog.id);
  const canManage = hasRentalRole(role, 'manager');
  return <>
    <DialogHeader><DialogTitle>{renter ? renter.fullName : 'Add renter'}</DialogTitle>
      <DialogDescription>Contact details are visible to everyone you share this property with.</DialogDescription></DialogHeader>
    <RenterForm renter={renter} readOnly={!canManage} busy={busy} onCancel={() => setDialog(null)}
      onSave={async (input) => { await act({ type: 'saveRenter', propertyId: property.id, id: dialog.id, input }, 'Renter saved'); }} />
    {renter && canManage && <RenterFiles renter={renter} busy={busy} run={run} fileUrl={fileUrl} />}
    {renter && canManage && <Button variant="ghost" className="text-destructive"
      onClick={() => void tryAct({ type: 'removeRenter', id: renter.id }, 'Renter deleted')}><Trash2 className="h-4 w-4" />Delete renter</Button>}
  </>;
})()}
```

- [ ] **Step 5: Run tests and build**

Run: `cd web && npm run test:run -- src/modules/rentals/ && npm run build`
Expected: PASS, build passes. If Radix tabs don't switch on `click` in happy-dom, keep the `mouseDown` + `click` pair already in the tests. If they still fail, use `userEvent.click` from `@testing-library/user-event` if it's installed (`grep user-event web/package.json`).

- [ ] **Step 6: Commit**

```bash
git add web/src/modules/rentals
git commit -m "feat: add renters with private valid ID files" -m "Lets managers record renter contacts and attach ID files through 60-second signed URLs.
Hides ID files from viewers in both the database and the interface."
```

---

### Task 7: Tenancies tab — start, end, share with friends

**Files:**
- Create: `web/src/modules/rentals/presentation/components/StartTenancyForm.tsx`
- Create: `web/src/modules/rentals/presentation/components/ShareDialog.tsx`
- Modify: `web/src/modules/rentals/presentation/pages/RentalsPage.tsx`
- Test: `web/src/modules/rentals/__tests__/RentalsPage.test.tsx` (append)

**Interfaces:**
- Consumes: `startTenancySchema`, `parsePesos`, `manilaToday`, `unitOccupancy`, `formatPesos`. `RentalAction` `startTenancy` / `endTenancy` / `addMember` / `removeMember`. `listMembers`, `listFriends`. `date-fns` `addYears`, `format`, `parseISO`.
- Produces: `<StartTenancyForm units renters tenancies busy onSave onCancel />`, `<ShareDialog propertyId busy run listMembers listFriends />`. `DialogState` gains `{ type: 'tenancy' }` and `{ type: 'share' }`.

- [ ] **Step 1: Append failing tests**

```tsx
import type { RentalTenancy } from '@himan/shared/rentals';

const fullRoom = { id: 'u2', propertyId: 'p', name: 'Room B', kind: 'room' as const, capacity: 1, electricMode: 'none' as const,
  electricAmountCentavos: 0, waterMode: 'none' as const, waterAmountCentavos: 0 };
const active: RentalTenancy = { id: 't1', propertyId: 'p', unitId: 'u2', renterId: 'r1', moveIn: '2026-10-01', moveOut: null,
  contracts: [{ id: 'c1', tenancyId: 't1', startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 1000000,
    dueDay: 30, advanceMonths: 1, depositCentavos: 1000000, status: 'active' }] };

describe('Rentals page — tenancies and sharing', () => {
  const openTab = () => { fireEvent.mouseDown(screen.getByRole('tab', { name: 'Tenancies' })); fireEvent.click(screen.getByRole('tab', { name: 'Tenancies' })); };
  it('offers only units with a free slot when starting a tenancy', () => {
    state.properties = [{ ...property, units: [...property.units, fullRoom] }];
    state.renters = [renter]; state.tenancies = [active];
    page(); openTab();
    fireEvent.click(screen.getByRole('button', { name: 'Start tenancy' }));
    const options = [...(screen.getByLabelText('Unit') as HTMLSelectElement).options].map((o) => o.text);
    expect(options).toContain('Room A (2 free)');
    expect(options.some((o) => o.startsWith('Room B'))).toBe(false);
  });
  it('shows the active tenancy with its rent and due day', () => {
    state.properties = [{ ...property, units: [...property.units, fullRoom] }];
    state.renters = [renter]; state.tenancies = [active];
    page(); openTab();
    expect(screen.getByText('Juan Dela Cruz · Room B')).toBeInTheDocument();
    expect(screen.getByText(/₱10,000.00\/mo · due day 30/)).toBeInTheDocument();
  });
  it('lets the owner open sharing and hides it from managers', () => {
    page();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    state.properties = [{ ...property, role: 'manager' }];
    page();
    expect(screen.getAllByRole('button', { name: 'Share' })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd web && npm run test:run -- src/modules/rentals/__tests__/RentalsPage.test.tsx`
Expected: FAIL. There is no `Tenancies` tab and no `Share` button.

- [ ] **Step 3: Implement the start-tenancy form**

`web/src/modules/rentals/presentation/components/StartTenancyForm.tsx`:
```tsx
import { useState } from 'react';
import { addYears, format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { manilaToday, parsePesos, startTenancySchema, unitOccupancy } from '@himan/shared/rentals';
import type { RentalTenancy, RentalUnit, Renter, StartTenancyInput } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

export function StartTenancyForm({ units, renters, tenancies, busy, onSave, onCancel }: {
  units: RentalUnit[]; renters: Renter[]; tenancies: RentalTenancy[]; busy: boolean;
  onSave: (value: StartTenancyInput) => Promise<void>; onCancel: () => void;
}) {
  const open = units.map((u) => ({ unit: u, free: unitOccupancy(u, tenancies).free })).filter((u) => u.free > 0);
  const today = manilaToday();
  const [form, setForm] = useState({ unitId: open[0]?.unit.id ?? '', renterId: renters[0]?.id ?? '', moveIn: today,
    startDate: today, endDate: format(addYears(parseISO(today), 1), 'yyyy-MM-dd'), rent: '', dueDay: String(Number(today.slice(8))),
    advanceMonths: '1', deposit: '' });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  if (!open.length) return <p className="text-muted-foreground">Every unit is full. End a tenancy or add a unit first.</p>;
  if (!renters.length) return <p className="text-muted-foreground">Add the renter first in the Renters tab.</p>;

  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const monthlyRentCentavos = parsePesos(form.rent);
      const result = startTenancySchema.safeParse({ unitId: form.unitId, renterId: form.renterId, moveIn: form.moveIn,
        startDate: form.startDate, endDate: form.endDate, monthlyRentCentavos, dueDay: Number(form.dueDay),
        advanceMonths: Number(form.advanceMonths),
        depositCentavos: form.deposit.trim() ? parsePesos(form.deposit) : monthlyRentCentavos });
      if (!result.success) { setError(result.error.issues[0].message); return; }
      setError('');
      await onSave(result.data);
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      <Field id="tenancy-unit" label="Unit"><select id="tenancy-unit" className={inputClass} value={form.unitId} onChange={set('unitId')}>
        {open.map(({ unit, free }) => <option key={unit.id} value={unit.id}>{unit.name} ({free} free)</option>)}</select></Field>
      <Field id="tenancy-renter" label="Renter"><select id="tenancy-renter" className={inputClass} value={form.renterId} onChange={set('renterId')}>
        {renters.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}</select></Field>
      <Field id="tenancy-move-in" label="Move-in date"><input id="tenancy-move-in" type="date" className={inputClass} value={form.moveIn} onChange={set('moveIn')} /></Field>
      <Field id="tenancy-rent" label="Monthly rent"><input id="tenancy-rent" inputMode="decimal" className={inputClass} value={form.rent} onChange={set('rent')} placeholder="10,000" /></Field>
      <Field id="tenancy-start" label="Contract start"><input id="tenancy-start" type="date" className={inputClass} value={form.startDate} onChange={set('startDate')} /></Field>
      <Field id="tenancy-end" label="Contract end"><input id="tenancy-end" type="date" className={inputClass} value={form.endDate} onChange={set('endDate')} /></Field>
      <Field id="tenancy-due" label="Due day" hint="31 = last day of month"><input id="tenancy-due" type="number" min={1} max={31} className={inputClass} value={form.dueDay} onChange={set('dueDay')} /></Field>
      <Field id="tenancy-advance" label="Advance months"><input id="tenancy-advance" type="number" min={0} max={12} className={inputClass} value={form.advanceMonths} onChange={set('advanceMonths')} /></Field>
      <Field id="tenancy-deposit" label="Deposit" hint="blank = one month’s rent"><input id="tenancy-deposit" inputMode="decimal" className={inputClass} value={form.deposit} onChange={set('deposit')} /></Field>
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Start tenancy</Button>
      </div>
    </fieldset>
  </form>;
}
```

- [ ] **Step 4: Implement the share dialog**

`web/src/modules/rentals/presentation/components/ShareDialog.tsx`:
```tsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { RentalsState } from '../pages/RentalsPage';
import { inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

export function ShareDialog({ propertyId, busy, run, listMembers, listFriends }:
  { propertyId: string } & Pick<RentalsState, 'busy' | 'run' | 'listMembers' | 'listFriends'>) {
  const client = useQueryClient();
  const members = useQuery({ queryKey: ['rental-members', propertyId], queryFn: () => listMembers(propertyId), meta: { sensitive: true }, gcTime: 0 });
  const friends = useQuery({ queryKey: ['rental-friends'], queryFn: listFriends, gcTime: 0 });
  const memberIds = new Set(members.data?.map((m) => m.userId));
  const candidates = (friends.data ?? []).filter((f) => !memberIds.has(f.userId));
  const [friendId, setFriendId] = useState('');
  const [role, setRole] = useState<'manager' | 'viewer'>('viewer');
  const refresh = () => client.invalidateQueries({ queryKey: ['rental-members', propertyId] });
  const share = async () => {
    try { await run({ type: 'addMember', propertyId, userId: friendId || candidates[0].userId, role }); toast.success('Shared'); setFriendId(''); }
    catch (e) { toast.error(errorMessage(e)); } finally { void refresh(); }
  };
  return <div className="space-y-4">
    <ul className="space-y-2">{members.data?.map((m) => <li key={m.userId} className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{m.email} · <span className="capitalize">{m.role}</span></span>
      {m.role !== 'owner' && <Button variant="ghost" size="icon" aria-label={`Remove ${m.email}`} disabled={busy}
        onClick={() => void run({ type: 'removeMember', propertyId, userId: m.userId })
          .catch((e) => toast.error(errorMessage(e))).finally(() => void refresh())}><Trash2 className="h-4 w-4" /></Button>}
    </li>)}</ul>
    {candidates.length === 0 ? <p className="text-sm text-muted-foreground">Add friends in the Friends page to share this property.</p>
      : <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="share-friend">Friend</label>
        <select id="share-friend" className={`${inputClass} flex-1`} value={friendId || candidates[0].userId} onChange={(e) => setFriendId(e.target.value)}>
          {candidates.map((f) => <option key={f.userId} value={f.userId}>{f.email}</option>)}</select>
        <label className="sr-only" htmlFor="share-role">Role</label>
        <select id="share-role" className={`${inputClass} w-36`} value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'viewer')}>
          <option value="viewer">Viewer</option><option value="manager">Manager</option></select>
        <Button disabled={busy} onClick={() => void share()}>Share</Button>
      </div>}
    <p className="text-xs text-muted-foreground">Managers handle renters and tenancies. Viewers can only look. Neither can see renter IDs unless they’re a manager.</p>
  </div>;
}
```

Note: the dialog's own submit button is also labelled "Share". The page test counts `Share` buttons with the dialog closed, so it isn't affected.

- [ ] **Step 5: Add the Tenancies tab, Share button and dialogs to `RentalsPage.tsx`**

1. Imports: `StartTenancyForm`, `ShareDialog`, `Share2` (lucide), `manilaToday` (shared), and add `RentalTenancy` to the existing `import type { RentalUnit } from '@himan/shared/rentals'`.
2. `DialogState`: add `| { type: 'tenancy' } | { type: 'share' }`.
3. Next to the owner Edit/Archive buttons:
   `<Button variant="outline" onClick={() => setDialog({ type: 'share' })}><Share2 className="h-4 w-4" />Share</Button>`
4. Compute:
```tsx
const propertyTenancies = tenancies.filter((t) => t.propertyId === property?.id);
const label = (t: RentalTenancy) => `${state.renters.find((r) => r.id === t.renterId)?.fullName ?? 'Renter'} · ${property?.units.find((u) => u.id === t.unitId)?.name ?? 'Unit'}`;
```
5. Tab trigger `<TabsTrigger value="tenancies">Tenancies</TabsTrigger>` and content:
```tsx
<TabsContent value="tenancies" className="mt-4 space-y-3">
  {hasRentalRole(role, 'manager') && <Button onClick={() => setDialog({ type: 'tenancy' })}><Plus className="h-4 w-4" />Start tenancy</Button>}
  {(['Active', 'Ended'] as const).map((group) => {
    const rows = propertyTenancies.filter((t) => (group === 'Active') === (t.moveOut === null));
    return rows.length > 0 && <section key={group} className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{group}</h2>
      {rows.map((t) => { const c = t.contracts[0]; return <div key={t.id} className="flex items-center justify-between rounded-xl border p-4">
        <div><p className="font-medium">{label(t)}</p>
          <p className="text-sm text-muted-foreground">{c ? `${formatPesos(c.monthlyRentCentavos)}/mo · due day ${c.dueDay} · ${c.startDate} → ${c.endDate}` : 'No contract'}
            {t.moveOut && ` · moved out ${t.moveOut}`}</p></div>
        {!t.moveOut && hasRentalRole(role, 'manager') && <Button variant="outline"
          onClick={() => void tryAct({ type: 'endTenancy', id: t.id, moveOut: manilaToday() }, 'Tenancy ended')}>End today</Button>}
      </div>; })}
    </section>;
  })}
  {propertyTenancies.length === 0 && <p className="text-muted-foreground">No tenancies yet.</p>}
</TabsContent>
```
6. Dialog branches:
```tsx
{dialog?.type === 'tenancy' && property && <>
  <DialogHeader><DialogTitle>Start tenancy</DialogTitle>
    <DialogDescription>Advance pays the first month. Deposit is held until move-out.</DialogDescription></DialogHeader>
  <StartTenancyForm units={property.units} renters={propertyRenters} tenancies={tenancies} busy={busy} onCancel={() => setDialog(null)}
    onSave={async (input) => { await act({ type: 'startTenancy', input }, 'Tenancy started'); }} />
</>}
{dialog?.type === 'share' && property && <>
  <DialogHeader><DialogTitle>Share {property.name}</DialogTitle>
    <DialogDescription>Only accepted friends can be added.</DialogDescription></DialogHeader>
  <ShareDialog propertyId={property.id} busy={busy} run={run} listMembers={state.listMembers} listFriends={state.listFriends} />
</>}
```

"End today" is Phase 1's minimal move-out. Phase 4 replaces it with the settlement screen.

- [ ] **Step 6: Run tests, build, lint**

Run: `cd web && npm run test:run -- src/modules/rentals/ && npm run build && npx eslint src/modules/rentals`
Expected: all PASS, build passes, no lint errors.

- [ ] **Step 7: Manual check against local Supabase**

`cd web && npm run dev` with `.env.local` pointing to the local stack (`VITE_SUPABASE_URL=http://127.0.0.1:54321` and the anon key from `supabase status`). Sign in as a local test user and:
1. Create a property → it appears with role `owner`.
2. Add "Room A" (bedspace, 2 beds, submeter ₱12.50/kWh) → shows `0 / 2 occupied · ₱12.50/kWh`.
3. Add 3 renters, start 2 tenancies in Room A, try a 3rd → the Unit select shows no Room A option.
4. End one → Room A shows `1 / 2`.
Note results in Task 8's doc. If the browser pane or sign-in isn't available, say so and don't claim it was checked.

- [ ] **Step 8: Commit**

```bash
git add web/src/modules/rentals
git commit -m "feat: add tenancies and friend sharing to rentals" -m "Starts a tenancy and its contract terms together and offers only units with a free slot.
Ends a tenancy as of today in Manila time.
Lets owners share a property with accepted friends as manager or viewer."
```

---

### Task 8: Docs and orientation map

**Files:**
- Create: `docs/modules/rentals.md`
- Modify: `docs/MAP.md` (module table row after `government`)
- Modify: `CLAUDE.md` (shared subpath list: add `@himan/shared/rentals`)

**Interfaces:** none.

- [ ] **Step 1: Write `docs/modules/rentals.md`**

```markdown
---
type: module
area: rentals
status: phase-1
---

# Rentals

Landlord-side rent management. Spec: [[2026-10-16-rentals-design]]. Plan: [[2026-10-16-rentals-phase-1-foundation]].

## Layers
- Shared: `packages/shared/src/modules/rentals/` — domain (money in centavos, roles, schemas) + repositories.
- Web: `web/src/modules/rentals/` — `/rentals` page (Units · Renters · Tenancies), `useRentals` hook.
- DB: `supabase/migrations/20261016000000_create_rentals_module.sql`; assertions `supabase/tests/rentals.sql`.

## Access model
Per property via `rental_property_members` (owner/manager/viewer). Every policy calls
`rental_has_role`. Sharing only with accepted friends via `rental_add_member`.
Renter ID files: bucket `rental-files` (private), managers only, 60-second signed URLs.

## Invariants (enforced in Postgres)
- Active tenancies per unit ≤ capacity (row-locked trigger). Non-bedspace capacity = 1.
- Tenancies never deleted; unit/renter of a tenancy immutable.
- Property with tenancy history can't be deleted → archive.

## Blast radius
Self-contained. Depends on `friends` (friendships table, `FriendRepository`) and `profiles` (lessor defaults).

## Verification (fill in when done)
Tests: …  SQL assertions: …  Manual: …
```

- [ ] **Step 2: Update MAP and CLAUDE.md**

`docs/MAP.md` module table, after the government row:
`| rentals | shared·web | — | [[rentals]]; per-property roles, capacity-guarded tenancies |`

`CLAUDE.md`, in the `@himan/shared/...` code block after `@himan/shared/grocery`: `@himan/shared/rentals`.

- [ ] **Step 3: Fill in verification and commit**

Run the full suite once: `cd web && npm run test:run` and the SQL test. Write the actual counts and results into the "Verification" section. Then:

```bash
git add docs/modules/rentals.md docs/MAP.md CLAUDE.md
git commit -m "docs: document rentals module phase 1"
```

---

## Next plans (not in this plan)

- **Phase 2 — Billing & payments:** `rental_meter_readings`, `rental_invoices` + lines + per-property numbering, `rental_payment_accounts` (public QR bucket), `rental_payments` + proofs + allocations, `dueDateFor()` clamp, oldest-first allocation, derived status, billing screen, `@react-pdf/renderer` invoice + acknowledgment receipt, dashboard tiles. Add MicroRealEstate's "lost payments" guard: block contract date edits that would orphan allocated payments.
- **Phase 3 — Contracts & renter link:** clause templates (seeded from the owner's sample with placeholders), `to-words` en-PH amounts, frozen snapshot + SHA-256, `signature_pad`, share token RPCs for `anon`, sign modes, notarized scan upload, contract PDF, renewals.
- **Phase 4 — Move-out settlement**, then mobile port via `/port-web-to-mobile`.
