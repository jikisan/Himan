---
type: plan
area: rentals
status: draft
created: 2026-10-18
spec: docs/superpowers/specs/2026-10-16-rentals-design.md
---

# Rentals Step A — Payments and Payment Accounts

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Every task is TDD: write the failing test, watch it fail, implement, watch it pass.

**Goal:** A landlord records payments (with proof screenshots) against a tenant, the oldest unpaid bill is paid first, bills show Unpaid / Partial / Paid / Overdue, overpayments become credit, payments can be voided, deposits show as held once the move-in bill is paid, and each property has payment accounts (GCash / Maya / bank, optional QR) shown on bills.

**Architecture:** Payments and allocations live in Postgres. One `SECURITY DEFINER` function, `rental_reallocate(tenancy)`, rebuilds the automatic allocations oldest-bill-first and is called by triggers, so any path that changes a bill or payment stays consistent. Clients never write payments or allocations directly; they call RPCs. Bill state is **derived** in the shared domain from bills + payments + allocations, never stored.

**Spec:** `docs/superpowers/specs/2026-10-16-rentals-design.md` (section "Phases 2 part 2 – 4", part A). Read it and `docs/modules/rentals.md` first.

## Global Constraints

- Conventional commits, **no AI attribution, no `Co-Authored-By`**; description as proper sentences starting with verbs, one per line.
- Money = integer centavos. Dates = `YYYY-MM-DD`; "today" = Asia/Manila (`manilaToday()`).
- Follow existing rental patterns exactly: zod row mappers in `infrastructure/rows.ts`, `rentalError()` for messages, `SECURITY DEFINER` functions with `SET search_path = ''`, `REVOKE ALL … FROM PUBLIC, anon` then `GRANT EXECUTE … TO authenticated`, column-scoped UPDATE grants, RLS via `rental_has_role(property_id, role)`, reserve-then-upload files with a metadata guard trigger (copy `rental_renter_files`).
- No direct client INSERT/UPDATE on `rental_payments`, `rental_payment_allocations`; clients use the RPCs below.
- Roles: owner manages payment accounts and the property; manager records/voids payments and proofs; viewer reads payments and allocations (not proof files).
- No DOM APIs in `packages/shared`. Inside it, imports use `.js` extensions.
- Web tests: `cd web && npx vitest run src/modules/rentals/`. Build: `cd web && npm run build`. Lint: `cd web && npx eslint src/modules/rentals`. SQL tests: `supabase/tests/rentals.sql` (add assertions; keep rollback-only).
- Local DB: the default `supabase start` ports can be taken by another project. Use an isolated copy: copy `supabase/` into the scratchpad, shift every `port = 543xx` to `544xx`, set `project_id`, neutralize migrations that `RAISE EXCEPTION 'No users found…'` (20260427000001, 20260904000000, 20260909000000) in the copy only, `supabase start --workdir <copy> -x studio,imgproxy,inbucket,edge-runtime,logflare,vector,supavisor,realtime`, run SQL with `psql postgresql://postgres:postgres@127.0.0.1:54422/postgres -v ON_ERROR_STOP=1 -f …`. If `supabase db reset` hangs after "Applying migration", stop it and apply the new migration by hand with `psql -1`.
- Never touch the hosted database; the lead applies migrations after review.

## Review Focus

1. A payment larger than all bills → credit shows, nothing refused, credit applies to the next issued bill automatically.
2. Voiding a payment returns exactly the bills it paid to unpaid, and a pinned (landlord-picked) allocation to a bill that becomes void or shrinks is dropped or clamped, never left over-allocated.
3. Editing or voiding a bill that has payments is refused with a readable message.
4. A viewer or a stranger cannot record, void, or read proof files; a payment's tenancy must belong to the stated property (no cross-property payment).
5. Two payments recorded at the same moment for one tenant never over-allocate a bill (advisory lock per tenancy).

## Shared contract (all tasks code against this; do not rename)

### Tables (migration `supabase/migrations/20261018100000_add_rental_payments.sql`)

