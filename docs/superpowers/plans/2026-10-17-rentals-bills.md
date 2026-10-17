# Rentals Bills (Phase 2 part 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landlords read every meter once a month, issue one Statement of Account per tenant in one session (one property-wide due date, a full month of rent per bill), copy it to Messenger, and fix or cancel it later. Move-in and move-out issue their own bills.

**Architecture:** Two new tables (`rental_meter_readings`, `rental_bills` with lines as a jsonb snapshot) and three columns (`rental_properties.late_fee_centavos` and `rent_due_day`, `rental_tenancies.charges`). Numbering and issuing happen in one RPC (`rental_issue_bill`), and `rental_start_tenancy` issues the move-in bill (prorated days to the first due date + advance + deposit) in the same transaction. A contract guard trigger and `rental_change_rent` handle the rent lock. Pending bills are **computed live** by pure domain functions (`billing.ts`), so there are no stored drafts. The web adds a **Bills** view (readings list + tenant rows), a `Statement` component, a `BillSheet`, and extends Add tenant, Move out, the tenant sheet and the property form.

**Tech Stack:** React 19, TanStack Query v5, Tailwind v4 + shadcn primitives, zod, date-fns, Supabase (Postgres + RLS), Vitest + RTL.

**Spec:** `docs/superpowers/specs/2026-10-16-rentals-design.md` — section "Phase 2 part 1 — meter readings and bills".

## Global Constraints

- Flow C: one reading session and one issue session a month; each bill keeps the tenant's due date and a full month of rent from that due day.
- Property `rent_due_day` ("Rent is due every [N]", nullable): Add tenant defaults the due day to it, else to the move-in day. Existing tenants are not changed.
- Move-in between due dates: the move-in bill charges `round(rent × days / 30)` for move-in → day before the first due date on or after move-in; none when moving in on the due date. The advance pays the first full months from that due date.
- One bill per tenancy per month (`kind = 'monthly'`); plus `move_in` and `final` bills.
- Money is integer centavos; meter values have at most 2 decimals; usage math runs in hundredths (integers), amounts `Math.round`.
- "Today" is `manilaToday()` in the app and `(now() AT TIME ZONE 'Asia/Manila')::date` in SQL.
- Bill numbers: `PREFIX-YYYY-NNNN`, per property, within the issue year, assigned only in `rental_issue_bill`.
- Words: **Bill / Statement of Account**, never "invoice" in the UI. Room, Shared room, Tenant (as Flow v2).
- Viewers: read and copy only. Managers: readings, issue, edit, cancel. Owners: late fee and prefix.
- No new npm dependencies. English only. Layout works at 375px; touch targets `h-11 sm:h-9` / `size-11 sm:size-9`.
- Bills hide ".00" on whole pesos (`formatBillPesos`); the rest of the app keeps `formatPesos`.
- Ask the user before applying the migration to the hosted DB and before each commit. Hosted: `supabase db query --linked -f` wrapped in BEGIN/COMMIT, then `supabase migration repair --status applied <ver> --linked`. Never `db push`.
- Commits: conventional, sentence-per-line body, no AI attribution.

## Review Focus

1. **Shared room, 3 tenants, ₱4,801 electricity.** Shares ₱1,600.34 / ₱1,600.33 / ₱1,600.33 (160034 / 160033 / 160033 centavos) with the extra centavo on the longest-staying tenant; totals add up exactly. Pinned in Task 2.
2. **Tenant moves out of a shared room mid-cycle with a final reading.** The leaver's final bill holds only their share of the segment ending at that reading; the housemates' next monthly bills hold their shares of that segment plus the next one, and nothing is billed twice. Pinned in Task 2.
3. **Due day 31 in February / due every 5th with move-in on the 15th.** Due Feb 28 (29 in 2028). Move-in Oct 15, rent 350000, due day 5 → move-in bill has `Rent (21 days)` 245000 (Oct 15 – Nov 4) + advance + deposit; November is covered by a 1-month advance; first monthly bill December, due Dec 5. TS (`proratedRent`) and SQL (`rental_start_tenancy`) give the same amount. Pinned in Task 1 and Task 2.
4. **Two people press Issue at the same time.** Numbers never collide (advisory lock + unique index); a second monthly bill for the same tenant and month is refused with a plain message. Pinned in Task 1 (SQL) and Task 3 (message mapping).
5. **Editing rent after bills exist.** The direct edit is refused by the DB with a plain message; the UI offers "New rent from [month]" instead; old bills keep their amounts. Pinned in Task 1 and Task 6.

---

### Task 1: Schema, RPCs and SQL tests

**Files:**
- Create: `supabase/migrations/20261017000000_add_rental_bills.sql`
- Modify: `supabase/tests/rentals.sql` (append before the final `RESET ROLE`)

**Interfaces:**
- Produces: tables `rental_meter_readings`, `rental_bills`; columns `rental_properties.late_fee_centavos`, `rental_tenancies.charges`; RPCs `rental_issue_bill(p_tenancy_id uuid, p_kind text, p_period text, p_due_on date, p_lines jsonb) → uuid`, `rental_change_rent(p_contract_id uuid, p_from date, p_rent integer) → uuid`; `rental_start_tenancy` (same signature) now also issues the move-in bill.
- Line jsonb shape (all tasks): `{ "kind": "rent"|"advance"|"deposit"|"charge"|"electric"|"water"|"penalty"|"other", "label": text, "amount": integer, "period"?: {"from": date, "to": date}, "meter"?: {"readings": [uuid…], "fromDate": date, "fromValue": number, "toDate": date, "toValue": number, "usage": number, "rate": integer, "sharedWith": integer} }`.

- [ ] **Step 1: Write the migration**

