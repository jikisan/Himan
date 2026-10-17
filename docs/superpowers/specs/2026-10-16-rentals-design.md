---
type: spec
area: rentals
status: approved
created: 2026-10-16
---

# Rentals Module — Design

Landlord-side rent management for Philippine house and room rentals: renters,
contracts, monthly invoices with utilities, payments with proof, PDFs, and a
renter-facing share link. Web first; mobile is a later `/port-web-to-mobile` pass.

Decisions come from a grilling session (Q1–Q31).

## Reuse (open-source review, 2026-10-16)

**Libraries adopted** (do the hard parts; we write only glue):

| Need | Library | Why |
|---|---|---|
| Contract / invoice / receipt PDFs | `@react-pdf/renderer` (MIT) | Real-text PDFs in browser, works on the public link |
| Drawn e-signature | `signature_pad` (MIT, ~12k★, zero deps) | Standard canvas pad; `toDataURL('image/png')` → embed in PDF |
| "₱10,000 → TEN THOUSAND PESOS" | `to-words` (MIT, `en-PH` locale) | Verified: `convert(20000.5, {currency})` → "Twenty Thousand Pesos And Fifty Centavos Only" |

**Apps reviewed, not forked:**

| Project | Verdict |
|---|---|
| MicroRealEstate | License changed to Sustainable Use License v2 (MIT only up to commit `479d0ad7`, Dec 2025). MongoDB, rents embedded per contract and recomputed in a cascade (`services/api/src/managers/contract.js`). Borrowed: **"lost payments" check** — refuse a contract date change that would orphan recorded payments. |
| Tejas5405/property-rental-management | Supabase + RLS, but no license (can't copy) and RLS is only a backstop behind a service-role API. Borrowed: partial unique index for one active agreement. |
| jamalo237/landlord-rent-tracker, kotenkodev/react-supabase-tool-rental | Same stack, single-owner RLS, no contracts/signing/utilities. Nothing beyond what Himan's government module already does better. |
| Documenso | Full self-hosted signing server — overkill. Drawn signature + frozen text hash covers RA 8792 for this use. |
| HomeRent, Structomate, OpenGYS, Landlord Tracker, Renthuzz (closed) | Feature references only. |

## Users and access

- The **user is the landlord**. Himan is multi-user: nothing is hard-coded to one person.
- Every table is scoped to a **property**. Access is via `rental_property_members`
  with roles `owner` (everything incl. delete and sharing), `manager` (renters,
  billing, payments, contracts), `viewer` (read-only).
- One `owner` per property: the creator. Owners share a property with **accepted
  friends** (existing `friends` module).
- All RLS calls one `SECURITY DEFINER` helper `rental_has_role(property_id, min_role)`
  — avoids the recursive-policy 403 seen in `20260427000002_fix_grocery_list_members_rls.sql`.
- Storage paths are keyed `{property_id}/…`, never `{user_id}/…`, so shared members see files.

## Data model

| Entity | Key fields |
|---|---|
| Property | name, address, owner name/address, lessor name/civil status/address, lessor capacity (`owner` / `representative`), signing city, invoice prefix, archived_at. Lessor fields default from the creator's profile, editable. |
| Unit | property, name, `kind: whole/room/bedspace`, capacity ≥ 1, electric mode + amount, water mode + amount. Mode `none` / `submeter` (amount = rate per unit, e.g. ₱/kWh) / `fixed` (amount = flat ₱ per month). |
| Renter | property, full name, phone, Facebook/Messenger, email, address, emergency contact name/phone, occupants, notes, valid ID files (private) |
| Tenancy | property, unit, renter, move-in, move-out (null = active). Active tenancies in a unit never exceed its capacity. Never hard-deleted. |
| Contract | tenancy, term start/end, monthly rent, due day 1–31, advance months, deposit. Many per tenancy (original + renewals); at most one active. Phase 3 adds frozen text, hash, signatures, sign mode. |
| Meter reading | unit, type (electric/water), date, value, `is_reset`. Previous reading carries forward. |
| Invoice | tenancy, number `PREFIX-YYYY-NNNN` per property, period `YYYY-MM`, lines (`rent/electric/water/penalty/damage/other`), void flag. Status derived, never stored. Immutable after issue except void. |
| Payment | tenancy, amount, date, method, reference no. (duplicate warning per property), notes, proof images (private). Allocated oldest-unpaid-invoice-first, overridable. |
| Payment account | user-owned: type (GCash/Maya/bank), account name, number, QR image (public). Linked per property. |

Money is stored as **integer centavos**. Dates are `date` (no timezone); "today" is Asia/Manila.

## Rules

- **Due date:** `due_day` clamps to the month's last day (30 → Feb 28/29).
- **Advance** pays the first month. **Deposit** is held until move-out.
- **Penalties and damages** are manual invoice lines, never auto-computed.
- **Utilities:** submeter line = (current − previous reading) × rate; fixed line = flat amount.
  Bedspace units bill the whole submeter line to one chosen tenancy (Q23-c).
- **Invoice status** = derived from allocations: `unpaid` / `partial` / `paid`, plus `overdue` when unpaid past due date.
- **Move-out settlement:** deposit minus unpaid invoices, cleaning, damages — or full forfeit on early termination — → refund amount, tenancy ended.

## Renter share link (Phase 3)

Per-tenancy random token, revocable/regenerable. Read-only after move-out; expires 90
days later. Access only through `SECURITY DEFINER` RPCs keyed by token — no table
grants to `anon`. Shows: contract to sign, invoices, balance, payment QRs, PDF
downloads. Never shows ID files or other tenants.

## Contracts (Phase 3)

Template per property = ordered editable clauses with placeholders
(`{{lessee_name}}`, `{{monthly_rent_words}}`, …), seeded from the owner's sample
contract with all personal details replaced by placeholders. Each contract copies the
template; on signing the text is frozen (snapshot + SHA-256 hash). Renter chooses sign
mode: e-sign only (RA 8792), or e-sign + notarize (upload notarized scan). Drawn
signature + typed name + timestamp + user agent. Lessor countersigns in-app.

## PDFs

`@react-pdf/renderer` (real text) in the browser for contract, invoice, and
acknowledgment receipt — on both the landlord app and the public link. Mobile later
uses `expo-print`. `react-to-pdf` (rasterizing) is rejected for these documents.

Spike 2026-10-16: builds under rolldown-vite as a lazy chunk (+441 KB gzip, 1.2 MB raw — load it only on PDF actions). ₱ glyph **needs `Font.register`**: the built-in Helvetica renders U+20B1 as `±`. Register a TTF with ₱ (check Archivo covers U+20B1; else bundle Noto Sans).

## Dashboard

Tiles: collected this month · outstanding · overdue count · occupancy · deposits held.
Due-soon / overdue list. (Income chart and main-dashboard widget deferred.)

## Phases

1. **Foundation** — properties, members/sharing, units, renters (+ ID files), tenancies, contract terms; web setup UI.
2. **Billing & payments** — meter readings, billing screen, invoices, payment accounts + QR, payments + proof, allocation, invoice/receipt PDFs, dashboard.
3. **Contracts & renter link** — templates, generation, share token RPCs, e-sign, notarized upload, contract PDF, renewals.
4. **Move-out settlement**, then mobile port.

## Out of v1

Payment gateways · auto-split of main utility bill · per-day penalties · landlord
expenses / P&L · income chart · main-dashboard widget · push reminders.

## Flow v2 — plain flow for non-technical users (grilling Q1–Q18, 2026-10-16)

Some landlords and co-managers are not technical. The UI drops the Units / Renters /
Tenancies tabs for a room-first flow. The data model is unchanged apart from one column.

- **Users:** both the property creator and shared friends (Q1). Ships in Phase 1, before billing (Q7).
- **Home = Rooms board** (Q2, Q8). One card per room: name, type, ⋯ menu (Edit / Delete).
  Each spot shows the tenant (name, ₱rent/mo, "due every Nth", **Move out**) or an empty
  **+ Add tenant**. Shared rooms show one line per bed.
- **Views:** segmented **Rooms | Tenants** (Q12). Tenants is a searchable directory with the current
  room or "Moved out", and a "Show past tenants" toggle. The Tenancies tab is gone.
- **Words** (Q3): Unit → Room, Bedspace → Shared room (beds), Renter → Tenant, Tenancy → hidden
  (Move in / Move out), Lessor → "Who signs the contract", Submeter → "By meter reading".
  Legal terms stay in the contract PDF only.
- **First property = 3-step setup** (Q4, Q15): house name and address → quick-add rooms
  (type, beds, usual rent) → electricity and water asked once, copied to every new room.
  Contract-only fields (owner address, civil status, signing city, invoice prefix, signs as)
  sit in a collapsed "Contract details – fill in later" section in the wizard and in Edit.
- **Add tenant** (Q9, Q10, Q13): required name, mobile, move-in date, rent (pre-filled from the room's
  usual rent). Defaults: deposit = advance = 1 month, due day = move-in day, contract 1 year.
  "Due on move-in" total. "More details (optional)" holds the rest, including the ID upload.
  "Already a tenant? Pick from list" reuses an existing person. Creates renter + tenancy together.
- **Tenant sheet** (Q16): tap a tenant → details, ID files, **Edit rent & due day** on the active
  contract (Phase 2 locks this once an invoice exists).
- **Move out** (Q11): date dialog, default today, not before move-in (fixes M2).
- **Schema** (Q13): `rental_units.default_rent_centavos integer NOT NULL DEFAULT 0` (0 = not set; per bed for shared rooms).
- **Help** (Q14): inline hints and empty states only, no tour. English only (Q5). Phone-width web first (Q6).

## Phase 2 part 1 — meter readings and bills (grilling Q1–Q33 + billing flow C, 2026-10-17)

Reference: the user's own apartment Statement of Account (rent, CUSA, parking, water and
electric with both readings, rate and amount, total, due date, late-fee note, "Received by").
The houses the user rents out have no CUSA or parking, so extra charges are optional.

