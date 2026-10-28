import { useState } from 'react';
import type { ReactNode } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { BedDouble, CalendarClock, CircleCheck, DoorOpen, FilePlus2, Gauge, HandCoins, History, PenLine, ReceiptText, Send, UserCheck, UserRound } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { billBalance, contractStage, depositToReturn, earlierUnpaid, formatBillPesos, isEarlier, formatPesos, manilaToday, nextDueDate, periodLabel, periodOf } from '@himan/shared/rentals';
import type { ContractText, MeterReading, TenancyLink, RentalBill, RentalPayment, RentalProperty, RentalSettlement, RentalTenancy, Renter, UtilityBill } from '@himan/shared/rentals';
import { monthRows, monthTodo, unreplacedCancelled } from '../utils/billingMonth';
import { cn } from '@core/presentation/utils';

const names = (list: string[]) => list.length <= 3 ? list.join(', ') : `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`;

/** The To do screen: what needs doing for this property this month, overdue bills, and rent due within a week. */
export function HomeView({ property, tenancies, renters, bills, readings, canManage, canEdit, onReadMeters, onOpenBills, onOpenBill,
  onAddTenant, onAddRoom, onOpenTenant, onReviewCancelled, utilityBills, onAddBillAmounts, payments = [], onMarkEarlierPaid, contractTexts = [], links = [],
  settlements = [], onSettleDeposit, onOpenContract = onOpenTenant, onContractNotNeeded }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; bills: RentalBill[]; readings: MeterReading[]; payments?: RentalPayment[];
  canManage: boolean; canEdit: boolean; onReadMeters(): void; onOpenBills(): void; onOpenBill(billId: string): void;
  onAddTenant(unitId: string): void; onAddRoom(): void; onOpenTenant(renterId: string): void; onReviewCancelled(period: string): void;
  utilityBills: UtilityBill[]; onAddBillAmounts(): void; onMarkEarlierPaid?(): void; contractTexts?: ContractText[]; links?: TenancyLink[];
  settlements?: RentalSettlement[]; onSettleDeposit?(tenancyId: string): void;
  /** Opens the tenant sheet at the Contract section. */
  onOpenContract?(renterId: string): void; onContractNotNeeded?(tenancyId: string): void;
}) {
  const [confirmEarlier, setConfirmEarlier] = useState(false);
  const today = manilaToday();
  const period = periodOf(today);
  const month = periodLabel(period).split(' ')[0];
  const name = (t: Pick<RentalTenancy, 'renterId'>) => renters.find((r) => r.id === t.renterId)?.fullName ?? 'Tenant';
  const roomName = (unitId: string) => property.units.find((u) => u.id === unitId)?.name ?? 'Room';
  const active = tenancies.filter((t) => t.moveOut === null);
  const rows = monthRows({ property, tenancies, readings, bills, utilityBills }, period);
  const todo = monthTodo(rows, bills, today, property.units, payments);
  // Bills from before payment tracking have no payments on record; they wait in their own banner, not in Overdue.
  const overdue = todo.overdue.filter((b) => !isEarlier(b, property.paymentsTrackedFrom));
  const earlier = earlierUnpaid(property, bills, payments);
  const trackedSince = property.paymentsTrackedFrom ? format(parseISO(property.paymentsTrackedFrom), 'MMM d, yyyy') : '';
  const settlementOf = (t: RentalTenancy) => settlements.find((s) => s.tenancyId === t.id);
  const meterRooms = [...new Set([...todo.meters].map((key) => roomName(key.split(':')[0])))];
  const freeUnits = property.units.filter((u) => active.filter((t) => t.unitId === u.id).length < u.capacity);
  const freeBeds = freeUnits.reduce((sum, u) => sum + u.capacity - active.filter((t) => t.unitId === u.id).length, 0);
  const tenancyOf = (b: RentalBill) => tenancies.find((t) => t.id === b.tenancyId);
  const dueSoon = active.flatMap((tenancy) => {
    const contract = tenancy.contracts.find((c) => c.status === 'active');
    if (!contract) return [];
    const date = nextDueDate(contract.dueDay, today);
    const inDays = differenceInCalendarDays(parseISO(date), parseISO(today));
    return inDays <= 7 ? [{ tenancy, rent: contract.monthlyRentCentavos, date, inDays }] : [];
  }).sort((a, b) => a.inDays - b.inDays);

  // The written contract is optional but a priority: its to-dos come first, until it's done or dismissed.
  const tasks: ReactNode[] = [];
  if (canManage) for (const t of active) {
    const stage = contractStage(t, contractTexts);
    const who = name(t);
    const task = stage === 'none' ? { icon: FilePlus2, title: `Create contract for ${who}`, detail: 'Not written yet', action: 'Create contract' }
      : stage === 'draft' ? { icon: Send, title: `Send contract to ${who}`, detail: 'Draft saved, not sent yet', action: 'Send' }
      : stage === 'sent' ? { icon: PenLine, title: `Waiting for ${who} to sign`, detail: 'Sent through their link', action: 'Open' }
      : stage === 'signed' ? { icon: PenLine, title: `Countersign contract for ${who}`, detail: 'The tenant signed', action: 'Countersign' }
      : null;
    if (task) tasks.push(<Task key={`contract-${t.id}`} tone="primary" {...task} detail={`${roomName(t.unitId)} · ${task.detail}`} label={task.title}
      onAction={() => onOpenContract(t.renterId)}
      secondary={onContractNotNeeded && (stage === 'none' || stage === 'draft')
        ? { action: 'Not needed', label: `Contract not needed for ${who}`, onAction: () => onContractNotNeeded(t.id) } : undefined} />);
  }
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
  if (canManage) for (const t of active) {
    if (links.some((l) => l.tenancyId === t.id && l.status === 'submitted')) tasks.push(<Task key={`review-${t.id}`} icon={UserCheck} tone="primary"
      title={`Review details from ${name(t)}`} detail={`${roomName(t.unitId)} · sent through their link`} action="Review"
      label={`Review details from ${name(t)}`} onAction={() => onOpenTenant(t.renterId)} />);
  }
  if (canManage) for (const t of active) {
    const contract = t.contracts.find((c) => c.status === 'active');
    const left = contract ? differenceInCalendarDays(parseISO(contract.endDate), parseISO(today)) : Infinity;
    if (left <= 30) tasks.push(<Task key={`ends-${t.id}`} icon={CalendarClock} tone="amber"
      title={left > 1 ? `Contract ends in ${left} days` : left === 1 ? 'Contract ends tomorrow' : left === 0 ? 'Contract ends today' : 'Contract has ended'}
      detail={`${name(t)} · ${roomName(t.unitId)} · ${format(parseISO(contract!.endDate), 'MMM d, yyyy')}`} action="Open"
      label={`Open ${name(t)}’s contract`} onAction={() => onOpenTenant(t.renterId)} />);
  }
  if (canManage && onSettleDeposit) for (const t of tenancies) {
    const deposit = depositToReturn(t, bills, payments, settlementOf(t));
    if (deposit.state === 'to_settle') tasks.push(<Task key={`deposit-${t.id}`} icon={HandCoins} tone="amber" title="Deposit to return"
      detail={`${name(t)} · ${roomName(t.unitId)} · ${formatBillPesos(deposit.depositCentavos)}`} action="Settle"
      label={`Settle ${name(t)}’s deposit`} onAction={() => onSettleDeposit(t.id)} />);
  }
  if (canManage && freeBeds > 0) tasks.push(<Task key="free" icon={BedDouble} tone="emerald"
    title={`${freeBeds} free bed${freeBeds === 1 ? '' : 's'}`} detail={freeUnits.map((u) => u.name).join(' · ')}
    action="Add tenant" onAction={() => onAddTenant(freeUnits[0].id)} />);

  return <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
    <div className="min-w-0 flex-1 space-y-5">
    <section aria-labelledby="rentals-todo" className="space-y-3">
      <h3 id="rentals-todo" className="text-lg font-semibold">To do for {month}</h3>
      {tasks.length ? <ul className="space-y-3">{tasks.map((task, i) => <li key={i}>{task}</li>)}</ul>
        : <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <CircleCheck aria-hidden className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p><span className="font-medium">Nothing to do right now.</span> <span className="text-muted-foreground">New tasks show up here when bills come due.</span></p>
        </div>}
    </section>
    {canManage && onMarkEarlierPaid && earlier.tenancyIds.length > 0 && <section aria-labelledby="rentals-earlier"
      className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONE.amber)}><History className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <h3 id="rentals-earlier" className="font-semibold">Bills from before payment tracking</h3>
        <p className="text-sm text-muted-foreground">
          {earlier.tenancyIds.length} tenant{earlier.tenancyIds.length === 1 ? '' : 's'} · {formatBillPesos(earlier.totalCentavos)} shows as unpaid on SOAs from before {trackedSince}.</p>
      </div>
      <button type="button" onClick={() => setConfirmEarlier(true)}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 sm:w-auto">
        Mark all as paid</button>
      <ConfirmDialog open={confirmEarlier} onOpenChange={setConfirmEarlier} title="Mark the earlier SOAs as paid?" confirmText="Mark all as paid"
        description={`This records one payment per tenant for the ${formatBillPesos(earlier.totalCentavos)} still unpaid on SOAs from before ${trackedSince}. If some weren’t paid in full, cancel and instead open a tenant and record what was actually paid.`}
        onConfirm={onMarkEarlierPaid} />
    </section>}
    {overdue.length > 0 && <section aria-labelledby="rentals-overdue" className="rounded-xl border border-destructive/40 bg-card p-4 shadow-sm">
      <h3 id="rentals-overdue" className="font-semibold text-destructive">Overdue</h3>
      <p className="text-sm text-muted-foreground">Unpaid after the due date. Press View SOA to record a payment.</p>
      <ul className="mt-2 divide-y">{overdue.map((b) => {
        const t = tenancyOf(b);
        const late = differenceInCalendarDays(parseISO(today), parseISO(b.dueOn));
        return <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 text-sm">
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{t ? name(t) : 'Tenant'}</span>
            <span className="block text-xs text-muted-foreground">{t ? `${roomName(t.unitId)} · ` : ''}{b.number}</span></span>
          <span className="shrink-0 text-right text-xs font-semibold tabular-nums text-destructive">
            {formatBillPesos(billBalance(b, payments))} left · {late} day{late === 1 ? '' : 's'} late</span>
          <button type="button" aria-label={`View SOA ${b.number}`} onClick={() => onOpenBill(b.id)}
            className={cn(BUTTON, 'gap-2 border bg-background hover:bg-muted/50')}><ReceiptText aria-hidden className="h-4 w-4" />View SOA</button>
        </li>;
      })}</ul>
    </section>}
    </div>

    <aside className="space-y-4 lg:w-80 lg:shrink-0">
      {dueSoon.length > 0 && <section aria-labelledby="rentals-due" className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 id="rentals-due" className="font-semibold">Rent due in the next 7 days</h3>
        <ul className="mt-2 divide-y">{dueSoon.map(({ tenancy, rent: amount, date, inDays }) => <li key={tenancy.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 text-sm">
          <span className="min-w-0 flex-1"><span className="block truncate font-medium">{name(tenancy)}</span>
            <span className="block truncate text-xs text-muted-foreground">{roomName(tenancy.unitId)} · {format(parseISO(date), 'MMM d')} · {inDays === 0 ? 'today' : inDays === 1 ? 'tomorrow' : `in ${inDays} days`}</span></span>
          <span className="shrink-0 font-semibold tabular-nums">{formatPesos(amount)}</span>
          <button type="button" aria-label={`View ${name(tenancy)}`} onClick={() => onOpenTenant(tenancy.renterId)}
            className={cn(BUTTON, 'gap-2 border bg-background hover:bg-muted/50 lg:w-full')}><UserRound aria-hidden className="h-4 w-4" />View tenant</button>
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

const BUTTON = 'inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9 sm:w-auto';

function Task({ icon: Icon, tone, title, detail, action, label, primary, onAction, secondary }: {
  icon: typeof Gauge; tone: keyof typeof TONE; title: string; detail: string; action: string; label?: string; primary?: boolean; onAction(): void;
  secondary?: { action: string; label: string; onAction(): void };
}) {
  return <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4 shadow-sm', tone === 'destructive' && 'border-destructive/40')}>
    <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', TONE[tone])}><Icon className="h-5 w-5" /></span>
    <span className="min-w-0 flex-1"><span className="block font-semibold">{title}</span>
      <span className="block text-sm text-muted-foreground">{detail}</span></span>
    {secondary && <button type="button" aria-label={secondary.label} onClick={secondary.onAction}
      className={cn(BUTTON, 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}>{secondary.action}</button>}
    <button type="button" aria-label={label} onClick={onAction} className={cn(BUTTON,
      primary ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border bg-background hover:bg-muted/50')}>{action}</button>
  </div>;
}