```sql
-- Phase 2 part 1: meter readings and bills (Statement of Account).

ALTER TABLE public.rental_properties
  ADD COLUMN late_fee_centavos integer NOT NULL DEFAULT 0 CHECK (late_fee_centavos BETWEEN 0 AND 2000000000);
-- "Rent is due every [N]" for the whole property; NULL = each tenant's move-in day.
ALTER TABLE public.rental_properties
  ADD COLUMN rent_due_day integer CHECK (rent_due_day BETWEEN 1 AND 31);
GRANT UPDATE (late_fee_centavos, rent_due_day) ON public.rental_properties TO authenticated;

-- Optional extra monthly charges per tenant, e.g. [{"label":"Parking","amount":100000}].
ALTER TABLE public.rental_tenancies
  ADD COLUMN charges jsonb NOT NULL DEFAULT '[]'
  CHECK (jsonb_typeof(charges) = 'array' AND jsonb_array_length(charges) <= 20);
GRANT UPDATE (charges) ON public.rental_tenancies TO authenticated;

CREATE TABLE public.rental_meter_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('electric', 'water')),
  read_on date NOT NULL,
  value numeric(12, 2) NOT NULL CHECK (value >= 0),
  is_reset boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (unit_id, kind, read_on),
  FOREIGN KEY (unit_id, property_id) REFERENCES public.rental_units(id, property_id) ON DELETE CASCADE
);

CREATE TABLE public.rental_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  tenancy_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('move_in', 'monthly', 'final')),
  period text NOT NULL CHECK (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  number text NOT NULL,
  issued_on date NOT NULL,
  due_on date NOT NULL,
  lines jsonb NOT NULL CHECK (jsonb_typeof(lines) = 'array' AND jsonb_array_length(lines) BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'void')),
  void_reason text NOT NULL DEFAULT '' CHECK (char_length(void_reason) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, number),
  FOREIGN KEY (tenancy_id, property_id) REFERENCES public.rental_tenancies(id, property_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX rental_bills_one_monthly ON public.rental_bills(tenancy_id, period)
  WHERE kind = 'monthly' AND status = 'issued';
CREATE UNIQUE INDEX rental_bills_one_move_in ON public.rental_bills(tenancy_id)
  WHERE kind = 'move_in' AND status = 'issued';
CREATE INDEX rental_bills_property_period_idx ON public.rental_bills(property_id, period);

-- ── Triggers ────────────────────────────────────────────────────────────────

CREATE FUNCTION public.rental_bill_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status = 'void' THEN RAISE EXCEPTION 'This bill was cancelled and can’t be changed'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_bill_guard BEFORE UPDATE ON public.rental_bills
  FOR EACH ROW EXECUTE FUNCTION public.rental_bill_guard();
CREATE TRIGGER rental_bills_updated_at BEFORE UPDATE ON public.rental_bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- A reading on an issued bill is part of that bill's record.
CREATE FUNCTION public.rental_reading_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.rental_bills b WHERE b.property_id = OLD.property_id AND b.status = 'issued'
    AND jsonb_path_exists(b.lines, '$[*].meter.readings[*] ? (@ == $id)', jsonb_build_object('id', OLD.id::text)))
  THEN RAISE EXCEPTION 'This reading is on an issued bill. Cancel that bill first.'; END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
CREATE TRIGGER rental_reading_guard BEFORE UPDATE OR DELETE ON public.rental_meter_readings
  FOR EACH ROW EXECUTE FUNCTION public.rental_reading_guard();

-- Billed terms stay as billed: advance/deposit after a move-in bill, rent after a monthly bill.
CREATE FUNCTION public.rental_contract_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF (NEW.advance_months, NEW.deposit_centavos) IS DISTINCT FROM (OLD.advance_months, OLD.deposit_centavos)
    AND EXISTS (SELECT 1 FROM public.rental_bills WHERE tenancy_id = OLD.tenancy_id AND kind = 'move_in' AND status = 'issued')
  THEN RAISE EXCEPTION 'Advance and deposit are on the move-in bill. Cancel that bill first to change them.'; END IF;
  IF NEW.monthly_rent_centavos <> OLD.monthly_rent_centavos
    AND EXISTS (SELECT 1 FROM public.rental_bills WHERE tenancy_id = OLD.tenancy_id AND kind = 'monthly' AND status = 'issued')
  THEN RAISE EXCEPTION 'This rent is already on bills. Use “New rent from” instead.'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER rental_contract_guard BEFORE UPDATE ON public.rental_contracts
  FOR EACH ROW EXECUTE FUNCTION public.rental_contract_guard();

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rental_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bills ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rental_meter_readings, public.rental_bills FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.rental_meter_readings TO authenticated;
GRANT UPDATE (read_on, value, is_reset) ON public.rental_meter_readings TO authenticated;
GRANT SELECT, INSERT ON public.rental_bills TO authenticated;
GRANT UPDATE (lines, due_on, status, void_reason) ON public.rental_bills TO authenticated;

CREATE POLICY "Members read readings" ON public.rental_meter_readings FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers add readings" ON public.rental_meter_readings FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers fix readings" ON public.rental_meter_readings FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers delete readings" ON public.rental_meter_readings FOR DELETE TO authenticated
  USING (public.rental_has_role(property_id, 'manager'));

CREATE POLICY "Members read bills" ON public.rental_bills FOR SELECT TO authenticated
  USING (public.rental_has_role(property_id, 'viewer'));
CREATE POLICY "Managers issue bills" ON public.rental_bills FOR INSERT TO authenticated
  WITH CHECK (public.rental_has_role(property_id, 'manager'));
CREATE POLICY "Managers change bills" ON public.rental_bills FOR UPDATE TO authenticated
  USING (public.rental_has_role(property_id, 'manager')) WITH CHECK (public.rental_has_role(property_id, 'manager'));

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- SECURITY INVOKER: RLS decides who may issue. The advisory lock serializes numbering per
-- property without needing UPDATE rights on the property row.
CREATE FUNCTION public.rental_issue_bill(p_tenancy_id uuid, p_kind text, p_period text, p_due_on date, p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_property uuid; v_prefix text; v_today date := (now() AT TIME ZONE 'Asia/Manila')::date;
  v_stem text; v_seq integer; v_id uuid;
BEGIN
  SELECT t.property_id, p.invoice_prefix INTO v_property, v_prefix
  FROM public.rental_tenancies t JOIN public.rental_properties p ON p.id = t.property_id WHERE t.id = p_tenancy_id;
  IF v_property IS NULL THEN RAISE EXCEPTION 'Tenant not found'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_property::text, 0));
  v_stem := v_prefix || '-' || to_char(v_today, 'YYYY') || '-';
  SELECT coalesce(max(substr(number, char_length(v_stem) + 1)::integer), 0) + 1 INTO v_seq
  FROM public.rental_bills WHERE property_id = v_property AND number LIKE v_stem || '%';
  INSERT INTO public.rental_bills (property_id, tenancy_id, kind, period, number, issued_on, due_on, lines)
  VALUES (v_property, p_tenancy_id, p_kind, p_period, v_stem || lpad(v_seq::text, 4, '0'), v_today, p_due_on, p_lines)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.rental_change_rent(p_contract_id uuid, p_from date, p_rent integer) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE c public.rental_contracts; v_id uuid;
BEGIN
  SELECT * INTO c FROM public.rental_contracts WHERE id = p_contract_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contract not found or already ended'; END IF;
  IF p_from <= c.start_date THEN RAISE EXCEPTION 'The new rent must start after the current one'; END IF;
  UPDATE public.rental_contracts SET status = 'ended', end_date = p_from WHERE id = c.id;
  INSERT INTO public.rental_contracts (property_id, tenancy_id, start_date, end_date, monthly_rent_centavos,
    due_day, advance_months, deposit_centavos)
  VALUES (c.property_id, c.tenancy_id, p_from, greatest(c.end_date, p_from + 365), p_rent, c.due_day,
    c.advance_months, c.deposit_centavos)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Same signature as Phase 1; now also issues the move-in bill: rent for the days until the first
-- due date (rent ÷ 30 × days; must match proratedRent in billing.ts) + advance × rent + deposit.
CREATE OR REPLACE FUNCTION public.rental_start_tenancy(p_unit_id uuid, p_renter_id uuid, p_move_in date, p_start date,
  p_end date, p_rent integer, p_due_day integer, p_advance integer, p_deposit integer) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_property uuid; v_tenancy uuid; v_lines jsonb := '[]'; v_due date; v_days integer;
BEGIN
  SELECT property_id INTO v_property FROM public.rental_units WHERE id = p_unit_id;
  IF v_property IS NULL THEN RAISE EXCEPTION 'Unit not found'; END IF;
  INSERT INTO public.rental_tenancies (property_id, unit_id, renter_id, move_in)
  VALUES (v_property, p_unit_id, p_renter_id, p_move_in) RETURNING id INTO v_tenancy;
  INSERT INTO public.rental_contracts (property_id, tenancy_id, start_date, end_date, monthly_rent_centavos,
    due_day, advance_months, deposit_centavos)
  VALUES (v_property, v_tenancy, p_start, p_end, p_rent, p_due_day, p_advance, p_deposit);
  -- First due date on or after move-in; a due day past the month's end means the last day.
  v_due := date_trunc('month', p_move_in)::date + (least(p_due_day,
    extract(day FROM date_trunc('month', p_move_in) + interval '1 month - 1 day')::integer) - 1);
  IF v_due < p_move_in THEN
    v_due := (date_trunc('month', p_move_in) + interval '1 month')::date + (least(p_due_day,
      extract(day FROM date_trunc('month', p_move_in) + interval '2 months - 1 day')::integer) - 1);
  END IF;
  v_days := v_due - p_move_in;
  IF v_days > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'rent',
      'label', 'Rent (' || v_days || CASE WHEN v_days = 1 THEN ' day)' ELSE ' days)' END,
      'amount', round(p_rent::numeric * v_days / 30)::bigint,
      'period', jsonb_build_object('from', p_move_in, 'to', v_due - 1)));
  END IF;
  IF p_advance > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'advance',
      'label', 'Advance (' || p_advance || CASE WHEN p_advance = 1 THEN ' month)' ELSE ' months)' END,
      'amount', p_rent::bigint * p_advance));
  END IF;
  IF p_deposit > 0 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('kind', 'deposit', 'label', 'Deposit', 'amount', p_deposit));
  END IF;
  IF jsonb_array_length(v_lines) > 0 THEN
    PERFORM public.rental_issue_bill(v_tenancy, 'move_in', to_char(p_move_in, 'YYYY-MM'), p_move_in, v_lines);
  END IF;
  RETURN v_tenancy;
END;
$$;

REVOKE ALL ON FUNCTION public.rental_issue_bill(uuid, text, text, date, jsonb),
  public.rental_change_rent(uuid, date, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rental_issue_bill(uuid, text, text, date, jsonb),
  public.rental_change_rent(uuid, date, integer) TO authenticated;
```

