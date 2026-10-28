// Pure helpers for the rentals property screen on web and mobile: what needs attention now, how many things are left to do,
// which tenants have something to do, and the month's numbers for Analytics.
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { addPeriods, billTotal } from './billing.js';
import { contractStage } from './contracts.js';
import type { ContractText, TenancyLink } from './contracts.js';
import { nextDueDate } from './flow.js';
import { billBalance, depositHeld, isEarlier } from './payments.js';
import type { RentalPayment } from './payments.js';
import { monthRows, monthTodo, unreplacedCancelled } from './screens.js';
import { depositToReturn } from './settlement.js';
import type { RentalSettlement } from './settlement.js';
import type { MeterReading, RentalBill, RentalProperty, RentalTenancy, UtilityBill } from './types.js';

export interface OverviewCtx {
  property: RentalProperty; tenancies: RentalTenancy[]; bills: RentalBill[]; payments: RentalPayment[];
  readings: MeterReading[]; utilityBills: UtilityBill[];
}

/** One urgent thing: an unpaid bill (late or not yet due) or rent coming due within a week. */
export interface AttentionItem {
  key: string; kind: 'overdue' | 'unpaid' | 'due_soon'; tenancyId: string; renterId: string; unitId: string;
  billId?: string; billNumber?: string; amountCentavos: number; date: string;
  /** Days from today to `date`; negative when late. */
  inDays: number;
}

export const DUE_SOON_WINDOW = 7;

/**
 * What needs attention now, most urgent first: unpaid bills past due (oldest first), unpaid bills not due yet, then rent due within
 * a week (soonest first). Bills from before payment tracking are left out, as on the to-do list.
 */
export function needsAttention(ctx: Pick<OverviewCtx, 'property' | 'tenancies' | 'bills' | 'payments'>, today: string): AttentionItem[] {
  const tenancy = (id: string) => ctx.tenancies.find((t) => t.id === id);
  const days = (date: string) => differenceInCalendarDays(parseISO(date), parseISO(today));
  const unpaid = ctx.bills
    .filter((b) => b.status === 'issued' && !isEarlier(b, ctx.property.paymentsTrackedFrom) && billBalance(b, ctx.payments) > 0 && tenancy(b.tenancyId))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn))
    .map((b): AttentionItem => {
      const t = tenancy(b.tenancyId)!;
      return { key: `bill-${b.id}`, kind: b.dueOn < today ? 'overdue' : 'unpaid', tenancyId: t.id, renterId: t.renterId, unitId: t.unitId,
        billId: b.id, billNumber: b.number, amountCentavos: billBalance(b, ctx.payments), date: b.dueOn, inDays: days(b.dueOn) };
    });
  const dueSoon = ctx.tenancies.filter((t) => t.moveOut === null).flatMap((t): AttentionItem[] => {
    const contract = t.contracts.find((c) => c.status === 'active');
    if (!contract) return [];
    const date = nextDueDate(contract.dueDay, today);
    // An unpaid bill for that same due date already says it.
    if (days(date) > DUE_SOON_WINDOW || unpaid.some((u) => u.tenancyId === t.id && u.date === date)) return [];
    return [{ key: `due-${t.id}`, kind: 'due_soon', tenancyId: t.id, renterId: t.renterId, unitId: t.unitId,
      amountCentavos: contract.monthlyRentCentavos, date, inDays: days(date) }];
  }).sort((a, b) => a.inDays - b.inDays);
  return [...unpaid.filter((u) => u.kind === 'overdue'), ...unpaid.filter((u) => u.kind === 'unpaid'), ...dueSoon];
}

/**
 * The to-do list's tasks, counted the way the To do screen lists them (free beds aside: they are not a chore), plus overdue bills.
 * `byRenter` counts the ones about each tenant, for the badge on their tile, and includes their urgent items.
 */