- `rental_payment_accounts(id, property_id, kind text IN ('gcash','maya','bank','other'), label text 1..60, account_name text ≤120, account_number text ≤60, qr_path text NULL CHECK (qr_path IS NULL OR qr_path LIKE property_id::text || '/%'), position int DEFAULT 0, created_at)`. RLS: viewer select; owner insert/update/delete. Column-scoped UPDATE (kind, label, account_name, account_number, qr_path, position). Public bucket `rental-qr` (png/jpeg/webp ≤ 2 MB, object path `{property_id}/{account_id}-{n}.{ext}`; public read; insert/update/delete only owner via first path folder).
- `rental_payments(id, property_id, tenancy_id, amount_centavos int 1..2000000000, paid_on date, method text IN ('gcash','maya','bank','cash','other'), reference text ≤80 DEFAULT '', notes text ≤500 DEFAULT '', status text IN ('active','void') DEFAULT 'active', void_reason text ≤300 DEFAULT '', created_by uuid DEFAULT auth.uid(), created_at)`, FK `(tenancy_id, property_id)` → `rental_tenancies`. Select viewer. **No** client INSERT/UPDATE/DELETE grant. `paid_on` must not be after Manila today + 1 day.
- `rental_payment_proofs` — same shape and guard as `rental_renter_files` but FK `(payment_id, property_id)` → `rental_payments`; `storage_path = property_id || '/payments/' || payment_id || '/' || id`; stored in bucket `rental-files`; manager-only select/insert/update(ready)/delete; extend the existing `storage.objects` insert policy so reserved proof paths can be uploaded (add a second policy; leave the renter-file one intact).
- `rental_payment_allocations(id, payment_id, bill_id, property_id, amount_centavos int > 0, pinned boolean NOT NULL DEFAULT false)`. Select viewer; no client writes.

### Functions

- `rental_bill_total(lines jsonb) RETURNS integer` IMMUTABLE — sum of `lines[*].amount`.
- `rental_reallocate(p_tenancy_id uuid) RETURNS void` — `SECURITY DEFINER`, not granted to `authenticated`. Takes `pg_advisory_xact_lock` on the tenancy. Deletes the tenancy's **unpinned** allocations; deletes pinned allocations whose bill is void or whose payment is void; clamps pinned allocations to the bill total. Then walks active payments (oldest `paid_on`, `created_at`) and issued bills with total > 0 (oldest `due_on`, `created_at`, `id`) and allocates each payment's remaining amount (amount − its pinned allocations) to bills' remaining need (total − all allocations on the bill so far). Remainder stays unallocated = credit.
- Triggers: `AFTER INSERT OR UPDATE OF lines, status ON rental_bills` and `AFTER UPDATE OF status ON rental_payments` → `rental_reallocate(tenancy_id)`.
- Guard: a `BEFORE UPDATE OF lines, status ON rental_bills` check raises `'This bill has payments. Void the payment first.'` when the bill has any allocation from an active payment (applies to both edit and void). Existing bill triggers must keep working; check `rental_bill_guard`-style triggers in `20261017000000` and `20261017100000`.
- `rental_record_payment(p_tenancy_id uuid, p_amount integer, p_paid_on date, p_method text, p_reference text, p_notes text, p_bill_id uuid DEFAULT NULL) RETURNS uuid` — `SECURITY DEFINER`; derives `property_id` from the tenancy; requires `manager`; inserts the payment; if `p_bill_id` is given (must be an issued bill of that tenancy) inserts a **pinned** allocation of `least(p_amount, bill remaining)`; calls `rental_reallocate`; returns the payment id.
- `rental_void_payment(p_payment_id uuid, p_reason text) RETURNS void` — manager; sets `status='void'`, `void_reason` (1..300 chars); errors `'Payment not found or already voided'`.
- Error strings the UI shows verbatim: `Only managers can record payments`, `Bill not found for this tenant`, `Amount must be more than zero`, `Payment date is too far ahead`, `This bill has payments. Void the payment first.`, `Payment not found or already voided`, `Remove the stored payment proof before deleting its metadata`.

### Shared domain (new `packages/shared/src/modules/rentals/domain/payments.ts`, exported from `domain/index.ts`)

