---
type: plan
area: rentals
status: draft
created: 2026-10-18
spec: docs/superpowers/specs/2026-10-16-rentals-design.md
---

# Rentals Step D — Deposit Settlement

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development. D1 (database) and D2 (shared domain + repository) may run in parallel; D3 (UI + PDF) follows.

**Goal:** After a tenant moves out, Home shows "Deposit to return". The landlord opens a settlement screen that starts with the deposit, subtracts unpaid bills automatically, lets them add lines (cleaning, damage, other) or choose "Forfeit all" (early termination), then records the refund (amount, date, method, optional proof screenshot, note). The deposit held becomes 0 and a settlement PDF can be downloaded.

**Spec:** `docs/superpowers/specs/2026-10-16-rentals-design.md` part D (and Q4 "deposit held" in part A). Patterns: Steps A–C plans' Global Constraints apply unchanged (RLS via `rental_has_role`, SECURITY DEFINER RPCs with `search_path = ''`, reserve-then-upload proofs, rollback-only SQL tests, `.js` imports in shared, lazy PDFs).

## Shared contract

### Database (`supabase/migrations/20261018300000_add_rental_settlements.sql`)
- `rental_settlements(id, property_id, tenancy_id UNIQUE FK, deposit_centavos int, unpaid_bills_centavos int, lines jsonb [{ "label": text ≤80, "amount": int > 0 }] (≤ 30), forfeit boolean, refund_centavos int ≥ 0, refunded_on date NULL, refund_method text NULL IN (same list as payments), refund_reference text ≤80, notes text ≤500, status text IN ('draft','settled'), created_at, settled_at, settled_by uuid)`. Invariant checked in SQL: `refund = greatest(deposit − unpaid_bills − sum(lines), 0)` when not forfeit and `refund = 0` when forfeit; refund can never exceed the deposit.
- `rental_settlement_proofs` (same shape/guard as `rental_payment_proofs`, path `{property}/settlements/{id}/{proof}` in `rental-files`, manager-only).
- RPCs (manager, SECURITY DEFINER): `rental_settle_deposit(p_tenancy_id uuid, p_lines jsonb, p_forfeit boolean, p_refunded_on date, p_refund_method text, p_refund_reference text, p_notes text) RETURNS uuid` — requires the tenancy to have **moved out** and an issued move-in bill that is **fully paid** (otherwise `No deposit to settle`), recomputes the deposit and the unpaid issued bills in SQL (never trusts client numbers), refuses a second settlement (`This deposit is already settled`), stores the result as 'settled'; `rental_void_settlement` is **not** provided in v1 (a mistake is fixed by the landlord noting it).
- `rental_deposit_held` changes: settled → 0.

### Shared domain (`domain/settlement.ts`)
```ts
export interface SettlementLine { label: string; amount: number }
export function settlementPreview(input: { depositCentavos: number; unpaidBillsCentavos: number; lines: SettlementLine[]; forfeit: boolean }): { deductionsCentavos: number; refundCentavos: number; owedByTenantCentavos: number } // owed when deductions exceed the deposit
export function depositToReturn(tenancy: RentalTenancy, bills: RentalBill[], payments: RentalPayment[], settlement?: RentalSettlement): { state: 'none' | 'to_settle' | 'settled'; depositCentavos: number }
export const settlementSchema; export type SettlementInput
```
`depositHeld` (Step A) must return `none/0` for a settled tenancy. Repository `SettlementRepository`: `findAll()`, `settle(input)`, `uploadProof / removeProof / proofUrl` (copy the payment repository).

## Review Focus
1. Client cannot inflate the refund: the SQL recomputes deposit and unpaid bills; deductions larger than the deposit give refund 0 and a visible "tenant still owes ₱X".
2. A tenancy that has not moved out, or whose move-in bill is not fully paid, cannot be settled; a second settlement is refused; viewers and strangers cannot read or write settlements or proofs.
3. After settlement, Home no longer lists "Deposit to return" and "Deposits held" drops by the deposit.

## Tasks
- **D1 Database** — SQL tests first (Review Focus 1–3 and the cross-property case), then the migration. Commit: `feat: add rental deposit settlements`.
- **D2 Domain + repository** — tests first (preview maths incl. forfeit and over-deduction, `depositToReturn`, repository with mocked Supabase). Commit: `feat: add rentals settlement domain and repository`.
- **D3 UI + PDF** — Home "Deposit to return" to-do; tenant sheet "Settle deposit" (for moved-out tenants): deposit, unpaid bills (auto, read-only), add lines, Forfeit all, live refund, refund form (date default today, method, reference, optional proof screenshot, note), confirm dialog ("This can't be undone here"); settled view; `SettlementPdf` (lazy, same foundation as Step B: deposit, each deduction, refund, method, signature lines). Tests first; viewers read-only. Commits in logical pieces.
- **D4 Lead** — fresh reviewer, fixes RED→GREEN, host migration, docs, final full run.