export function todoCounts(ctx: OverviewCtx, today: string, opts: {
  canManage: boolean; canEdit: boolean; contractTexts?: ContractText[]; links?: TenancyLink[]; settlements?: RentalSettlement[];
}): { total: number; byRenter: Map<string, number> } {
  const { canManage, canEdit, contractTexts = [], links = [], settlements = [] } = opts;
  const byRenter = new Map<string, number>();
  const bump = (renterId: string) => byRenter.set(renterId, (byRenter.get(renterId) ?? 0) + 1);
  let total = 0;
  const active = ctx.tenancies.filter((t) => t.moveOut === null);
  const rows = monthRows(ctx, today.slice(0, 7));
  const todo = monthTodo(rows, ctx.bills, today, ctx.property.units, ctx.payments);
  if (ctx.property.units.length === 0 && canEdit) total++;
  if (canManage) {
    for (const t of active) {
      const stage = contractStage(t, contractTexts);
      if (stage === 'none' || stage === 'draft' || stage === 'sent' || stage === 'signed') { total++; bump(t.renterId); }
      if (links.some((l) => l.tenancyId === t.id && l.status === 'submitted')) { total++; bump(t.renterId); }
      const contract = t.contracts.find((c) => c.status === 'active');
      if (contract && differenceInCalendarDays(parseISO(contract.endDate), parseISO(today)) <= 30) { total++; bump(t.renterId); }
    }
    for (const t of ctx.tenancies) {
      if (depositToReturn(t, ctx.bills, ctx.payments, settlements.find((s) => s.tenancyId === t.id)).state === 'to_settle') { total++; bump(t.renterId); }
    }
    if (todo.meters.size) total++;
    if (todo.amounts.size) total++;
    if (todo.ready.length) total++;
    for (const r of todo.ready) bump(r.t.renterId);
    if (unreplacedCancelled(ctx).length) total++;
  }
  const overdue = todo.overdue.filter((b) => !isEarlier(b, ctx.property.paymentsTrackedFrom));
  total += overdue.length;
  for (const item of needsAttention(ctx, today)) bump(item.renterId);
  return { total, byRenter };
}

/** A month's money and paperwork for Analytics, plus the six months up to it for the chart. */
export function monthFigures(ctx: OverviewCtx, period: string, settlements: RentalSettlement[] = []) {
  const active = ctx.tenancies.filter((t) => t.moveOut === null);
  const billed = (p: string) => ctx.bills.filter((b) => b.status === 'issued' && b.period === p).reduce((sum, b) => sum + billTotal(b.lines), 0);
  const collected = (p: string) => ctx.payments.filter((x) => x.status === 'active' && x.paidOn.slice(0, 7) === p)
    .reduce((sum, x) => sum + x.amountCentavos, 0);
  const rows = monthRows(ctx, period);
  const deposits = ctx.tenancies.map((t) => depositHeld(t, ctx.bills, ctx.payments, settlements.find((s) => s.tenancyId === t.id)));
  return {
    billedCentavos: billed(period),
    collectedCentavos: collected(period),
    soasIssued: rows.filter((r) => r.pending.state === 'issued').length,
    soasToBill: rows.filter((r) => r.pending.state !== 'covered' && r.pending.state !== 'none').length,
    rentCentavos: active.reduce((sum, t) => sum + (t.contracts.find((c) => c.status === 'active')?.monthlyRentCentavos ?? 0), 0),
    unpaidCentavos: ctx.bills.filter((b) => b.status === 'issued').reduce((sum, b) => sum + billBalance(b, ctx.payments), 0),
    depositsCentavos: deposits.reduce((sum, d) => sum + (d.state === 'held' ? d.amountCentavos : 0), 0),
    /** Deposits on move-in bills not paid in full yet. */
    depositsPendingCentavos: deposits.reduce((sum, d) => sum + (d.state === 'pending' ? d.amountCentavos : 0), 0),
    bedsTaken: active.length,
    beds: ctx.property.units.reduce((sum, u) => sum + u.capacity, 0),
    trend: [-5, -4, -3, -2, -1, 0].map((n) => addPeriods(period, n)).map((p) => ({ period: p, billedCentavos: billed(p), collectedCentavos: collected(p) })),
  };
}