```ts
export const PAYMENT_METHODS = ['gcash', 'maya', 'bank', 'cash', 'other'] as const;
export const ACCOUNT_KINDS = ['gcash', 'maya', 'bank', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export interface PaymentProof { id: string; paymentId: string; propertyId: string; name: string; mimeType: string; size: number; storagePath: string; ready: boolean }
export interface PaymentAllocation { id: string; paymentId: string; billId: string; amountCentavos: number; pinned: boolean }
export interface RentalPayment { id: string; propertyId: string; tenancyId: string; amountCentavos: number; paidOn: string; method: PaymentMethod; reference: string; notes: string; status: 'active' | 'void'; voidReason: string; createdAt: string; proofs: PaymentProof[]; allocations: PaymentAllocation[] }
export interface PaymentAccount { id: string; propertyId: string; kind: (typeof ACCOUNT_KINDS)[number]; label: string; accountName: string; accountNumber: string; qrPath: string | null; position: number }
export const paymentSchema; export type PaymentInput  // { amountCentavos, paidOn, method, reference, notes, billId?: string | null }
export const paymentAccountSchema; export type PaymentAccountInput // { kind, label, accountName, accountNumber, position }
export type BillState = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'void'
export function billPaid(billId: string, payments: RentalPayment[]): number          // active payments' allocations to the bill
export function billBalance(bill: RentalBill, payments: RentalPayment[]): number     // max(total − paid, 0); 0 if void
export function billState(bill: RentalBill, payments: RentalPayment[], today: string): BillState // overdue wins when balance > 0 and dueOn < today
export function tenancyOwed(tenancyId: string, bills: RentalBill[], payments: RentalPayment[]): number
export function tenancyCredit(tenancyId: string, payments: RentalPayment[]): number  // active amounts − their allocations
export function depositHeld(tenancy: RentalTenancy, bills: RentalBill[], payments: RentalPayment[]): { state: 'none' | 'pending' | 'held'; amountCentavos: number } // deposit line of the issued move-in bill; held only when that bill's balance is 0
export function findDuplicateReference(payments: RentalPayment[], propertyId: string, reference: string): RentalPayment | undefined // trimmed, case-insensitive, non-empty, active only
export function previousBalance(tenancyId: string, bill: RentalBill, bills: RentalBill[], payments: RentalPayment[]): number // balances of OTHER issued bills of the tenancy due before this bill
```

`billTotal`, `isOverdue`, `statementText`, `formatBillPesos` already exist in `domain/billing.ts`. **Extend `statementText`** (backwards compatible) with optional `accounts?: PaymentAccount[]`, `previousBalanceCentavos?: number`, `paidCentavos?: number`; when given, the text adds "Pay to:" lines (`GCash — <account name> <number>`), "Previous balance" and "Paid" lines. Keep all existing statementText tests green.

### Repositories (`packages/shared/src/modules/rentals/infrastructure/`)

- `PaymentRepository`: `findAll(): Promise<RentalPayment[]>` (select `*, proofs:rental_payment_proofs(*), allocations:rental_payment_allocations(*)`, ordered newest first; viewers get `proofs: []` through RLS), `record(input: PaymentInput & { tenancyId: string }): Promise<string>` (RPC `rental_record_payment`), `void(id: string, reason: string): Promise<void>`, `uploadProof(paymentId, propertyId, file)`, `removeProof(id)`, `proofUrl(id, download?)` (60-second signed URL, bucket `rental-files`) — copy `RenterRepository` upload/remove/url logic.
- `PaymentAccountRepository`: `findAll(): Promise<PaymentAccount[]>`, `save(propertyId, id | null, input): Promise<string>`, `remove(id)` (also removes its QR object), `uploadQr(propertyId, accountId, file): Promise<void>` (validates png/jpeg/webp ≤ 2 MB, uploads to `rental-qr`, sets `qr_path`, removes the old object), `qrUrl(path): string` (public URL via `getPublicUrl`, pure).
- Export both from `infrastructure/index.ts`; add row mappers to `rows.ts`.

## Tasks