- [ ] **Step 2: Append SQL assertions** to `supabase/tests/rentals.sql`, as the owner (`aa001`), using the existing fixtures (property `ab001`, `Room B` `ac002`, renter `ad001`). Each block is a `DO $$ … $$` that `RAISE EXCEPTION`s on failure, in the file's existing style:
  1. `rental_start_tenancy` into a fresh room with move-in = start = `2026-10-05`, due day 5, rent 500000, advance 1, deposit 500000 creates exactly one `move_in` bill numbered `INV-<year>-0001` (use `to_char((now() AT TIME ZONE 'Asia/Manila')::date, 'YYYY')`), with two lines (advance, deposit) summing to 1000000 — no prorated line on the due date itself.
  1b. A second tenant (Room A, bedspace) moving in `2026-10-15` with due day 5, rent 350000, advance 1, deposit 350000 gets lines `Rent (21 days)` 245000 with period `2026-10-15`…`2026-11-04`, advance 350000, deposit 350000. Due day 31 with move-in `2027-02-10` → first due `2027-02-28`, 18 days.
  2. `rental_issue_bill(tenancy, 'monthly', '2026-11', '2026-11-15', '[{"kind":"rent","label":"Rent","amount":500000}]')` → number `…-0002`. The same call again raises `unique_violation`.
  3. `UPDATE rental_bills SET status = 'void'` on that monthly bill, then issuing `'2026-11'` again succeeds (`…-0003`). Updating the void bill raises with "cancelled".
  4. Changing `advance_months` on the contract raises with "move-in bill". Changing `monthly_rent_centavos` raises with "New rent from". `rental_change_rent(contract, '2026-12-01', 550000)` leaves exactly one `active` contract with 550000 and the old one `ended` with `end_date = '2026-12-01'`.
  5. Insert a reading (`electric`, value 100) and reference its id in an issued bill's `lines[0].meter.readings`; deleting the reading raises with "issued bill".
  6. A reading with `value = -1` raises `check_violation`. `charges = '{}'` raises `check_violation`. Owner can set `late_fee_centavos = 150000` and `rent_due_day = 5`; `rent_due_day = 32` raises `check_violation`.
  7. As the viewer friend: add `aa002` as viewer first (`rental_add_member`), switch `request.jwt.claim.sub` to `aa002`, and assert `rental_issue_bill` raises `insufficient_privilege` (42501); switch back to `aa001`.
