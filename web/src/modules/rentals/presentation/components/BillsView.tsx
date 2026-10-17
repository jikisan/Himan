import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { addPeriods, billTotal, contractFor, dueOn, formatBillPesos, isOverdue, manilaToday, pendingBill, periodLabel,
  periodOf } from '@himan/shared/rentals';
import type { IssueBillInput, MeterReading, Pending, RentalBill, RentalProperty, RentalTenancy, Renter } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { MeterReadings } from './MeterReadings';
import { Initials } from './Badges';
import { errorMessage } from '../utils/errorMessage';
import { cn } from '@core/presentation/utils';

const chip = 'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold';
const KIND: Record<RentalBill['kind'], string> = { move_in: 'Move-in bill', monthly: 'Monthly bill', final: 'Final bill' };

/** One month of bills for a property: meter readings first, then one row per tenant. */
export function BillsView({ property, tenancies, renters, readings, bills, canManage, busy, run, onOpenBill, onOpenPending }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; readings: MeterReading[]; bills: RentalBill[];
  canManage: boolean; onOpenBill(billId: string): void; onOpenPending(tenancyId: string, period: string, skipUtilities: boolean): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const today = manilaToday();
  const [period, setPeriod] = useState(periodOf(today));
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const earliest = tenancies.map((t) => periodOf(t.moveIn)).sort()[0] ?? periodOf(today);
  const latest = addPeriods(periodOf(today), 1);
  const ctx = { property, tenancies, readings, bills };
  const name = (t: RentalTenancy) => renters.find((r) => r.id === t.renterId)?.fullName ?? 'Tenant';
  const room = (t: RentalTenancy) => property.units.find((u) => u.id === t.unitId)?.name ?? 'Room';
  const rows = tenancies.map((t) => {
    const skip = skipped.has(`${t.id}:${period}`);
    const pending = pendingBill(ctx, t.id, period, { skipUtilities: skip });
    const others = bills.filter((b) => b.tenancyId === t.id && b.period === period && !(b.kind === 'monthly' && b.status === 'issued'));
    const due = dueOn(period, contractFor(t, dueOn(period, 31))?.dueDay ?? 31);
    return { t, pending, others, skip, due };
  }).filter((r) => r.pending.state !== 'none' || r.others.length)
    .sort((a, b) => a.due.localeCompare(b.due) || room(a.t).localeCompare(room(b.t)) || name(a.t).localeCompare(name(b.t)));
  const ready = rows.flatMap(({ t, pending }) => pending.state === 'ready'
    ? [{ tenancyId: t.id, kind: 'monthly' as const, period, dueOn: pending.dueOn, lines: pending.lines }] : []);

  const issue = async (inputs: IssueBillInput[]) => {
    try {
      const { issued, failed } = await run({ type: 'issueBills', inputs }) as { issued: number; failed: string[] };
      if (issued) toast.success(`${issued} bill${issued === 1 ? '' : 's'} issued`);
      if (failed.length) {
        const names = failed.map((id) => name(tenancies.find((t) => t.id === id)!)).join(', ');
        toast.warning(`Couldn’t issue the bill${failed.length === 1 ? '' : 's'} for ${names}. Try again.`);
      }
    } catch (failure) { toast.error(errorMessage(failure)); }
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label="Previous month" disabled={period <= earliest}
        onClick={() => setPeriod(addPeriods(period, -1))}><ChevronLeft className="h-4 w-4" /></Button>
      <h3 className="text-lg font-semibold">{periodLabel(period)}</h3>
      <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label="Next month" disabled={period >= latest}
        onClick={() => setPeriod(addPeriods(period, 1))}><ChevronRight className="h-4 w-4" /></Button>
    </div>

    {canManage && <MeterReadings units={property.units} readings={readings} busy={busy} onSave={async (inputs) => {
      await run({ type: 'saveReadings', propertyId: property.id, inputs });
      toast.success('Readings saved');
    }} />}

    <section aria-labelledby="bills-list" className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <h3 id="bills-list" className="font-semibold">Tenants</h3>
        {canManage && ready.length > 0 && <Button className="h-11 sm:h-9" disabled={busy} onClick={() => void issue(ready)}>
          Issue all ready ({ready.length})</Button>}
      </div>
      {rows.length === 0
        ? <div className="flex flex-col items-center px-6 py-10 text-center">
          <ReceiptText aria-hidden className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No bills for {periodLabel(period)}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Tenants are billed from their first due date after moving in.</p>
        </div>
        : <ul className="divide-y">{rows.map(({ t, pending, others, skip, due }) => <li key={t.id} aria-label={`${name(t)} · ${room(t)}`} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={pending.state !== 'issued' && pending.state !== 'ready'}
              onClick={() => pending.state === 'issued' ? onOpenBill(pending.bill.id) : onOpenPending(t.id, period, skip)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition-colors enabled:hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
              <Initials name={name(t)} />
              <span className="min-w-0"><span className="block truncate font-medium">{name(t)}</span>
                <span className="block truncate text-sm text-muted-foreground">{room(t)} · due {format(parseISO(due), 'MMM d')}</span></span>
            </button>
            <Status pending={pending} today={today} />
            {canManage && pending.state === 'ready' && <Button variant="outline" className="h-11 sm:h-9" disabled={busy}
              onClick={() => void issue([{ tenancyId: t.id, kind: 'monthly', period, dueOn: pending.dueOn, lines: pending.lines }])}>Issue</Button>}
            {canManage && pending.state === 'needs-reading' && <Button variant="link" className="h-11 px-0 sm:h-9"
              onClick={() => setSkipped((s) => new Set(s).add(`${t.id}:${period}`))}>Skip utilities this month</Button>}
          </div>
          {others.length > 0 && <ul className="mt-2 space-y-1 pl-12">{others.map((b) => <li key={b.id}>
            <button type="button" onClick={() => onOpenBill(b.id)}
              className={cn('flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                b.status === 'void' && 'text-muted-foreground line-through decoration-muted-foreground/50')}>
              <span>{KIND[b.kind]} <span className="tabular-nums">{b.number}</span></span>
              <span className="flex items-center gap-2 tabular-nums">{b.status === 'void'
                ? <span className={cn(chip, 'bg-muted text-muted-foreground no-underline')}>Cancelled</span>
                : formatBillPesos(billTotal(b.lines))}</span>
            </button>
          </li>)}</ul>}
        </li>)}</ul>}
    </section>
  </div>;
}

function Status({ pending, today }: { pending: Pending; today: string }) {
  switch (pending.state) {
    case 'issued': return <span className="flex items-center gap-2 text-right">
      <span className="text-xs tabular-nums text-muted-foreground">{pending.bill.number}</span>
      <span className="font-semibold tabular-nums">{formatBillPesos(billTotal(pending.bill.lines))}</span>
      {isOverdue(pending.bill, today) ? <span className={cn(chip, 'bg-destructive/10 text-destructive')}>Overdue</span>
        : <span className={cn(chip, 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400')}>Issued</span>}
    </span>;
    case 'ready': return <span className="flex items-center gap-2">
      <span className={cn(chip, 'bg-primary/10 text-primary')}>Ready</span>
      <span className="font-semibold tabular-nums">{formatBillPesos(billTotal(pending.lines))}</span></span>;
    case 'needs-reading': return <span className={cn(chip, 'bg-amber-500/15 text-amber-800 dark:text-amber-300')}>Needs reading</span>;
    case 'covered': return <span className={cn(chip, 'bg-muted text-muted-foreground')}>Covered by advance</span>;
    default: return null;
  }
}
