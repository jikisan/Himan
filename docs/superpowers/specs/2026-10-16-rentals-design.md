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