- **Flow C — one session a month, own due dates:** once a month the landlord reads every
  meter, types them on one screen, and issues all bills at once. Each bill keeps the tenant's
  own due date and a full month of rent from that due day (e.g. "Rent Nov 15 – Dec 14").
  Utilities cover reading-to-reading (the same period for every room read that day) and land on
  each tenant's next bill. Each Ready row also has its own **Issue** for a late reading.
- **One statement per tenant** (tenancy) per month: one per private room / whole house, one per
  bed in a shared room. Extra people in a room are covered by the rent ("extra per added person").
- **Bills tab** (Q9, Q15): month picker (default current month, back to the earliest move-in).
  A **Meter readings** list (one row per metered room and meter: last reading and date, new
  reading box, live usage and amount; one reading date; one **Save readings**), then one row per
  tenant: *Covered by advance* · *Needs reading* · *Ready ₱X* · *Issued No. ₱X* · *Cancelled*.
  **Issue all ready** plus per-row **Issue**. Managers issue; viewers read and copy.
- **Making bills** (Q1, Q13): rows are computed live (no stored drafts). A tenant gets a bill for
  month `YYYY-MM` when they still live there on that month's due date. A second bill for the same
  tenant and month is refused.
- **Due date** (Q2, Q34): the tenant's due day in that month, clamped to the month's last day.
  Property setting **"Rent is due every [N]"** (asked in setup and Edit property; the user's rooms
  all share one date). New tenants get it in Add tenant, changeable per tenant; with no property
  setting the due day is the move-in day. Existing tenants keep theirs.
