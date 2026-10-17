import type { ReactNode } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { BedDouble, CircleCheck, Clock, DoorOpen, Gauge, ReceiptText } from 'lucide-react';
import { billTotal, formatBillPesos, formatPesos, manilaToday, nextDueDate, periodLabel, periodOf } from '@himan/shared/rentals';
import type { MeterReading, RentalBill, RentalProperty, RentalTenancy, Renter, UtilityBill } from '@himan/shared/rentals';
import { monthRows, monthTodo, unreplacedCancelled } from '../utils/billingMonth';
import { cn } from '@core/presentation/utils';

const names = (list: string[]) => list.length <= 3 ? list.join(', ') : `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`;

/** The landing tab: what needs doing for this property this month, then the numbers at a glance. */
export function HomeView({ property, tenancies, renters, bills, readings, canManage, canEdit, onReadMeters, onOpenBills, onOpenBill,
  onAddTenant, onAddRoom, onOpenTenant, onReviewCancelled, utilityBills, onAddBillAmounts }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; bills: RentalBill[]; readings: MeterReading[];
  canManage: boolean; canEdit: boolean; onReadMeters(): void; onOpenBills(): void; onOpenBill(billId: string): void;
  onAddTenant(unitId: string): void; onAddRoom(): void; onOpenTenant(renterId: string): void; onReviewCancelled(period: string): void;
  utilityBills: UtilityBill[]; onAddBillAmounts(): void;
}) {
  const today = manilaToday();
  const period = periodOf(today);
  const month = periodLabel(period).split(' ')[0];
  const name = (t: Pick<RentalTenancy, 'renterId'>) => renters.find((r) => r.id === t.renterId)?.fullName ?? 'Tenant';
  const roomName = (unitId: string) => property.units.find((u) => u.id === unitId)?.name ?? 'Room';
  const active = tenancies.filter((t) => t.moveOut === null);
  const rows = monthRows({ property, tenancies, readings, bills, utilityBills }, period);
  const todo = monthTodo(rows, bills, today, property.units);
  const meterRooms = [...new Set([...todo.meters].map((key) => roomName(key.split(':')[0])))];
  const freeUnits = property.units.filter((u) => active.filter((t) => t.unitId === u.id).length < u.capacity);
  const freeBeds = freeUnits.reduce((sum, u) => sum + u.capacity - active.filter((t) => t.unitId === u.id).length, 0);
  const beds = property.units.reduce((sum, u) => sum + u.capacity, 0);
  const rent = active.reduce((sum, t) => sum + (t.contracts.find((c) => c.status === 'active')?.monthlyRentCentavos ?? 0), 0);
  const toBill = rows.filter((r) => r.pending.state !== 'covered' && r.pending.state !== 'none').length;
  const issued = rows.filter((r) => r.pending.state === 'issued').length;
  const tenancyOf = (b: RentalBill) => tenancies.find((t) => t.id === b.tenancyId);
  const dueSoon = active.flatMap((tenancy) => {
    const contract = tenancy.contracts.find((c) => c.status === 'active');
    if (!contract) return [];
    const date = nextDueDate(contract.dueDay, today);
    const inDays = differenceInCalendarDays(parseISO(date), parseISO(today));
    return inDays <= 7 ? [{ tenancy, rent: contract.monthlyRentCentavos, date, inDays }] : [];
  }).sort((a, b) => a.inDays - b.inDays);

  const tasks: ReactNode[] = [];
  if (property.units.length === 0 && canEdit) tasks.push(<Task key="room" icon={DoorOpen} tone="primary" title="Add your first room"
    detail="Then you can move tenants in." action="Add room" primary onAction={onAddRoom} />);
  if (canManage && todo.meters.size) tasks.push(<Task key="meters" icon={Gauge} tone="amber"
    title={`Read ${todo.meters.size} meter${todo.meters.size === 1 ? '' : 's'}`}
    detail={`${names(meterRooms)} · needed for ${month} SOAs`}
    action="Read meters" primary onAction={onReadMeters} />);
  if (canManage && todo.amounts.size) {
    const what = [...todo.amounts].map((key) => { const [unitId, kind] = key.split(':'); return `${roomName(unitId)} ${kind === 'electric' ? 'electricity' : 'water'}`; });
    tasks.push(<Task key="amounts" icon={ReceiptText} tone="amber"
      title={`Add ${month} ${todo.amounts.size === 1 ? 'bill amount' : `${todo.amounts.size} bill amounts`}`}
      detail={`${names(what)} · needed for ${month} SOAs`} action="Add bill amounts" primary={!todo.meters.size} onAction={onAddBillAmounts} />);
  }
  if (canManage && todo.ready.length) tasks.push(<Task key="issue" icon={ReceiptText} tone="primary"
    title={`Generate ${todo.ready.length} SOA${todo.ready.length === 1 ? '' : 's'}`}
    detail={`${names(todo.ready.map((r) => name(r.t)))} · ${formatBillPesos(todo.readyTotal)} total`}
    action="Review" primary={!todo.waiting.length} onAction={onOpenBills} />);
  const cancelled = canManage ? unreplacedCancelled({ property, tenancies, readings, bills, utilityBills }) : [];
  if (cancelled.length) {
    const what = (b: RentalBill) => `${(() => { const t = tenancyOf(b); return t ? name(t) : 'Tenant'; })()} (${
      b.kind === 'move_in' ? 'move-in' : b.kind === 'final' ? 'final' : periodLabel(b.period).split(' ')[0]})`;
    tasks.push(<Task key="cancelled" icon={ReceiptText} tone="amber"
      title={`${cancelled.length} cancelled SOA${cancelled.length === 1 ? '' : 's'} not replaced`}
      detail={names(cancelled.map(what))} action="See cancelled" onAction={() => onReviewCancelled(cancelled[0].period)} />);
  }
  if (todo.overdue.length) {
    const first = todo.overdue[0];
    const late = differenceInCalendarDays(parseISO(today), parseISO(first.dueOn));
    const t = tenancyOf(first);
    tasks.push(<Task key="overdue" icon={Clock} tone="destructive"
      title={todo.overdue.length === 1 ? '1 bill is past its due date' : `${todo.overdue.length} bills are past their due date`}
      detail={`${todo.overdue.length === 1 ? `${t ? name(t) : 'Tenant'} · ${formatBillPesos(billTotal(first.lines))} · ${late} day${late === 1 ? '' : 's'} late`
        : names(todo.overdue.map((b) => { const x = tenancyOf(b); return x ? name(x) : 'Tenant'; }))} · check if paid`}
      action={todo.overdue.length === 1 ? 'Open bill' : 'See bills'}
      onAction={() => (todo.overdue.length === 1 ? onOpenBill(first.id) : onOpenBills())} />);
  }
  if (canManage && freeBeds > 0) tasks.push(<Task key="free" icon={BedDouble} tone="emerald"
    title={`${freeBeds} free bed${freeBeds === 1 ? '' : 's'}`} detail={freeUnits.map((u) => u.name).join(' · ')}
    action="Add tenant" onAction={() => onAddTenant(freeUnits[0].id)} />);

  return <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
    <section aria-labelledby="rentals-todo" className="min-w-0 flex-1 space-y-3">
      <h3 id="rentals-todo" className="text-lg font-semibold">To do for {month}</h3>
      {tasks.length ? <ul className="space-y-3">{tasks.map((task, i) => <li key={i}>{task}</li>)}</ul>
        : <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <CircleCheck aria-hidden className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p><span className="font-medium">Nothing to do right now.</span> <span className="text-muted-foreground">New tasks show up here when bills come due.</span></p>
        </div>}
    </section>

    <aside className="space-y-4 lg:w-80 lg:shrink-0">
      <section aria-labelledby="rentals-glance" className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 id="rentals-glance" className="font-semibold">At a glance</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Figure label="Monthly rent" value={formatPesos(rent)} className="col-span-2 lg:col-span-1" />
          <Figure label="Beds taken" value={<>{active.length} <span className="text-sm font-medium text-muted-foreground">of {beds}</span></>} />
          <Figure label={`${month} SOAs generated`} value={<>{issued} <span className="text-sm font-medium text-muted-foreground">of {toBill}</span></>} />
        </dl>
      </section>
      {dueSoon.length > 0 && <section aria-labelledby="rentals-due" className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 id="rentals-due" className="font-semibold">Rent due in the next 7 days</h3>
        <ul className="mt-2 divide-y">{dueSoon.map(({ tenancy, rent: amount, date, inDays }) => <li key={tenancy.id}>
          <button type="button" onClick={() => onOpenTenant(tenancy.renterId)}
            className="flex w-full items-center gap-3 rounded-md py-2 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="min-w-0 flex-1"><span className="block truncate font-medium">{name(tenancy)}</span>
              <span className="block truncate text-xs text-muted-foreground">{roomName(tenancy.unitId)} · {format(parseISO(date), 'MMM d')} · {inDays === 0 ? 'today' : inDays === 1 ? 'tomorrow' : `in ${inDays} days`}</span></span>
            <span className="shrink-0 font-semibold tabular-nums">{formatPesos(amount)}</span>
          </button>
        </li>)}</ul>
      </section>}
    </aside>
  </div>;
}

const TONE = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  destructive: 'bg-destructive/10 text-destructive',
  emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
} as const;

function Task({ icon: Icon, tone, title, detail, action, primary, onAction }: {
  icon: typeof Gauge; tone: keyof typeof TONE; title: string; detail: string; action: string; primary?: boolean; onAction(): void;
}) {
  return <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm', tone === 'destructive' && 'border-destructive/40')}>
    <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONE[tone])}><Icon className="h-5 w-5" /></span>
    <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span>
      <span className="block text-sm text-muted-foreground">{detail}</span></span>
    <button type="button" onClick={onAction} className={cn('inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 sm:w-auto',
      primary ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border bg-background hover:bg-muted/50')}>{action}</button>
  </div>;
}

function Figure({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return <div className={cn('min-w-0', className)}><dt className="truncate text-xs text-muted-foreground">{label}</dt>
    <dd className="truncate text-lg font-bold tabular-nums lg:text-2xl">{value}</dd></div>;
}
