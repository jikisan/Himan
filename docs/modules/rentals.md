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
- Web Vitest: 30 rentals tests (domain 11, repository 8, page 11); full suite 161/161.
- SQL: `supabase/tests/rentals.sql` passes against all migrations in an isolated local
  Supabase (ports 544xx); fixtures roll back.
- Integration (temporary, not committed): repositories against real PostgREST/RLS/Storage —
  insert-returning, membership embed filter, capacity error, upload + signed URL, end, delete
  block, archive, member list.
- Manual (in-app browser, local stack): property → bedspace unit → two tenancies → "Every unit
  is full" → end one. Share dialog not exercised in a browser (needs a second friend account).
- `@react-pdf/renderer` spike: builds; ₱ needs `Font.register` (Phase 2).

## Local environment notes (pre-existing, not changed)
- Seed migrations `20260427000001`, `20260904000000`, `20260909000000` raise "No users found"
  on a fresh database, so `supabase db reset` fails on a clean machine.
- `public.initialize_user_subscription()` has no `search_path`; locally, creating an auth user
  fails with `relation "user_subscriptions" does not exist`.
