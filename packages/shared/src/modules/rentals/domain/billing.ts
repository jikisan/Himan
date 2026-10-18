import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { formatPesos } from './money.js';
import type { BillLine, MeterKind } from './schemas.js';
import type { PaymentAccount } from './payments.js';
import type { MeterReading, RentalBill, RentalContract, RentalProperty, RentalTenancy, RentalUnit, UtilityBill } from './types.js';

export interface BillingContext {
  property: RentalProperty; tenancies: RentalTenancy[]; readings: MeterReading[]; bills: RentalBill[];
  /** Monthly utility bill amounts, for utilities set to 'monthly'. */
  utilityBills?: UtilityBill[];
}
export type Pending = { state: 'issued'; bill: RentalBill } | { state: 'covered' } | { state: 'none' }
  | { state: 'needs-reading'; kinds: MeterKind[] } | { state: 'ready'; dueOn: string; lines: BillLine[] };
export interface Segment { from: MeterReading; to: MeterReading; usageHundredths: number }

const day = (date: Date) => format(date, 'yyyy-MM-dd');

// ── Months and due dates ────────────────────────────────────────────────────

export const periodOf = (date: string): string => date.slice(0, 7);
export function addPeriods(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const i = y * 12 + (m - 1) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
}
export const periodLabel = (period: string): string => format(parseISO(`${period}-01`), 'MMMM yyyy');

/** The due date in a month; a due day past the month's end means the last day. */
export function dueOn(period: string, dueDay: number): string {
  const [y, m] = period.split('-').map(Number);
  return `${period}-${String(Math.min(dueDay, new Date(Date.UTC(y, m, 0)).getUTCDate())).padStart(2, '0')}`;
}

/** A full month of rent from the due day to the day before the next one. */
export function rentSpan(period: string, dueDay: number): { from: string; to: string } {
  return { from: dueOn(period, dueDay), to: day(addDays(parseISO(dueOn(addPeriods(period, 1), dueDay)), -1)) };
}

export function firstDueOn(moveIn: string, dueDay: number): string {
  const here = dueOn(periodOf(moveIn), dueDay);
  return here >= moveIn ? here : dueOn(addPeriods(periodOf(moveIn), 1), dueDay);
}

/** Rent for the days between move-in and the first due date (rent ÷ 30 × days). Must match rental_start_tenancy. */
export function proratedRent(rentCentavos: number, moveIn: string, dueDay: number) {
  const due = firstDueOn(moveIn, dueDay);
  const days = differenceInCalendarDays(parseISO(due), parseISO(moveIn));
  return days ? { days, amount: Math.round(rentCentavos * days / 30), from: moveIn, to: day(addDays(parseISO(due), -1)) } : null;
}

export function contractFor(tenancy: RentalTenancy, date: string): RentalContract | undefined {
  return tenancy.contracts.filter((c) => c.startDate <= date).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
}
const firstContract = (t: RentalTenancy) => [...t.contracts].sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

export function firstBillablePeriod(tenancy: RentalTenancy): string | null {
  const first = firstContract(tenancy);
  return first ? periodOf(firstDueOn(tenancy.moveIn, first.dueDay)) : null;
}

/** The advance pays the first N months the tenant is billed for. */
export function isCoveredByAdvance(tenancy: RentalTenancy, period: string): boolean {
  const start = firstBillablePeriod(tenancy);
  return !!start && period >= start && period < addPeriods(start, firstContract(tenancy).advanceMonths);
}

// ── Meters ──────────────────────────────────────────────────────────────────

/** Reading-to-reading usage for one meter. A reset reading starts a new meter, so the gap before it is not charged. */
export function meterSegments(readings: MeterReading[]): Segment[] {
  const sorted = [...readings].sort((a, b) => a.readOn.localeCompare(b.readOn));
  return sorted.slice(1).flatMap((to, i) => to.isReset ? [] : [{ from: sorted[i], to,
    usageHundredths: Math.max(Math.round(to.value * 100) - Math.round(sorted[i].value * 100), 0) }]);
}

// Lived there for part of the segment and still there when it was read.
const present = (t: RentalTenancy, end: string) => t.moveIn < end && (t.moveOut === null || t.moveOut >= end);
const UTILITY_LABEL: Record<MeterKind, string> = { electric: 'Electricity', water: 'Water' };

