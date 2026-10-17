---
type: module
area: rentals
status: phase-1
---

# Rentals

Landlord-side rent management. Spec: [[2026-10-16-rentals-design]]. Plan: [[2026-10-16-rentals-phase-1-foundation]].

## Layers
- Shared: `packages/shared/src/modules/rentals/` — domain (money in centavos, roles, schemas) + repositories.
- Shared flows: `infrastructure/flows.ts` — `addTenant` (creates tenant + move-in, removes the new tenant if the
  move-in fails) and `setupProperty` (property + rooms, reports failed room names). Domain `flow.ts`:
  `moveInDefaults`, `roomSpots`.
- Web: `web/src/modules/rentals/` — `/rentals` page, flow v2 (plain words for non-technical users):
  Property side list with bed meters · stats (beds taken, monthly rent, free beds) · "Rent due in the next 7 days"
  (domain `nextDueDate`, Manila today) · Rooms board (`RoomsBoard`, one line per bed, Full / N free pill,
  "+ Add tenant" on free beds) · Tenants view (`TenantsList`, table: room, rent, since).
  Dialogs: `SetupWizard` (new property, 3 steps), `AddTenantForm`, `TenantSheet` (right side panel: call/text/move out, rent + next due, contract, ID, read-only contact with Edit, history),
  `MoveOutDialog` (dated), `UnitForm` (room), `PropertyForm` (edit; contract details collapsed), `ShareDialog`.
  UI words: Room / Shared room / Tenant / Move in / Move out; DB keeps unit / bedspace / renter / tenancy.
- DB: `supabase/migrations/20261016000000_create_rentals_module.sql`, `20261016100000_add_rental_unit_default_rent.sql`
  (`rental_units.default_rent_centavos`, 0 = not set; `extra_person_rent_centavos`, rent = usual + extra × (people − 1),
  domain `roomRent`, prefills Add tenant from "People living in the room"); assertions `supabase/tests/rentals.sql`.

## Access model
Per property via `rental_property_members` (owner/manager/viewer). Every policy calls
`rental_has_role`. Sharing only with accepted friends via `rental_add_member`; only owners
can list members (emails). UPDATE grants are column-scoped: ownership and parent keys
(`property_id`, `user_id`, `tenancy_id`, `unit_id`, `renter_id`, `created_by`) are immutable.
Renter ID files: bucket `rental-files` (private), managers only, 60-second signed URLs.

## Invariants (enforced in Postgres)
- Active tenancies per unit ≤ capacity (row-locked trigger). Non-bedspace capacity = 1.
- One active tenancy per renter per unit; one active contract per tenancy.
- Tenancies never deleted; ending one sets `move_out` and ends its active contract.
- Property with tenancy history can't be deleted → archive.

## Blast radius
Self-contained. Depends on `friends` (friendships table, `FriendRepository`) and `profiles` (lessor defaults).

## Verification (2026-10-16)
- Web Vitest (flow v2): 51 rentals tests (domain, repository, flows, page); full suite 182/182; build ok.
  Earlier phase-1 run: 30 rentals tests, 161/161.
- SQL: `supabase/tests/rentals.sql` passes against all migrations in an isolated local
  Supabase (ports 544xx); fixtures roll back.
- Integration (temporary, not committed): repositories against real PostgREST/RLS/Storage —
  insert-returning, membership embed filter, capacity error, upload + signed URL, end, delete
  block, archive, member list.
- Manual (in-app browser, local stack): property → bedspace unit → two tenancies → "Every unit
  is full" → end one. Share dialog not exercised in a browser (needs a second friend account).
- `@react-pdf/renderer` spike: builds; ₱ needs `Font.register` (Phase 2).

- Remote (2026-10-16): applied alone to the linked Himan project with `supabase db query --linked -f`
  inside one transaction, then `supabase migration repair --status applied 20261016000000`.
  Verified: 7 tables with RLS, 25 table policies, private `rental-files` bucket, no anon EXECUTE,
  member `user_id` not updatable. `db push` was avoided: remote history has 3 remote-only
  versions (20261003143028/143636/144108) and 3 local-only portfolio versions (20261003200000/210000/220000).

## Deploy order
- Done 2026-10-16: `20261016100000` applied alone to the linked Himan project (`db query --linked -f`, one
  transaction) and recorded with `migration repair --status applied 20261016100000`. Verified: integer NOT NULL
  DEFAULT 0, `authenticated` can UPDATE it, existing rows 0.
- Apply `20261016100000_add_rental_unit_default_rent.sql` to the hosted DB **before** deploying the flow-v2 web build:
  room saves (and the setup wizard's rooms) send `default_rent_centavos` and fail without the column.

## Local environment notes (pre-existing, not changed)
- Seed migrations `20260427000001`, `20260904000000`, `20260909000000` raise "No users found"
  on a fresh database, so `supabase db reset` fails on a clean machine.
- `public.initialize_user_subscription()` has no `search_path`; locally, creating an auth user
  fails with `relation "user_subscriptions" does not exist`.
