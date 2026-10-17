# Rentals Flow v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Units / Renters / Tenancies tabs with a room-first flow that non-technical landlords can use: a Rooms board, one-form "Add tenant", a tenant sheet, a dated move-out, and a 3-step first-property setup.

**Architecture:** The data model stays the same, plus one column (`rental_units.default_rent_centavos`). Pure helpers (`moveInDefaults`, `roomSpots`) live in the shared domain. Two repository methods are added: `TenancyRepository.updateTerms` and the unit default-rent mapping. The web presentation layer is rebuilt around a `RoomsBoard`, `AddTenantForm`, `TenantSheet`, `MoveOutDialog` and `SetupWizard`. Composite actions (`addTenant`, `setupProperty`) run inside the existing `useRentals` mutation. Compensating cleanup covers partial failures.

**Tech Stack:** React 19, TanStack Query v5, Tailwind v4 + shadcn primitives, zod, Supabase (Postgres + RLS), Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-10-16-rentals-design.md` — section "Flow v2".

## Global Constraints

- Words: Unit → **Room**, Bedspace → **Shared room**, Renter → **Tenant**, Tenancy hidden (Move in / Move out), Lessor → **"Who signs the contract"**, Submeter → **"By meter reading"**.
- Add tenant requires only: full name, mobile, move-in date, rent. Defaults: deposit = advance = 1 month, due day = move-in day (clamped by existing `due_day` 1–31), contract end = move-in + 1 year.
- No new npm dependencies. English only. No guided tour.
- Money is integer centavos. "Today" is `manilaToday()`.
- Touch targets ≥ 44px on phone width (`size-11 sm:size-9` for icon buttons). Layout must work at 375px.
- Viewers see everything read-only. Managers add/move tenants. Owners edit rooms and property (existing `hasRentalRole`).
- Ask the user before applying the migration to the hosted DB and before each commit.
- Commits: conventional, sentence-per-line body, no AI attribution.

## Review Focus

1. **Add tenant fails after the person is created** (e.g. the room filled up meanwhile). The new renter row must be removed so no orphan "Not renting" tenant appears. Pinned in Task 3.
2. **Move-out date before move-in, or a future move-in moved out "today".** Show a readable message, not the check-constraint text. Pinned in Task 5.
3. **Shared room with 4 beds and 2 tenants.** It must show 2 filled lines and 2 "+ Add tenant" slots. A full room shows no add slot. Pinned in Task 2 and Task 4.
4. **Due day from a move-in on the 31st.** Must stay 31 (it clamps at billing time). Edit rent & due day must reject 0 and 32. Pinned in Task 2 and Task 5.
5. **Setup wizard where room 3 of 4 fails to save.** The property and the saved rooms stay, the error names the failed room, and the user lands on the board. Pinned in Task 6.

---

### Task 1: Default rent column

**Files:**
- Create: `supabase/migrations/20261016100000_add_rental_unit_default_rent.sql`
- Modify: `supabase/tests/rentals.sql` (append assertions)
- Modify: `packages/shared/src/modules/rentals/domain/schemas.ts` (`unitSchema`)
- Modify: `packages/shared/src/modules/rentals/infrastructure/rows.ts` (`unitRow`)
- Modify: `packages/shared/src/modules/rentals/infrastructure/PropertyRepository.ts` (`saveUnit`)
- Test: `web/src/modules/rentals/__tests__/rentals.repository.test.ts`

**Interfaces:**
- Produces: `UnitInput.defaultRentCentavos: number` (0 = not set), so `RentalUnit.defaultRentCentavos` too.

- [ ] **Step 1: Migration**

```sql
-- Usual monthly rent for the room (per bed for shared rooms); 0 = not set. Pre-fills "Add tenant".
ALTER TABLE public.rental_units
  ADD COLUMN default_rent_centavos integer NOT NULL DEFAULT 0
  CHECK (default_rent_centavos BETWEEN 0 AND 2000000000);