/** This tenancy's unbilled share of a utility, as one line; null when there is nothing to bill. */
export function utilityLine({ unit, kind, tenancy, tenancies, readings, bills, upTo, period, dueOn: due, utilityBills = [] }: {
  unit: RentalUnit; kind: MeterKind; tenancy: RentalTenancy; tenancies: RentalTenancy[];
  readings: MeterReading[]; bills: RentalBill[]; upTo?: string;
  /** For 'monthly' utilities: the SOA's month and due date, and the amounts entered. */
  period?: string; dueOn?: string; utilityBills?: UtilityBill[];
}): BillLine | null {
  const mode = kind === 'electric' ? unit.electricMode : unit.waterMode;
  const rate = kind === 'electric' ? unit.electricAmountCentavos : unit.waterAmountCentavos;
  const label = UTILITY_LABEL[kind];
  if (mode === 'none') return null;
  if (mode === 'fixed') return { kind, label, amount: rate };
  if (mode === 'monthly') {
    // The month's actual bill goes on that month's SOA, split between whoever lives in the room on the due date.
    const bill = period && utilityBills.find((b) => b.unitId === unit.id && b.kind === kind && b.period === period);
    if (!bill) return null;
    const on = due ?? `${period}-28`;
    const sharing = tenancies.filter((t) => t.unitId === unit.id && t.moveIn <= on && (t.moveOut === null || t.moveOut >= on))
      .sort((a, b) => a.moveIn.localeCompare(b.moveIn) || a.id.localeCompare(b.id));
    const count = Math.max(sharing.length, 1);
    const share = Math.floor(bill.amountCentavos / count);
    const amount = share + (!sharing.length || sharing[0].id === tenancy.id ? bill.amountCentavos - share * count : 0);
    return { kind, label: count > 1 ? `${label} (1/${count} share)` : label, amount, billMonth: period };
  }
  const billed = new Set(bills.filter((b) => b.tenancyId === tenancy.id && b.status === 'issued')
    .flatMap((b) => b.lines.flatMap((l) => l.meter?.readings ?? [])));
  const mine = meterSegments(readings.filter((r) => r.unitId === unit.id && r.kind === kind))
    .filter((s) => (!upTo || s.to.readOn <= upTo) && !billed.has(s.to.id) && present(tenancy, s.to.readOn));
  if (!mine.length) return null;
  let amount = 0; let usage = 0; let sharedWith = 1;
  for (const s of mine) {
    const sharing = tenancies.filter((t) => t.unitId === unit.id && present(t, s.to.readOn))
      .sort((a, b) => a.moveIn.localeCompare(b.moveIn) || a.id.localeCompare(b.id));
    const total = Math.round(s.usageHundredths * rate / 100);
    const share = Math.floor(total / sharing.length);
    amount += share + (sharing[0].id === tenancy.id ? total - share * sharing.length : 0);
    usage += s.usageHundredths;
    sharedWith = Math.max(sharedWith, sharing.length);
  }
  const first = mine[0], last = mine[mine.length - 1];
  return { kind, label, amount, meter: { readings: mine.map((s) => s.to.id), fromDate: first.from.readOn,
    fromValue: first.from.value, toDate: last.to.readOn, toValue: last.to.value, usage: usage / 100, rate, sharedWith } };
}

const isMetered = (unit: RentalUnit, kind: MeterKind) => (kind === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter';
/** Utilities that wait for something each month: a meter reading, or the month's bill amount. */
const needsInput = (unit: RentalUnit, kind: MeterKind) => isMetered(unit, kind) || (kind === 'electric' ? unit.electricMode : unit.waterMode) === 'monthly';

// ── Bills ───────────────────────────────────────────────────────────────────

/** What a tenant's bill for a month looks like right now: issued, covered, not due, waiting for a reading, or ready. */
export function pendingBill(ctx: BillingContext, tenancyId: string, period: string, opts: { skipUtilities?: boolean } = {}): Pending {
  const tenancy = ctx.tenancies.find((t) => t.id === tenancyId);
  if (!tenancy) return { state: 'none' };
  const bill = ctx.bills.find((b) => b.tenancyId === tenancyId && b.kind === 'monthly' && b.period === period && b.status === 'issued');
  if (bill) return { state: 'issued', bill };
  const latest = contractFor(tenancy, dueOn(period, 31));
  const due = latest && dueOn(period, latest.dueDay);
  const contract = due && contractFor(tenancy, due);
  if (!due || !contract || tenancy.moveIn > due || (tenancy.moveOut !== null && tenancy.moveOut < due)) return { state: 'none' };
  if (isCoveredByAdvance(tenancy, period)) return { state: 'covered' };
  const unit = ctx.property.units.find((u) => u.id === tenancy.unitId);
  const lines: BillLine[] = [{ kind: 'rent', label: 'Rent', amount: contract.monthlyRentCentavos, period: rentSpan(period, contract.dueDay) },
    ...tenancy.charges.map((c) => ({ kind: 'charge' as const, label: c.label, amount: c.amount }))];
  const missing: MeterKind[] = [];
  for (const kind of ['water', 'electric'] as const) {
    const line = unit && utilityLine({ unit, kind, tenancy, tenancies: ctx.tenancies, readings: ctx.readings, bills: ctx.bills,
      period, dueOn: due, utilityBills: ctx.utilityBills });
    if (line) lines.push(line);
    else if (unit && needsInput(unit, kind)) missing.push(kind);
  }
  if (missing.length && !opts.skipUtilities) return { state: 'needs-reading', kinds: missing.sort() };
  return { state: 'ready', dueOn: due, lines };
}

/** Metered usage still owed by a tenant who moves out, up to their final reading. */
export function finalBillLines(ctx: BillingContext, tenancyId: string, moveOut: string): BillLine[] {
  const leaving = ctx.tenancies.find((t) => t.id === tenancyId);
  const unit = leaving && ctx.property.units.find((u) => u.id === leaving.unitId);
  if (!leaving || !unit) return [];
  const tenancy = { ...leaving, moveOut };
  const tenancies = ctx.tenancies.map((t) => (t.id === tenancyId ? tenancy : t));
  return (['water', 'electric'] as const).filter((kind) => isMetered(unit, kind)).flatMap((kind) => {
    const line = utilityLine({ unit, kind, tenancy, tenancies, readings: ctx.readings, bills: ctx.bills, upTo: moveOut });
    return line ? [line] : [];
  });
}

export const billTotal = (lines: BillLine[]): number => lines.reduce((sum, l) => sum + l.amount, 0);
export const isOverdue = (bill: RentalBill, today: string): boolean => bill.status === 'issued' && bill.dueOn < today;

export function billPrefix(name: string): string {
  const initials = name.split(/\s+/).map((w) => w.replace(/[^A-Za-z0-9]/g, '')).filter(Boolean)
    .map((w) => (/^\d+$/.test(w) ? w : w[0])).join('').toUpperCase().slice(0, 10);
  return initials || 'INV';
}

const wholePeso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
/** Bills show whole pesos without ".00". */
export const formatBillPesos = (centavos: number): string => (centavos % 100 === 0 ? wholePeso.format(centavos / 100) : formatPesos(centavos));

const UNIT_OF: Record<MeterKind, string> = { electric: 'kWh', water: 'm³' };
const short = (date: string) => format(parseISO(date), 'MMM d');
const long = (date: string) => format(parseISO(date), 'MMM d, yyyy');
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 2 });

