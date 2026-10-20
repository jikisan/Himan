import { useSyncExternalStore } from 'react';
import { billState, billTotal, contractFor, dueOn, formatBillPesos, pendingBill } from '@himan/shared/rentals';
import type { MeterReading, Pending, RentalBill, RentalPayment, RentalProperty, RentalTenancy, RentalUnit, UtilityBill } from '@himan/shared/rentals';

type Ctx = { property: RentalProperty; tenancies: RentalTenancy[]; readings: MeterReading[]; bills: RentalBill[]; utilityBills?: UtilityBill[] };

export interface MonthRow { t: RentalTenancy; pending: Pending; others: RentalBill[]; skip: boolean; due: string }

/** Every tenant who has (or will have) a bill this month, earliest due first. `skipped` holds `${tenancyId}:${period}` keys. */
export function monthRows(ctx: Ctx,
  period: string, skipped: Set<string> = new Set()): MonthRow[] {
  const room = (t: RentalTenancy) => ctx.property.units.find((u) => u.id === t.unitId)?.name ?? '';
  return ctx.tenancies.map((t) => {
    const skip = skipped.has(`${t.id}:${period}`);
    const pending = pendingBill(ctx, t.id, period, { skipUtilities: skip });
    const others = ctx.bills.filter((b) => b.tenancyId === t.id && b.period === period && !(b.kind === 'monthly' && b.status === 'issued'));
    const due = dueOn(period, contractFor(t, dueOn(period, 31))?.dueDay ?? 31);
    return { t, pending, others, skip, due };
  }).filter((r) => r.pending.state !== 'none' || r.others.length)
    .sort((a, b) => a.due.localeCompare(b.due) || room(a.t).localeCompare(room(b.t)));
}

/** What is left to do for a month: meters to read, bill amounts to type, SOAs to generate, and overdue (unpaid past due) bills. */
export function monthTodo(rows: MonthRow[], bills: RentalBill[], today: string, units: RentalUnit[] = [], payments: RentalPayment[] = []) {
  const waiting = rows.filter((r) => r.pending.state === 'needs-reading');
  const ready = rows.filter((r) => r.pending.state === 'ready');
  const keys = waiting.flatMap(({ t, pending }) => pending.state === 'needs-reading' ? pending.kinds.map((k) => ({ unitId: t.unitId, kind: k })) : []);
  const byAmount = ({ unitId, kind }: { unitId: string; kind: 'electric' | 'water' }) => {
    const unit = units.find((u) => u.id === unitId);
    return (kind === 'electric' ? unit?.electricMode : unit?.waterMode) === 'monthly';
  };
  return {
    waiting, ready,
    /** `${unitId}:${kind}` of sub-meters a waiting SOA needs read. */
    meters: new Set(keys.filter((k) => !byAmount(k)).map((k) => `${k.unitId}:${k.kind}`)),
    /** `${unitId}:${kind}` of utilities whose month's bill amount a waiting SOA needs. */
    amounts: new Set(keys.filter(byAmount).map((k) => `${k.unitId}:${k.kind}`)),
    readyTotal: ready.reduce((sum, r) => sum + (r.pending.state === 'ready' ? billTotal(r.pending.lines) : 0), 0),
    overdue: bills.filter((b) => billState(b, payments, today) === 'overdue').sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
  };
}

/**
 * The latest cancelled SOA for each one that nothing replaces and that won't come back on their own: move-in and final SOAs, and monthly
 * ones whose month no longer gets a monthly SOA (e.g. the tenant moved out before the due date).
 */
export function unreplacedCancelled(ctx: Ctx): RentalBill[] {
  // One missing SOA per tenant, kind and (for monthly) month, however often it was cancelled: keep the latest copy.
  const slot = (b: RentalBill) => `${b.tenancyId}:${b.kind}:${b.kind === 'monthly' ? b.period : ''}`;
  const latest = new Map<string, RentalBill>();
  for (const b of ctx.bills) {
    if (b.status !== 'void') continue;
    const seen = latest.get(slot(b));
    if (!seen || b.issuedOn > seen.issuedOn || (b.issuedOn === seen.issuedOn && b.number > seen.number)) latest.set(slot(b), b);
  }
  return [...latest.values()].filter((b) =>
    !ctx.bills.some((x) => x.status === 'issued' && slot(x) === slot(b))
    && (b.kind !== 'monthly' || pendingBill(ctx, b.tenancyId, b.period).state === 'none'))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

const wideQuery = '(min-width: 1024px)';
/** True on laptop-size screens. Without matchMedia (tests, old browsers) it assumes a wide screen. */
export function useWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => undefined;
      const query = window.matchMedia(wideQuery);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => typeof window.matchMedia !== 'function' || window.matchMedia(wideQuery).matches,
  );
}

/** Shown before editing or cancelling a bill that has payments. */
export const paidChangeWarning = (paidCentavos: number) =>
  `${formatBillPesos(paidCentavos)} was already paid on this bill. If it goes down, the extra goes back to the tenant’s credit.`;

export { METHOD_LABEL as METHOD, billName } from '@himan/shared/rentals';