- [ ] **Step 3: Run** against the isolated stack: copy the new migration into the scratch copy `/private/tmp/claude-501/-Users-jk-Developer-Personal-Himan/f032eba8-8320-446d-a4ea-36e11353231e/scratchpad/sbtest/supabase/migrations/`, start it (`supabase start` in that dir; project `himan-rentals-test`, DB port 54422), `supabase db reset`, then `psql postgresql://postgres:postgres@127.0.0.1:54422/postgres -v ON_ERROR_STOP=1 -f supabase/tests/rentals.sql`. Expected: exit 0, `ROLLBACK` at the end. If the scratch copy is gone, recreate it (copy `supabase/`, set `project_id = "himan-rentals-test"` and 544xx ports in `config.toml`, no-op the seed migrations) and ledger it.
- [ ] **Step 4: Stop the stack** (`supabase stop` in the scratch dir).

---

### Task 2: Domain — billing math

**Files:**
- Create: `packages/shared/src/modules/rentals/domain/billing.ts`
- Modify: `packages/shared/src/modules/rentals/domain/types.ts`, `schemas.ts`, `index.ts`
- Test: `web/src/modules/rentals/__tests__/rentals.billing.test.ts` (new)

**Interfaces:**
- Produces (types): `MeterKind = 'electric' | 'water'`; `MeterReading { id; propertyId; unitId; kind: MeterKind; readOn: string; value: number; isReset: boolean }`; `BillLine` (shape from Task 1, camelCase keys as listed); `RentalBill { id; propertyId; tenancyId; kind: 'move_in' | 'monthly' | 'final'; period: string; number: string; issuedOn: string; dueOn: string; lines: BillLine[]; status: 'issued' | 'void'; voidReason: string }`; `TenancyCharge { label: string; amount: number }`; `RentalTenancy.charges: TenancyCharge[]`; `PropertyInput.lateFeeCentavos: number`, `PropertyInput.rentDueDay: number | null`.
- Produces (schemas): `billLineSchema`, `tenancyChargeSchema` (label 1–60 trimmed, amount 1…2e9, message "Enter a name and amount for each charge"), `readingInputSchema { unitId: guid; kind; readOn: iso date; value: number ≥ 0, ≤ 2 decimals; isReset: boolean }`; `propertySchema.lateFeeCentavos: centavos(0).default(0)`, `propertySchema.rentDueDay: dueDay.nullable().default(null)`.
- Produces (functions), all pure:
  - `periodOf(date: string): string` → `'2026-11'`; `addPeriods(period: string, n: number): string`; `periodLabel(period): string` → `'November 2026'`.
  - `dueOn(period: string, dueDay: number): string` — clamped to the month's last day.
  - `rentSpan(period, dueDay): { from: string; to: string }` — `from = dueOn(period)`, `to = dueOn(next period) − 1 day`.
  - `firstDueOn(moveIn: string, dueDay: number): string` — first due date on or after `moveIn` (clamped).
  - `proratedRent(rentCentavos, moveIn, dueDay): { days: number; amount: number; from: string; to: string } | null` — `days = firstDueOn − moveIn`, `amount = Math.round(rent × days / 30)`; `null` when `days = 0`. Must match the SQL in Task 1.
  - `contractFor(tenancy, date): RentalContract | undefined` — the contract with the latest `startDate ≤ date` (any status).
  - `firstBillablePeriod(tenancy): string | null` — the first period whose due date (first contract's due day) is ≥ `moveIn`.
  - `isCoveredByAdvance(tenancy, period): boolean` — `period` within the first N billable periods (N = first contract's `advanceMonths`).
  - `meterSegments(readings: MeterReading[]): Segment[]` for one unit+kind, sorted by `readOn`: consecutive pairs where the later reading is not a reset; `usage = (round(to×100) − round(from×100)) / 100`, never below 0.
  - `utilityLine(args: { unit: RentalUnit; kind: MeterKind; tenancy: RentalTenancy; tenancies: RentalTenancy[]; readings: MeterReading[]; bills: RentalBill[]; upTo?: string }): BillLine | null` — fixed mode → `{ kind, label: 'Electricity' | 'Water', amount: unit amount }`; submeter → sum of this tenancy's **unbilled** shares of segments that end on or before `upTo` (default: no limit) where the tenancy lived there on the segment's end date (`moveIn ≤ end` and (`moveOut` null or `moveOut ≥ end`)); `null` when there are none. Billed = segment's `to` reading id appears in `meter.readings` of an issued bill of **this** tenancy. Split: `share = floor(amount / n)`, remainder to the earliest `moveIn` (tie → smaller id). `amount = round(usageHundredths × rate / 100)`.
  - `pendingBill(ctx: BillingContext, tenancyId: string, period: string, opts?: { skipUtilities?: boolean }): Pending` where `BillingContext = { property: RentalProperty; tenancies: RentalTenancy[]; readings: MeterReading[]; bills: RentalBill[] }` and `Pending = { state: 'issued'; bill: RentalBill } | { state: 'covered' } | { state: 'none' } | { state: 'needs-reading'; kinds: MeterKind[] } | { state: 'ready'; dueOn: string; lines: BillLine[] }`. `none` = not living there on that month's due date or no contract. Lines in order: rent (label `Rent`, `period` = `rentSpan`), each charge (`kind: 'charge'`), water, electricity.
  - `finalBillLines(ctx, tenancyId, moveOut): BillLine[]` — utility lines only, `upTo = moveOut`, the tenancy treated as living there through `moveOut`.
  - `billTotal(lines): number`; `isOverdue(bill, today): boolean` (issued and `dueOn < today`).
  - `billPrefix(name: string): string` — initials of up to 10 words, letters/digits only, uppercased; `'INV'` when empty.
  - `formatBillPesos(centavos): string` — `'₱6,200'` or `'₱6,200.50'`.
  - `statementText(bill, info: { propertyName; ownerName; ownerAddress; renterName; roomName; lateFeeCentavos }): string`.

- [ ] **Step 1: Write failing tests** in `rentals.billing.test.ts` (import from `@himan/shared/rentals`):
  - `firstDueOn('2026-10-15', 5)` → `'2026-11-05'`; `firstDueOn('2026-10-05', 5)` → `'2026-10-05'`; `firstDueOn('2027-02-10', 31)` → `'2027-02-28'`. `proratedRent(350000, '2026-10-15', 5)` → `{ days: 21, amount: 245000, from: '2026-10-15', to: '2026-11-04' }`; `proratedRent(350000, '2026-10-05', 5)` → `null`.
  - Move-in `2026-10-15`, due day 5, advance 1 → October `none` (due Oct 5 is before move-in), November covered, December `ready` with due `2026-12-05`.
  - `dueOn('2027-02', 31)` → `'2027-02-28'`; `dueOn('2028-02', 31)` → `'2028-02-29'`; `rentSpan('2026-11', 15)` → `{ from: '2026-11-15', to: '2026-12-14' }`; `rentSpan('2027-01', 31)` → `{ from: '2027-01-31', to: '2027-02-27' }`.
  - Move-in `2026-10-15`, due day 15, advance 1 → Oct covered, Nov `ready`. Move-in `2026-10-20`, due day 15 → first billable Nov, Nov covered, Dec `ready`. Advance 0 → Oct `ready`.
  - Moved out `2026-11-10`, due day 15 → Nov `none`. Already issued monthly bill for Nov → `issued`; a void one → not `issued`.
  - Private room, submeter rate 1600, readings 1200 (Oct 15) → 1350 (Nov 10) → electric line 240000, `meter.usage = 150`, `sharedWith = 1`. Only a starting reading → `needs-reading: ['electric']`; with `skipUtilities` → `ready` without an electric line.
  - Shared room, 3 tenants, segment amount 480100 → shares 160034 / 160033 / 160033, earliest move-in gets 160034 (Review Focus 1).
  - Review Focus 2: shared room A (rate 1000), tenants T1 (moved in first), T2, T3; readings r0 (Oct 1, 0), r1 (Oct 20, 30, T3's final reading), r2 (Nov 1, 90). `finalBillLines(ctx, T3, '2026-10-20')` → 10000 (30 × 1000 / 3). After that final bill is in `ctx.bills`, T1's Nov line = 10000 (r0→r1 share) + 30000 (r1→r2: 60 × 1000 / 2) = 40000, and T3 gets no further segment.
  - Reset reading: readings 900 → 50 (reset) → 80 → only the 50→80 segment counts.
  - Fixed water ₱300 on each of 2 tenants in a shared room → each line 30000.
  - Charges `[{label:'Parking', amount:100000}]` appear as a `charge` line after rent.
  - `billPrefix('Lahug Units')` → `'LU'`; `billPrefix('  ')` → `'INV'`; `billPrefix('Bahay ni Lola #2')` → `'BNL2'`.
  - `formatBillPesos(620000)` → `'₱6,200'`; `formatBillPesos(620050)` → `'₱6,200.50'`.
  - `statementText` contains the number, `November 2026`, `Rent (Nov 15 – Dec 14)`, `150 kWh × ₱16`, `TOTAL ₱6,200`, `Due Nov 15, 2026`, and the late-fee sentence only when `lateFeeCentavos > 0`.
  - `tenancyChargeSchema` rejects an empty label and amount 0; `readingInputSchema` rejects `-1` and `1.005`.
- [ ] **Step 2: Run** `cd web && npx vitest run src/modules/rentals/__tests__/rentals.billing.test.ts`. Expected: FAIL (exports missing).
- [ ] **Step 3: Implement** `billing.ts`, types and schemas. Core of the split, for reference:

```ts
/** This tenancy's unbilled shares of metered usage, as one line; null when there is nothing to bill. */
export function utilityLine({ unit, kind, tenancy, tenancies, readings, bills, upTo }: UtilityArgs): BillLine | null {
  const mode = kind === 'electric' ? unit.electricMode : unit.waterMode;
  const rate = kind === 'electric' ? unit.electricAmountCentavos : unit.waterAmountCentavos;
  const label = kind === 'electric' ? 'Electricity' : 'Water';
  if (mode === 'none') return null;
  if (mode === 'fixed') return { kind, label, amount: rate };
  const billed = new Set(bills.filter((b) => b.tenancyId === tenancy.id && b.status === 'issued')
    .flatMap((b) => b.lines.flatMap((l) => l.meter?.readings ?? [])));
  const lives = (t: RentalTenancy, day: string) => t.moveIn <= day && (t.moveOut === null || t.moveOut >= day);
  const mine = meterSegments(readings.filter((r) => r.unitId === unit.id && r.kind === kind))
    .filter((s) => (!upTo || s.to.readOn <= upTo) && !billed.has(s.to.id) && lives(tenancy, s.to.readOn));
  if (!mine.length) return null;
  let amount = 0; let usage = 0; let sharedWith = 1;
  for (const s of mine) {
    const present = tenancies.filter((t) => t.unitId === unit.id && lives(t, s.to.readOn))
      .sort((a, b) => a.moveIn.localeCompare(b.moveIn) || a.id.localeCompare(b.id));
    const total = Math.round(s.usageHundredths * rate / 100);
    const share = Math.floor(total / present.length);
    amount += share + (present[0]?.id === tenancy.id ? total - share * present.length : 0);
    usage += s.usageHundredths; sharedWith = Math.max(sharedWith, present.length);
  }
  const first = mine[0], last = mine[mine.length - 1];
  return { kind, label, amount, meter: { readings: mine.map((s) => s.to.id), fromDate: first.from.readOn,
    fromValue: first.from.value, toDate: last.to.readOn, toValue: last.to.value, usage: usage / 100, rate, sharedWith } };
}
```

  `finalBillLines` passes a copy of the tenancy with `moveOut` set, so `lives` holds through the final reading's date.
- [ ] **Step 4: Run** the billing tests, then `npx vitest run src/modules/rentals`. Expected: PASS. Fix any existing fixture that now needs `charges: []` or `lateFeeCentavos: 0`.

---

### Task 3: Repositories, flows and hook

**Files:**
- Create: `packages/shared/src/modules/rentals/infrastructure/BillRepository.ts`
- Modify: `infrastructure/rows.ts` (`billRow`, `readingRow`, `tenancyRow.charges`, `propertyRow.late_fee_centavos`, `propertyRow.rent_due_day` → `rentDueDay`), `TenancyRepository.ts` (`setCharges`, `changeRent`), `PropertyRepository.ts` (`late_fee_centavos`, `rent_due_day` in `save`), `flows.ts`, `infrastructure/index.ts`
- Modify: `web/src/modules/rentals/presentation/hooks/useRentals.ts`
- Test: `rentals.repository.test.ts`, `rentals.flows.test.ts`

**Interfaces:**
- Consumes: Task 1 RPCs and tables; Task 2 types, `finalBillLines`, `periodOf`.
- Produces:
  - `BillRepository.findAll(): Promise<RentalBill[]>` (ordered `issued_on` desc, `number` desc); `findReadings(): Promise<MeterReading[]>` (ordered `read_on`); `issue(input: IssueBillInput): Promise<string>` with `IssueBillInput = { tenancyId; kind: RentalBill['kind']; period; dueOn; lines: BillLine[] }` (lines validated by `z.array(billLineSchema).min(1)`); `updateLines(id, lines): Promise<void>`; `void(id, reason): Promise<void>`; `saveReadings(propertyId, inputs: ReadingInput[]): Promise<MeterReading[]>` (insert many, returns rows); `removeReading(id): Promise<void>`.
  - Error mapping via `rentalError(error, fallback, duplicate)`: issue duplicate → `'This tenant already has a bill for that month'`; reading duplicate → `'There is already a reading for that room on that date'`.
  - `TenancyRepository.setCharges(tenancyId, charges: TenancyCharge[]): Promise<void>`; `changeRent(contractId, from: string, rentCentavos: number): Promise<void>`.
  - `addTenant(repos, input)` now takes optional `readings?: { kind: MeterKind; value: number }[]` and `charges?: TenancyCharge[]`, returns `{ renterId: string; warnings: string[] }`. After `start` (which returns the tenancy id), it saves the readings dated `moveIn` and sets the charges; a failure there adds `'Moved in, but the starting readings weren’t saved'` / `'Moved in, but the extra charges weren’t saved'` to `warnings` instead of undoing the move-in.
  - `issueBills(repos, inputs: IssueBillInput[]): Promise<{ issued: number; failed: string[] }>` — one RPC per bill, failures collected by tenancy id.
  - `moveOut(repos, a: { ctx: BillingContext; tenancyId: string; moveOut: string; readings: { kind: MeterKind; value: number }[] }): Promise<{ warnings: string[]; finalBillId: string | null }>` — saves readings dated `moveOut` first, then `tenancies.end`, then `finalBillLines` on `ctx` plus the saved readings; issues a `final` bill (period `periodOf(moveOut)`, due `moveOut`) when there are lines. A failed final bill becomes a warning (`'Moved out, but the final bill wasn’t made. Make it from Bills.'`).
  - `useRentals` returns `bills`, `readings`, and new `RentalAction`s: `saveReadings { propertyId; inputs }`, `removeReading { id }`, `issueBills { inputs }`, `updateBillLines { id; lines }`, `voidBill { id; reason }`, `setCharges { tenancyId; charges }`, `changeRent { contractId; from; rentCentavos }`, `moveOut { tenancyId; moveOut; readings }` (the hook builds `ctx` from its own data). `addTenant` passes through the new fields.

- [ ] **Step 1: Failing tests.** Repository (mocked supabase, existing `result()` helper): `issue` calls `rpc('rental_issue_bill', { p_tenancy_id, p_kind, p_period, p_due_on, p_lines })` with snake_case-free line JSON (keys exactly as the Task 1 shape); a `23505` from `issue` → `'This tenant already has a bill for that month'`; `findAll` maps `issued_on` → `issuedOn` and keeps `lines`; `saveReadings` inserts `{ property_id, unit_id, kind, read_on, value, is_reset }`; `changeRent` calls `rental_change_rent`; tenancy rows map `charges`. Flows: `addTenant` with readings saves them dated move-in after `start`; a failing `saveReadings` returns a warning and does not remove the renter; `moveOut` saves readings, ends the tenancy, then issues a `final` bill whose electric line equals `finalBillLines` on the same data; with no metered usage it issues nothing.
- [ ] **Step 2: Run** `cd web && npx vitest run src/modules/rentals/__tests__/rentals.repository.test.ts src/modules/rentals/__tests__/rentals.flows.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** `TenancyRepository.start` must keep returning the tenancy id (the RPC already does). Change `RentalsPage`'s `addTenant` call to read `{ warnings }` and `toast.warning` each one.
- [ ] **Step 4: Run** the rentals folder. Expected: PASS. Run `npx tsc -p tsconfig.app.json --noEmit`. Expected: clean.

---

### Task 4: Bills view — readings and tenant rows

**Files:**
- Create: `web/src/modules/rentals/presentation/components/BillsView.tsx`, `MeterReadings.tsx`
- Modify: `pages/RentalsPage.tsx` (third view button **Bills**, renders `BillsView`)
- Test: `web/src/modules/rentals/__tests__/RentalsBills.test.tsx` (new; same `useRentals` mock pattern as `RentalsPage.test.tsx`, with `bills` and `readings` on the mocked state)

**Interfaces:**
- Consumes: `pendingBill`, `periodOf`, `addPeriods`, `periodLabel`, `utilityLine`, `formatBillPesos`, `billTotal`; actions `saveReadings`, `issueBills`.
- Produces: `BillsView({ property, tenancies, renters, readings, bills, canManage, busy, run, onOpenBill(billId), onOpenPending(tenancyId, period, skip) })`.

- [ ] **Step 1: Failing tests:**
  - Bills view opens on the current month (`November 2026` with system time Nov 10, 2026), with previous/next month buttons labelled `Previous month` / `Next month`; previous stops at the earliest move-in month.
  - **Meter readings** lists one row per metered room and meter (`Room 1 · Electricity`), shows the last reading and date, and typing `1350` shows `150 kWh = ₱2,400` live. A value below the last without **Meter was reset or replaced** shows `Lower than the last reading (1,200). Tick “meter was reset” if it was replaced.` and **Save readings** does nothing. Save calls `run({ type: 'saveReadings', propertyId, inputs })` with only the filled rows and the chosen date.
  - Tenant rows: `Covered by advance` (no Issue), `Needs reading` with a **Skip utilities this month** button that turns it to `Ready`, `Ready ₱6,200` with **Issue**, `Issued INV-2026-0002 · ₱6,200`, and `Cancelled` (muted).
  - **Issue all ready (2)** calls `run({ type: 'issueBills', inputs })` with both pending bills (lines from `pendingBill`); a per-row **Issue** sends one. Afterwards `toast.success('2 bills issued')`; failures → `toast.warning` naming the tenants.
  - Viewer: no reading inputs, no Issue buttons; rows still open bills.
- [ ] **Step 2: Run** `cd web && npx vitest run src/modules/rentals/__tests__/RentalsBills.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** Month state lives in `BillsView`. The "skip" set is local state keyed `tenancyId:period`. Rows sort by due date, then room name. Use `Field`, `inputClass`, the existing segmented-button style for the view switch, and `tabular-nums` for amounts.
- [ ] **Step 4: Run** the rentals folder. Expected: PASS.

---

### Task 5: Statement and bill sheet

**Files:**
- Create: `web/src/modules/rentals/presentation/components/Statement.tsx`, `BillSheet.tsx`
- Modify: `pages/RentalsPage.tsx` (sheet state `{ type: 'bill'; billId } | { type: 'pending'; tenancyId; period; skip }`)
- Test: `RentalsBills.test.tsx`

**Interfaces:**
- Consumes: `statementText`, `formatBillPesos`, `billTotal`, `isOverdue`, `periodLabel`; actions `updateBillLines`, `voidBill`, `issueBills`.
- Produces: `Statement({ bill: { number?; issuedOn?; period; dueOn; lines }, info })` — the SOA layout (header, rent and charges, Water and Electricity sections with both reading dates and values, `150 kWh × ₱16`, `1/3 share` when `sharedWith > 1`, total, due date, late-fee footer, `Received by: ________`). `BillSheet` renders `Statement` plus actions.

- [ ] **Step 1: Failing tests:**
  - Opening an issued bill shows `Statement of Account`, the number, `Rent (Nov 15 – Dec 14)`, both readings with dates, `TOTAL AMOUNT PAYABLE ₱6,200`, `Due Nov 15, 2026`.
  - **Copy for Messenger** writes `statementText(...)` to `navigator.clipboard.writeText` (mock it) and shows `toast.success('Copied. Paste it in Messenger.')`.
  - With `lateFeeCentavos = 50000` and the bill overdue (due Nov 3, today Nov 10): **Add late fee** adds a `penalty` line `Late payment penalty` 50000 via `updateBillLines`; the button is gone once the line exists. Not overdue → no button.
  - **Add other charge** (label + amount, may be negative like `-1167`) appends an `other` line; non-utility amounts are editable inline; `penalty`/`other` lines can be removed; utility lines are read-only.
  - **Cancel bill** opens the confirm (`Cancel INV-2026-0002?`), then `run({ type: 'voidBill', id, reason })`. A cancelled bill shows `Cancelled` and no actions.
  - A pending (Ready) row opens the same `Statement` without a number, with **Issue this bill**.
  - Viewer: Copy only.
- [ ] **Step 2: Run** the test file. Expected: FAIL.
- [ ] **Step 3: Implement.** Reuse the `Sheet` setup from the tenant sheet (`side="right"`, `sm:max-w-[480px]`). Statement typography: section headings uppercase `text-xs font-bold tracking-wider`, amounts right-aligned `tabular-nums`, dotted leaders optional (CSS `border-b border-dotted`). Total row `text-xl font-bold`.
- [ ] **Step 4: Run** the rentals folder. Expected: PASS.

---

### Task 6: Add tenant, move out, tenant sheet, property form, setup prefix

**Files:**
- Create: `web/src/modules/rentals/presentation/components/ChargesEditor.tsx`
- Modify: `packages/shared/src/modules/rentals/domain/flow.ts` (`moveInDefaults(moveIn, rent, rentDueDay?)` uses `rentDueDay ?? day of moveIn`), `AddTenantForm.tsx` (takes `rentDueDay`), `MoveOutDialog.tsx`, `TenantSheet.tsx`, `PropertyForm.tsx`, `SetupWizard.tsx`, `pages/RentalsPage.tsx`
- Test: `RentalsPage.test.tsx`

**Interfaces:**
- Consumes: `tenancyChargeSchema`, `billPrefix`, `proratedRent`, actions `setCharges`, `changeRent`, `moveOut`, `addTenant` (with `readings`, `charges`).
- Produces: `ChargesEditor({ idPrefix, value: TenancyCharge[], onChange })` (rows of name + `MoneyInput` + remove; **Add charge**; a `<datalist>` suggesting CUSA, Parking, Wi-Fi, Cleaning, Furniture).

- [ ] **Step 1: Failing tests:**
  - Add tenant → More details shows **Starting meter readings** only for the room's metered meters (`Electricity reading`, `Water reading`) and **Extra monthly charges**; submitting sends `readings: [{ kind: 'electric', value: 1200 }]` and `charges: [{ label: 'Parking', amount: 100000 }]`. Empty → both omitted or `[]`.
  - Move out of a metered room shows **Final meter reading (optional)** per meter; submitting calls `run({ type: 'moveOut', tenancyId, moveOut, readings })`; warnings are toasted.
  - Tenant sheet: **Extra monthly charges** section saves via `setCharges`. With an issued monthly bill on the tenancy, the rent field is replaced by **New rent** + **Starting** (`type="month"`, default next month) and saving calls `changeRent` with `from = '<month>-01'`; with an issued move-in bill, Advance and Deposit are read-only with the hint `On the move-in bill`. The save button reads **Save** (was "Save rent").
  - Property form: a **Bills** section (outside the contract details) with **Bill numbers start with** (hint `LU-2026-0001`) and **Late fee** (optional); saving sends `lateFeeCentavos`. `hasContractDetails` no longer looks at the prefix.
  - Setup wizard saves `invoicePrefix: billPrefix(name)` (`Lahug Units` → `LU`) and asks **When is rent due?** on step 1 (`Every [5]th of the month`, optional; "Each tenant's move-in day" when blank) → `rentDueDay`.
  - Property form **Bills** section also has **Rent is due every** (1–31, blank = move-in day); saving sends `rentDueDay`. Changing it shows `New tenants get this date. Change existing tenants on their tenant sheet.`
  - Add tenant on a property with `rentDueDay = 5`: Due day defaults to `5` (not the move-in day). Move-in `2026-10-15`, rent 3,500, advance 1, deposit 3,500 → **Collect on move-in** shows `₱9,450` with the breakdown `21 days rent + 1 month advance + deposit`. Move-in on the 5th → `₱7,000`, no days line.
- [ ] **Step 2: Run** `cd web && npx vitest run src/modules/rentals`. Expected: FAIL on the new cases.
- [ ] **Step 3: Implement.** `RentTerms` gets `billed: { monthly: boolean; moveIn: boolean }` from the page (computed from `bills`). The contract trigger is the backstop; its messages reach the user through `errorMessage`.
- [ ] **Step 4: Run** the full web suite (`npm run test:run`), `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`. Expected: all tests pass; typecheck clean; lint shows only the known `ProfilePage.tsx:61` error.

---

### Task 7: Docs, hosted migration, browser check, review

**Files:**
- Modify: `docs/modules/rentals.md` (layers: `billing.ts`, `BillRepository`, `BillsView`, `Statement`, `BillSheet`, `ChargesEditor`; migration `20261017000000`; deploy order; verification numbers), `docs/MAP.md` status line if it lists rentals phases.

- [ ] **Step 1: Update docs.**
- [ ] **Step 2: Ask the user**, then apply `20261017000000_add_rental_bills.sql` to the hosted DB (`supabase db query --linked -f` with the file wrapped in BEGIN/COMMIT), then `supabase migration repair --status applied 20261017000000 --linked`. Verify with read-only queries: both tables exist with RLS on, `rental_issue_bill` and `rental_change_rent` exist, `rental_start_tenancy` body contains `move_in`.
- [ ] **Step 3: Browser check** in the user's Chrome (claude-in-chrome; never enter credentials): Lahug Units → Bills → readings list, a Ready row, the Statement preview, Copy for Messenger. Do **not** issue real bills or move anyone without the user's go-ahead; preview only.
- [ ] **Step 4: Final whole-branch review** (self-review per the executing-plans skill, since no subagents), then ask the user to commit.