/** The line's name as printed, e.g. "Rent (Nov 15 – Dec 14)". */
export function lineTitle(line: BillLine): string {
  return line.period && line.label === 'Rent' ? `Rent (${short(line.period.from)} – ${short(line.period.to)})` : line.label;
}
/** Usage detail for a metered line, e.g. "150 kWh × ₱16 (Oct 15: 1,200 → Nov 10: 1,350)". */
export function meterDetail(line: BillLine): string {
  if (line.billMonth && !line.meter) return `${periodLabel(line.billMonth)} bill`;
  const m = line.meter;
  if (!m || (line.kind !== 'electric' && line.kind !== 'water')) return '';
  return `${num(m.usage)} ${UNIT_OF[line.kind]} × ${formatBillPesos(m.rate)} (${short(m.fromDate)}: ${num(m.fromValue)} → ${short(m.toDate)}: ${num(m.toValue)})`
    + (m.sharedWith > 1 ? `, your 1/${m.sharedWith} share` : '');
}

// GCash and Maya print as the wallet's name; a bank or other account prints its label (e.g. "BPI").
const ACCOUNT_NAME: Partial<Record<PaymentAccount['kind'], string>> = { gcash: 'GCash', maya: 'Maya' };

export function statementText(bill: Pick<RentalBill, 'period' | 'dueOn' | 'lines'> & Partial<Pick<RentalBill, 'number' | 'issuedOn'>>, info: {
  propertyName: string; ownerName: string; ownerAddress: string; renterName: string; roomName: string; lateFeeCentavos: number;
  accounts?: PaymentAccount[]; previousBalanceCentavos?: number; paidCentavos?: number;
}): string {
  const rows = bill.lines.map((l) => {
    const detail = meterDetail(l);
    return `${lineTitle(l)}: ${formatBillPesos(l.amount)}${detail ? `\n  ${detail}` : ''}`;
  });
  const header = ['STATEMENT OF ACCOUNT',
    [info.propertyName, info.ownerName, info.ownerAddress].filter(Boolean).join(' · '),
    [bill.number && `Bill No. ${bill.number}`, bill.issuedOn && `Date ${long(bill.issuedOn)}`].filter(Boolean).join(' · '),
    `Tenant: ${info.renterName} · ${info.roomName}`, `Month: ${periodLabel(bill.period)}`].filter(Boolean);
  const footer = [`TOTAL ${formatBillPesos(billTotal(bill.lines))}`,
    ...(info.previousBalanceCentavos ? [`Previous balance ${formatBillPesos(info.previousBalanceCentavos)}`] : []),
    ...(info.paidCentavos ? [`Paid ${formatBillPesos(info.paidCentavos)}`] : []),
    `Due ${long(bill.dueOn)}`,
    ...(info.lateFeeCentavos > 0 ? [`Late payment will have a penalty of ${formatBillPesos(info.lateFeeCentavos)}.`] : [])];
  const payTo = info.accounts?.length ? ['', 'Pay to:', ...info.accounts.map((a) =>
    [`${ACCOUNT_NAME[a.kind] ?? a.label} —`, a.accountName, a.accountNumber].filter(Boolean).join(' '))] : [];
  return [...header, '', ...rows, '', ...footer, ...payTo].join('\n');
}