### Task A1 — Database (migration + SQL tests)
**Files:** create `supabase/migrations/20261018100000_add_rental_payments.sql`; modify `supabase/tests/rentals.sql`.
- Write SQL tests first (they must fail with "relation … does not exist"), covering: FIFO allocation across 3 bills; partial payment; overpayment credit that auto-applies when the next bill is issued; pinned allocation via `p_bill_id`; void returns bills to unpaid; shrinking/voiding a bill drops or clamps pinned allocations; editing or voiding a bill with payments is refused (Review Focus 3); viewer and stranger cannot record, void, or read proofs; cross-property tenancy is refused (Focus 4); payment-proof metadata guard; account RLS (owner writes, manager/viewer cannot); `rental_qr` bucket public, `rental-files` still private.
- Then the migration. Check the existing bill triggers and `rental_issue_bill` so `rental_reallocate` runs after issuing; do not break `20261017*` behaviour. Run the full `supabase/tests/rentals.sql` against the isolated stack (all earlier assertions must still pass).
- Commit: `feat: add rental payments, allocations and payment accounts`.

### Task A2 — Shared domain and repositories
**Files:** create `domain/payments.ts`, `infrastructure/PaymentRepository.ts`, `infrastructure/PaymentAccountRepository.ts`; modify `domain/index.ts`, `domain/billing.ts` (`statementText`), `infrastructure/rows.ts`, `infrastructure/index.ts`; tests in `web/src/modules/rentals/__tests__/payments.domain.test.ts` and `payments.repository.test.ts`.
- Tests first. Domain: partial/paid/overdue/void states; partial-and-overdue → `overdue`; credit; `depositHeld` pending → held when the move-in bill is paid; duplicate reference (case, whitespace, void ignored, other property ignored); `previousBalance`; `statementText` with accounts and previous balance; schemas reject 0 / negative amounts and bad dates. Repository (mocked Supabase, same style as `rentals.repository.test.ts`): record maps to the RPC args; void; proof upload removes the object before its metadata on failure; QR upload rejects non-image / > 2 MB before any network call; `qrUrl`.
- Commit: `feat: add rentals payments domain and repositories`.

### Task A3 — Web UI (starts after A1 and A2 are merged on the branch)
**Files:** modify `presentation/hooks/useRentals.ts`, `BillSheet.tsx`, `BillsView.tsx`, `Badges.tsx`, `HomeView.tsx`, `TenantSheet.tsx`, `Statement.tsx`, `PropertyForm.tsx`, `utils/messenger.ts`, `utils/billingMonth.ts` (overdue); create `RecordPaymentDialog.tsx`, `PaymentsList.tsx`, `PaymentAccountsEditor.tsx`; tests in `__tests__/Payments.test.tsx`.
- Hook: load payments and accounts in the same query; add actions `recordPayment`, `voidPayment`, `uploadPaymentProof`, `removePaymentProof`, `saveAccount`, `removeAccount`, `uploadQr`; expose `paymentProofUrl`.
- Behaviour (all from the spec): "Record payment" on a bill and on a tenant, amount pre-filled with `tenancyOwed`, method, reference with a **duplicate warning**, date (default today, Manila), notes, several proof images, optional "pay this bill first"; payments list per tenant and per bill with Void (reason dialog) and proof view; bill badges Paid / Partial ₱X left / Unpaid / Overdue; credit shown on the tenant sheet; Home "Overdue" section replaces "past due" and a "Deposits held" figure uses `depositHeld`; owner-only "Payment accounts" section in Edit property (kind, label, name, number, QR upload with preview); `Statement` and Messenger copy show "Pay to" accounts, previous balance and paid amount; viewers see everything read-only (no Record/Void buttons, no proof section).
- Tests first: viewer sees no record/void controls; duplicate-reference warning shows; the amount is pre-filled; void asks a reason; state badges; accounts editor is owner-only; Messenger text includes accounts. Existing tests must stay green (update labels such as "past due" deliberately).
- Commit in logical pieces.

### Task A4 — Lead: review, host migration, docs
Fresh reviewer on the whole step (Review Focus above); fix Critical/Important with RED→GREEN tests; apply the migration to the hosted project (one transaction, then `migration repair`), verify RLS and the buckets; update `docs/modules/rentals.md` and `docs/MAP.md`; full `npx vitest run`, build, lint.
