---
type: module
area: rentals
status: phase-2-bills
---

# Rentals

Landlord-side rent management. Spec: [[2026-10-16-rentals-design]]. Plans: [[2026-10-16-rentals-phase-1-foundation]], [[2026-10-16-rentals-flow-v2]], [[2026-10-17-rentals-bills]].

## Layers
- Shared: `packages/shared/src/modules/rentals/` — domain (money in centavos, roles, schemas) + repositories.
- Shared flows: `infrastructure/flows.ts` — `addTenant` (creates tenant + move-in, removes the new tenant if the
  move-in fails) and `setupProperty` (property + rooms, reports failed room names). Domain `flow.ts`:
  `moveInDefaults`, `roomSpots`.
- Web: `web/src/modules/rentals/` — `/rentals` page, flow v2 (plain words for non-technical users):
  Property side list with bed meters · tabs Home / Rooms / Tenants / Bills (Bills badge = bills waiting + ready).
  Home (`HomeView`): "To do for <month>" tasks (read meters, issue bills, recent bills past due, free beds) + at a glance
  + "Rent due in the next 7 days" (`nextDueDate`). Bills (`BillsView`): grouped waiting for reading / ready to issue /
  issued (Copy for Messenger) / no monthly bill; `MeterReadings` is a side panel ≥1024px, a full-screen sheet below
  (`utils/billingMonth.ts`: `monthRows`, `monthTodo`, `useWide`). Past due ≠ unpaid: no payment tracking yet · Rooms board (`RoomsBoard`, one line per bed, Full / N free pill,
  "+ Add tenant" on free beds) · Tenants view (`TenantsList`, table: room, rent, since).
  Dialogs: `SetupWizard` (new property, 3 steps), `AddTenantForm`, `TenantSheet` (right side panel: call/text/move out, rent + next due, contract, ID, read-only contact with Edit, history),
  `MoveOutDialog` (dated), `UnitForm` (room), `PropertyForm` (edit; contract details collapsed), `ShareDialog`.
  UI words: Room / Shared room / Tenant / Move in / Move out; DB keeps unit / bedspace / renter / tenancy.
- Bills (Phase 2 part 1): domain `billing.ts` — pure, pending bills are computed live (no stored drafts):
  `pendingBill` (issued / covered by advance / needs reading / ready), `utilityLine` (reading-to-reading segments,
  equal split in shared rooms, leftover centavo to the longest-staying tenant), `finalBillLines`, `proratedRent`
  (rent ÷ 30 × days to the first due date; must match `rental_start_tenancy`), `statementText`, `formatBillPesos`.
  Repo `BillRepository` (issue via RPC, edit lines, void, readings). Flows `moveOut` (final readings → end → final bill),
  `issueBills`; `addTenant` also saves starting readings and extra charges (failures become warnings).
  Web: **Bills** view (`BillsView` + `MeterReadings`), `Statement` (Statement of Account layout), `BillSheet`
  (copy for Messenger, late fee, edit, cancel), `ChargesEditor`; tenant sheet locks billed terms ("New rent from").
- DB: `supabase/migrations/20261016000000_create_rentals_module.sql`, `20261016100000_add_rental_unit_default_rent.sql`
  (`rental_units.default_rent_centavos`, 0 = not set; `extra_person_rent_centavos`, rent = usual + extra × (people − 1),
  domain `roomRent`, prefills Add tenant from "People living in the room"), `20261017000000_add_rental_bills.sql`
  (`rental_meter_readings`, `rental_bills` with jsonb line snapshots, `late_fee_centavos`, `rent_due_day`,
  `rental_tenancies.charges`, RPCs `rental_issue_bill` / `rental_change_rent`, `rental_start_tenancy` now issues the
  move-in bill); assertions `supabase/tests/rentals.sql`.

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
- Bill numbers `PREFIX-YYYY-NNNN` per property (format CHECK), assigned only in `rental_issue_bill` (SECURITY DEFINER,
  checks manager role itself) under an advisory lock; unique. No direct INSERT on `rental_bills` (`20261017100000`).
- Bill lines and extra charges are validated per item in the database (`rental_valid_bill_lines`,
  `rental_valid_charges`; real calendar dates, names need a visible character — `20261017200000`). The client reads
  with schemas that accept everything the database accepts (`storedBillLineSchema`, `storedChargeSchema`) and fails
  closed otherwise, so an issued bill is never silently hidden (hiding it would let its month or readings be billed again).
  Meter numbers must be plain JSON decimals (`20261017300000`); display-only meter numbers read as 0 if unreadable,
  while the billed `readings` ids stay strict.
- One issued monthly bill per tenancy per month; one issued move-in bill per tenancy. Cancelled bills can't change.
- Advance/deposit locked once a move-in bill exists; rent locked once a monthly bill exists (renew via `rental_change_rent`).
- A reading on an issued bill can't be edited or deleted.

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

## Verification (2026-10-17, bills)
- SQL: bills block in `supabase/tests/rentals.sql` (move-in bill with and without prorated days, due day 31 in
  February, numbering, duplicate month, void, contract locks, renewal, reading guard, viewer can't issue) passes on the
  isolated stack.
- Web Vitest: 263/263 (rentals: billing 22, repository, flows, Bills view, page).

## Deploy order
- Apply `20261018000000_add_rental_utility_bills.sql` before deploying the web build that reads `rental_utility_bills`
  (the page loads it on start and fails without the table). Adds utility mode `monthly` ("Actual bill amount each month":
  the month's bill per room, typed in Bills → Bill amounts, split between tenants present on the due date, line `billMonth`).
  Applied to remote 2026-10-17 with `supabase db query --linked` in one transaction + `migration repair`; verified RLS on,
  4 policies, no anon access, new unit checks, existing bills still valid.
- Done 2026-10-17: `20261017000000` applied alone to the linked Himan project (`db query --linked -f`, one transaction)
  and recorded with `migration repair --status applied 20261017000000`. Verified: both tables with RLS, 7 policies,
  both RPCs, no anon EXECUTE, `rental_start_tenancy` issues move-in bills, new columns present, 0 bills.
  Browser: Bills tab loads real data; preview of a skip-utilities bill shows rent + fixed water; nothing issued.
- Done 2026-10-17: `20261017100000` (hardening) applied the same way and recorded. Verified: no INSERT grant or policy on
  `rental_bills`, `rental_issue_bill` is SECURITY DEFINER, the three validation CHECKs exist, no anon EXECUTE.
- Done 2026-10-17: `20261017200000` (date/label tightening) applied the same way and recorded. Verified: Feb 30 and
  blank-only names rejected, normal lines and charges accepted, no anon EXECUTE on `rental_real_date`.
- Done 2026-10-17: `20261017300000` (meter number checks) applied the same way and recorded. Verified: text rate and
  oversized usage rejected, normal decimal meter line accepted.
- `20261017000000_add_rental_bills.sql` must be applied to the hosted DB **before** deploying the bills web build:
  loading `/rentals` reads `rental_bills` and `rental_meter_readings`.
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