GRANT UPDATE (default_rent_centavos) ON public.rental_units TO authenticated;
```

- [ ] **Step 2: Failing repository test**: `saveUnit` sends `default_rent_centavos: 800000`, and `findAll` maps `default_rent_centavos` → `defaultRentCentavos`. Follow the existing mocked-supabase pattern in `rentals.repository.test.ts`.
- [ ] **Step 3: Run** `cd web && npx vitest run src/modules/rentals/__tests__/rentals.repository.test.ts`. Expected FAIL.
- [ ] **Step 4: Implement.** `unitSchema` gains `defaultRentCentavos: centavos(0).default(0)`. `unitRow` gains `default_rent_centavos: z.number().default(0)` and the mapped field. `saveUnit` row gains `default_rent_centavos: v.defaultRentCentavos`.
- [ ] **Step 5: SQL test.** Append to `supabase/tests/rentals.sql` inside its transaction: a negative value raises `check_violation`, and an owner can update the column. Run against the isolated stack (`himan-rentals-test`, ports 544xx) as in Phase 1.
- [ ] **Step 6: Run** the rentals vitest suite. Expected PASS.

### Task 2: Domain helpers

**Files:**
- Create: `packages/shared/src/modules/rentals/domain/flow.ts`, exported from `domain/index.ts`
- Modify: `packages/shared/src/modules/rentals/domain/schemas.ts` (add `contractTermsSchema`)
- Test: `web/src/modules/rentals/__tests__/rentals.domain.test.ts`

**Interfaces:**
- Produces:
  - `moveInDefaults(moveIn: string, rentCentavos: number): { startDate: string; endDate: string; dueDay: number; advanceMonths: 1; depositCentavos: number }`
  - `roomSpots(unit: RentalUnit, tenancies: RentalTenancy[]): (RentalTenancy | null)[]` — length = capacity, active tenancies first (oldest move-in first), then `null` per free bed.
  - `contractTermsSchema = z.object({ monthlyRentCentavos: centavos(1), dueDay: z.number().int().min(1, 'Due day is 1–31').max(31, 'Due day is 1–31') })`, `type ContractTermsInput`.

- [ ] **Step 1: Failing tests**

```ts
it('defaults a move-in to a one-year contract due on the move-in day', () => {
  expect(moveInDefaults('2026-10-31', 1000000)).toEqual({ startDate: '2026-10-31', endDate: '2027-10-31',
    dueDay: 31, advanceMonths: 1, depositCentavos: 1000000 });
});
it('ends a Feb 29 move-in on Feb 28 next year', () => {
  expect(moveInDefaults('2028-02-29', 500000).endDate).toBe('2029-02-28');
});
it('lists filled beds first, then empty ones', () => {
  const unit = { ...room, kind: 'bedspace', capacity: 4 } as RentalUnit;
  const spots = roomSpots(unit, [t('b', '2026-02-01'), t('a', '2026-01-01'), { ...t('x', '2025-01-01'), moveOut: '2025-12-01' }]);
  expect(spots.map((s) => s?.id ?? null)).toEqual(['a', 'b', null, null]);
});
it('rejects due day 0 and 32', () => {
  expect(contractTermsSchema.safeParse({ monthlyRentCentavos: 1, dueDay: 0 }).success).toBe(false);
  expect(contractTermsSchema.safeParse({ monthlyRentCentavos: 1, dueDay: 32 }).success).toBe(false);
});
```

- [ ] **Step 2: Run.** Expected FAIL (missing exports).
- [ ] **Step 3: Implement** with `date-fns` (`addYears`, `parseISO`, `format`), which is already a shared dependency. `roomSpots` filters `t.unitId === unit.id && t.moveOut === null`, sorts by `moveIn`, and pads with `null` up to `unit.capacity`.
- [ ] **Step 4: Run.** Expected PASS.

### Task 3: Repository + hook actions

**Files:**
- Modify: `packages/shared/src/modules/rentals/infrastructure/TenancyRepository.ts` (add `updateTerms`)
- Modify: `web/src/modules/rentals/presentation/hooks/useRentals.ts`
- Test: `web/src/modules/rentals/__tests__/rentals.repository.test.ts`, new `web/src/modules/rentals/__tests__/useRentals.actions.test.ts`

**Interfaces:**
- Produces:
  - `TenancyRepository.updateTerms(contractId: string, input: ContractTermsInput): Promise<void>` — updates `monthly_rent_centavos, due_day` where `status = 'active'`, `.select('id').single()`.
  - New `RentalAction` members:
    - `{ type: 'addTenant'; propertyId: string; unitId: string; renterId: string | null; renter: RenterInput | null; moveIn: string; terms: Omit<StartTenancyInput, 'unitId' | 'renterId' | 'moveIn'> }` → returns the renter id.
    - `{ type: 'updateTerms'; contractId: string; input: ContractTermsInput }`.
    - `{ type: 'setupProperty'; input: PropertyInput; rooms: UnitInput[] }` → returns `{ propertyId: string; failed: string[] }`.
  - The hook exposes `run` as today; the composite cases live in the `mutationFn` switch.

- [ ] **Step 1: Failing tests**: mocked repos (inject via `vi.mock('../../infrastructure')`).
  - addTenant with a new renter calls `renters.save` then `tenancies.start`. If `start` rejects, `renters.remove(newId)` is called and the original error is rethrown.
  - addTenant with an existing `renterId` never calls `save` or `remove`.
  - setupProperty saves the property, then each room in order. A room failure is collected by name and does not stop the others. It returns `{ propertyId, failed: ['Room C'] }`.
- [ ] **Step 2: Run.** Expected FAIL.
- [ ] **Step 3: Implement.**

```ts
case 'addTenant': {
  const renterId = a.renterId ?? await repos.renters.save(a.propertyId, null, a.renter!);
  try { await repos.tenancies.start({ unitId: a.unitId, renterId, moveIn: a.moveIn, ...a.terms }); }
  catch (error) { if (!a.renterId) await repos.renters.remove(renterId).catch(() => undefined); throw error; }
  return renterId;
}
case 'updateTerms': return repos.tenancies.updateTerms(a.contractId, a.input);
case 'setupProperty': {
  const propertyId = await repos.properties.save(null, a.input);
  const failed: string[] = [];
  for (const room of a.rooms) await repos.properties.saveUnit(propertyId, null, room).catch(() => failed.push(room.name));
  return { propertyId, failed };
}
```

- [ ] **Step 4: Run.** Expected PASS.

### Task 4: Rooms board + Tenants directory (page shell)

**Files:**
- Create: `web/src/modules/rentals/presentation/components/RoomsBoard.tsx`, `TenantsList.tsx`
- Modify: `web/src/modules/rentals/presentation/pages/RentalsPage.tsx` (remove the Tabs; add a segmented **Rooms | Tenants** control; keep the property header and stats with the words "Rooms", "Occupied", "Tenants", "Monthly rent")
- Delete: `components/StartTenancyForm.tsx` (replaced in Task 5)
- Test: rewrite `web/src/modules/rentals/__tests__/RentalsPage.test.tsx`

**Interfaces:**
- Consumes: `roomSpots`, `RentalsState`.
- `RoomsBoard` props: `{ property; tenancies; renters; canManage: boolean; canEdit: boolean; onAddTenant(unitId): void; onOpenTenant(tenancyId): void; onMoveOut(tenancyId): void; onEditRoom(unitId): void; onDeleteRoom(unitId): void; onAddRoom(): void }`.
- `TenantsList` props: `{ renters; tenancies; unitName(id): string; onOpen(renterId): void }` — search input (`aria-label="Search tenants"`) plus a "Show past tenants" checkbox. Past = has no active tenancy.

Card spec:
- Header: room name, type label ("Whole house" / "Room" / "Shared room · N beds"), and a ⋯ `DropdownMenu` (Edit room / Delete room) for owners.
- Spot rows:
  - Filled: `Initials`, name button (opens the sheet), "₱X/mo · due every Nth" (`ordinal(dueDay)`, a local helper), and a **Move out** button (managers).
  - Empty: a dashed button "+ Add tenant" (managers), or the text "Empty" for viewers.
- Board footer: "+ Add room" (owners).

- [ ] **Step 1: Failing tests**
  - A shared room with capacity 4 and 2 active tenants shows 2 names and 2 "+ Add tenant" buttons.
  - A full room shows no "+ Add tenant".
  - A viewer sees "Empty" and no Move out, Add tenant or ⋯ menu.
  - The Tenants view search filters by name. Past tenants are hidden until "Show past tenants" is ticked.
- [ ] **Step 2: Run.** Expected FAIL.
- [ ] **Step 3: Implement** the components and the page shell. Remove Tabs imports, `StartTenancyForm` and the old renter/tenancy lists.
- [ ] **Step 4: Run.** Expected PASS. Then run `npx tsc -p tsconfig.app.json --noEmit` and `npx eslint src/modules/rentals`.

### Task 5: Add tenant, tenant sheet, move out

**Files:**
- Create: `components/AddTenantForm.tsx`, `components/TenantSheet.tsx`, `components/MoveOutDialog.tsx`
- Modify: `components/RenterForm.tsx` (labels say "Tenant"), `pages/RentalsPage.tsx` (dialog state: `{ type: 'addTenant'; unitId } | { type: 'tenant'; renterId } | { type: 'moveOut'; tenancyId }`)
- Test: `RentalsPage.test.tsx`

**Interfaces:**
- `AddTenantForm` props: `{ unit: RentalUnit; renters: Renter[] /* property's, not currently renting this unit */; busy; onSave(action: Extract<RentalAction, { type: 'addTenant' }>): Promise<void>; onCancel }`.
- Fields:
  - Required:
    - "Full name" (`autoComplete="name"`)
    - "Mobile number" (`type="tel"`)
    - "Move-in date" (default today)
    - "Monthly rent" (`MoneyInput`, prefilled `centavosToInput(unit.defaultRentCentavos)` when > 0)
  - The "Already a tenant? Pick from list" link swaps the name and mobile fields for a `<select aria-label="Tenant">`.
  - The `<details>` element "More details (optional)" holds:
    - Facebook, email, address, emergency name/phone, occupants, notes
    - Advance months, Deposit, Contract ends, Due day
  - The `moveInDefaults` values are prefilled and recomputed when the move-in date or rent changes, until the user edits the field.
  - "Due on move-in" total (existing logic).
  - The ID upload appears in the tenant sheet after creation (the renter id only exists then). The `<details>` element says so.
- `TenantSheet`: the renter's name as title, "Lives in Room A since Oct 1, 2026" (or "Moved out"), `RenterFiles` (managers), `RenterForm`. When active, an "Edit rent & due day" section: `MoneyInput` + due day, validated with `contractTermsSchema`, saved via `updateTerms`.
- `MoveOutDialog`: title "Move out {name}?", date input `min={tenancy.moveIn}` (default `max(today, moveIn)`), and a client-side check "Move-out can't be before move-in ({date})". Confirm runs `endTenancy`.

- [ ] **Step 1: Failing tests**
  - Add tenant with only the 4 fields calls `run` with `type: 'addTenant'`, `renter.fullName`, `terms.depositCentavos === rent`, `terms.dueDay === move-in day`.
  - Rent is prefilled from `defaultRentCentavos`.
  - "Pick from list" sends `renterId` and `renter: null`.
  - The tenant sheet's "Edit rent & due day" with due day 32 shows "Due day is 1–31" and does not call `run`.
  - Move out with a date before move-in shows the message and does not call `run`. A valid date calls `endTenancy` with that date.
- [ ] **Step 2: Run.** Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected PASS, plus tsc and eslint.

### Task 6: First-property setup wizard + plain property/room forms

**Files:**
- Create: `components/SetupWizard.tsx`
- Modify:
  - `components/PropertyForm.tsx`: wrap owner address, lessor block (label "Who signs the contract"), civil status, signing city and invoice prefix in `<details>` "Contract details – fill in later". Keep the "Use my name" checkboxes inside it.
  - `components/UnitForm.tsx`: title words Room / Shared room. Add the "Usual rent" `MoneyInput` (per bed for shared rooms). Utility option labels: "Not included" / "By meter reading" / "Fixed amount monthly".
  - `pages/RentalsPage.tsx`: the empty state's "Set up your first property" opens the wizard. Later "New property" opens the wizard too.
- Test: `RentalsPage.test.tsx`

**Interfaces:**
- `SetupWizard` props: `{ myName: string; busy; onFinish(action: Extract<RentalAction, { type: 'setupProperty' }>): Promise<{ failed: string[] }>; onCancel }`.
- Steps:
  1. "Your house": name, address.
  2. "Rooms": a repeatable row of name / type / beds / usual rent, starting with one row ("Room A"). "+ Add another room" suggests the next letter. "This house is rented as a whole" is a shortcut that makes a single "Whole house" row.
  3. "Electricity and water": two mode selects + amounts, copied into every room.
- A "Step N of 3" indicator, plus Back / Next / Finish.
- Owner and lessor default to `myName`. Contract fields stay at defaults.
- When `failed` is non-empty, a toast says "Saved, but couldn't add: Room C. Add it from the board."

- [ ] **Step 1: Failing tests**
  - Completing 3 steps with 2 rooms and electricity "By meter reading ₱20" calls `run` with `setupProperty`. Both rooms have `electricMode: 'submeter', electricAmountCentavos: 2000`, and `ownerName === myName`.
  - The whole-house shortcut produces one room with `kind: 'whole'`.
  - Next is blocked with "Enter a house name" when the name is empty.
  - A partial failure shows the toast text naming the room.
- [ ] **Step 2: Run.** Expected FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected PASS, plus tsc, eslint and the full `npm run test:run`.

### Task 7: Docs, hosted migration, browser check, review

**Files:**
- Modify: `docs/modules/rentals.md` (flow v2, new migration)

- [ ] **Step 1: Update docs.**
- [ ] **Step 2: Ask the user**, then apply only `20261016100000_add_rental_unit_default_rent.sql` to the hosted project with `supabase db query --linked -f` (BEGIN/COMMIT), then `supabase migration repair --status applied 20261016100000 --linked`. Verify that the column exists and that `authenticated` has UPDATE on it.
- [ ] **Step 3: Browser check** in the user's Chrome (claude-in-chrome) on `localhost:5173/rentals`, desktop plus a DevTools-width pass, one batched round: board, add tenant, tenant sheet, move-out dialog, wizard (open/close only; save only with the user's OK), Tenants view.
- [ ] **Step 4: Final review.** Run one fresh code-reviewer agent over the branch diff since `338caf6`, then fix its findings.
- [ ] **Step 5: Ask the user to commit.**