- **Advance** (Q2, Q28, Q22): pays the **first** N billable months (N = advance months of the
  first contract). Those months show grey "Covered by advance" rows.
- **Lines** (Q25, Q26): rent (with its period) · optional extra monthly charges per tenant (name +
  amount, empty by default, set in Add tenant and on the tenant sheet) · water · electricity ·
  late fee · "Other" (positive or negative). No VAT or tax lines.
- **Utilities** (Q4, Q10, Q18, Q20, Q24): metered = (reading − previous) × rate. In a shared room
  each reading-to-reading segment is **split equally** among the tenants living there on the later
  reading's date; leftover centavos go to the longest-staying tenant. Flat amount = charged to
  **each** tenant. Each line keeps its readings, dates, usage, rate and share (Q17).
- **Readings** (Q5, Q11, Q32): the first reading of a meter is the starting point (not charged).
  "Meter reset / replaced" makes a reading a new starting point. A reading lower than the last is
  refused unless it is a reset. No unbilled reading → *Needs reading*; "Skip utilities this month"
  issues without utilities and the usage rolls into the next bill. Add tenant takes optional
  starting readings. Readings used by an issued bill can't be changed or deleted.
- **Move-in bill** (Q3, Q21, Q23, Q35): Add tenant issues it at once, due on the move-in date, in the
  same transaction: **rent for the days until the first due date** (rent ÷ 30 × days, e.g. move-in
  Oct 15, due every 5th → "Rent Oct 15 – Nov 4 (21 days)"; none when moving in on the due date) +
  advance × rent + deposit. The advance then pays the first full months from the first due date. The deposit is money held, not income. Tenants who
  moved in before Phase 2 get none.
- **Move-out** (Q14, Q19, Q24): optional final reading(s) → a **final bill** with the leaving
  tenant's share of unbilled usage; housemates' shares go on their next bill.
- **Numbers** (Q12): `PREFIX-YYYY-NNNN` per property, counting within the issue year, assigned at
  issue. New properties default the prefix to the name's initials ("LU").
- **Changing bills** (Q6): issued bills stay editable (amounts, Other and late-fee lines) until
  payments exist (part 2). Cancel asks for confirmation; cancelled bills stay visible, can't be
  changed, and free the month to be billed again.
- **Rent terms lock** (Q7): advance and deposit lock once a move-in bill exists (cancel it to
  change them). Once a monthly bill exists, a rent change becomes **"New rent from [month]"**
  (ends the contract, starts a renewal). The due day can still be fixed.
- **Partial months** (Q8): never prorated; use an "Other" line.
- **Late fee** (Q29): optional property amount; stated in the footer; an overdue bill gets a
  one-tap "Add late fee". Never automatic.
- **Statement of Account** (Q31): header (owner name and address, tenant, room, month, bill date,
  number) · rent and charges · Water and Electricity with both reading dates and values, usage,
  rate, amount (and "1/3 share" when split) · total · due date · footer (late-fee note,
  "Received by"). "Copy for Messenger" = same content as plain text. Payment accounts: part 3. PDF: part 4.
- **Previous balance** (Q30): from part 2. **Money** (Q33): bills hide ".00" on whole pesos.
- **Schema:** `rental_properties.late_fee_centavos` and `rent_due_day`, `rental_tenancies.charges` (jsonb array),
  `rental_meter_readings`, `rental_bills` (lines as a jsonb snapshot; status `issued`/`void`),
  RPCs `rental_issue_bill`, `rental_change_rent`, contract guard trigger, and
  `rental_start_tenancy` issuing the move-in bill.
