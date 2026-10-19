import { useState } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Copy, Gauge, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { addPeriods, billState, billTotal, finalBillLines, utilityLine, formatBillPesos, manilaToday, periodLabel, periodOf, statementText } from '@himan/shared/rentals';
import type { BillLine, IssueBillInput, MeterReading, ReadingInput, UtilityBill, RentalBill, RentalPayment, RentalProperty, RentalTenancy, Renter } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { AddReadingsDialog, MeterReadings } from './MeterReadings';
import { BillAmountsDialog } from './BillAmountsDialog';
import type { ReadingSoa } from './MeterReadings';
import { Initials } from './Badges';
import type { StatementInfo } from './Statement';
import { errorMessage } from '../utils/errorMessage';
import { monthRows, monthTodo, unreplacedCancelled, useWide } from '../utils/billingMonth';
import type { MonthRow } from '../utils/billingMonth';
import { cn } from '@core/presentation/utils';
import { billMoney } from '../utils/billMoney';
import type { MoneyTone } from '../utils/billMoney';

const chip = 'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold';
const MONEY_TONE: Record<MoneyTone, string> = { due: 'text-foreground', late: 'text-destructive', paid: 'text-emerald-700 dark:text-emerald-400',
  cancelled: 'text-muted-foreground line-through decoration-1' };
const KIND: Record<RentalBill['kind'], string> = { move_in: 'Move-in SOA', monthly: 'Monthly SOA', final: 'Final SOA' };
const short = (date: string) => format(parseISO(date), 'MMM d');

/**
 * One month of bills, grouped by what to do next: waiting for a meter, ready to issue, issued, no bill.
 * Meter readings sit beside the list on a laptop and open as their own screen on a phone.
 */
export function BillsView({ property, tenancies, renters, readings, bills, utilityBills, payments = [], startWithAmounts, canManage, busy, run, statementInfo, startWithMeters, startOnCancelled,
  onOpenBill, onOpenPending }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; readings: MeterReading[]; bills: RentalBill[];
  utilityBills: UtilityBill[]; payments?: RentalPayment[]; startWithAmounts?: boolean;
  canManage: boolean; statementInfo(t: RentalTenancy, bill?: RentalBill): StatementInfo; startWithMeters?: boolean;
  /** Open on this month with the Cancelled filter (from Home's "not replaced" task). */
  startOnCancelled?: string;
  onOpenBill(billId: string): void; onOpenPending(tenancyId: string, period: string, skipUtilities: boolean): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const today = manilaToday();
  const wide = useWide();
  const [period, setPeriod] = useState(startOnCancelled ?? periodOf(today));
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [metersOpen, setMetersOpen] = useState(!!startWithMeters && !wide);
  const [showPanel, setShowPanel] = useState(false);
  const [panelClosed, setPanelClosed] = useState(false);
  const [addOpen, setAddOpen] = useState(!!startWithMeters);
  const earliest = tenancies.map((t) => periodOf(t.moveIn)).sort()[0] ?? periodOf(today);
  const latest = addPeriods(periodOf(today), 1);
  const name = (t: RentalTenancy) => renters.find((r) => r.id === t.renterId)?.fullName ?? 'Tenant';
  const room = (t: RentalTenancy) => property.units.find((u) => u.id === t.unitId)?.name ?? 'Room';
  const rows = monthRows({ property, tenancies, readings, bills, utilityBills }, period, skipped);
  const todo = monthTodo(rows, [], today, property.units);
  const [amountsOpen, setAmountsOpen] = useState(!!startWithAmounts);
  const isMonthly = (unitId: string, kind: 'electric' | 'water') => {
    const unit = property.units.find((u) => u.id === unitId);
    return (kind === 'electric' ? unit?.electricMode : unit?.waterMode) === 'monthly';
  };
  const hasMonthly = canManage && property.units.some((u) => u.electricMode === 'monthly' || u.waterMode === 'monthly');
  // Every SOA that exists for this month (monthly, move-in, final, cancelled), overdue first, cancelled last.
  const soas = rows.flatMap((r) => [...(r.pending.state === 'issued' ? [r.pending.bill] : []), ...r.others].map((bill) => ({ r, bill })));
  const overdue = (b: RentalBill) => billState(b, payments, today) === 'overdue';
  const rank = (b: RentalBill) => (b.status === 'void' ? 2 : overdue(b) ? 0 : 1);
  soas.sort((a, b) => rank(a.bill) - rank(b.bill) || a.bill.dueOn.localeCompare(b.bill.dueOn));
  const liveSoas = soas.filter((x) => x.bill.status !== 'void');
  const FILTERS = {
    active: { label: 'Active', keep: (b: RentalBill) => b.status !== 'void' },
    overdue: { label: 'Overdue', keep: overdue },
    cancelled: { label: 'Cancelled', keep: (b: RentalBill) => b.status === 'void' },
    all: { label: 'All', keep: () => true },
  } as const;
  const [filter, setFilter] = useState<keyof typeof FILTERS>(startOnCancelled ? 'cancelled' : 'active');
  const shownSoas = soas.filter((x) => FILTERS[filter].keep(x.bill));
  const hasMeters = canManage && property.units.some((u) => u.electricMode === 'submeter' || u.waterMode === 'submeter');
  const month = periodLabel(period).split(' ')[0];
  // On a laptop the panel only takes room while a bill waits on a reading, or after "Read meters".
  const panelShown = wide && hasMeters && !panelClosed && (todo.waiting.length > 0 || showPanel);
  const readyInputs: IssueBillInput[] = todo.ready.flatMap(({ t, pending }) => pending.state === 'ready'
    ? [{ tenancyId: t.id, kind: 'monthly' as const, period, dueOn: pending.dueOn, lines: pending.lines }] : []);

  const readMeters = () => setAddOpen(true);
  const showMeters = () => { if (wide) { setShowPanel(true); setPanelClosed(false); } else setMetersOpen(true); };
  const closeMeters = () => { setShowPanel(false); setPanelClosed(true); };
  const issue = async (inputs: IssueBillInput[]) => {
    try {
      const { issued, failed } = await run({ type: 'issueBills', inputs }) as { issued: number; failed: string[] };
      if (issued) toast.success(`${issued} SOA${issued === 1 ? '' : 's'} generated. Copy each one as text.`);
      if (failed.length) {
        const names = failed.map((id) => name(tenancies.find((t) => t.id === id)!)).join(', ');
        toast.warning(`Couldn’t generate the SOA${failed.length === 1 ? '' : 's'} for ${names}. Try again.`);
      }
    } catch (failure) { toast.error(errorMessage(failure)); }
  };
  // A cancelled SOA with nothing replacing it can be made again. Monthly ones normally come back under "Ready for SOA";
  // only one that can't (e.g. the tenant moved out before the due date) gets the button. A final SOA re-reads the meters.
  const unreplaced = new Set(unreplacedCancelled({ property, tenancies, readings, bills, utilityBills }).map((b) => b.id));
  const canRegenerate = (b: RentalBill) => unreplaced.has(b.id);
  // Rent and charges are copied; electricity and water are worked out again from today's readings,
  // so a reading corrected after cancelling shows up in the new SOA.
  const regenerate = (b: RentalBill, t: RentalTenancy) => {
    const ctx = { property, tenancies, readings, bills, utilityBills };
    const unit = property.units.find((u) => u.id === t.unitId);
    const lines = b.kind === 'final' && t.moveOut ? finalBillLines(ctx, t.id, t.moveOut)
      : b.lines.flatMap((l) => l.kind !== 'electric' && l.kind !== 'water' ? [l]
        : unit ? [utilityLine({ unit, kind: l.kind, tenancy: t, tenancies, readings, bills, upTo: b.dueOn, period: b.period, dueOn: b.dueOn, utilityBills })].filter((x): x is BillLine => !!x) : [l]);
    void issue([{ tenancyId: t.id, kind: b.kind, period: b.period, dueOn: b.dueOn, lines: lines.length ? lines : b.lines }]);
  };
  const copy = async (bill: RentalBill, t: RentalTenancy) => {
    try {
      await navigator.clipboard.writeText(statementText(bill, statementInfo(t, bill)));
      toast.success(`Copied ${name(t)}’s SOA as text. Paste it anywhere, like Messenger.`);
    } catch { toast.error('Couldn’t copy. Open the bill and copy it from there.'); }
  };
  const kindOf = (b: RentalBill) => KIND[b.kind].replace(/^\S+/, (w) => w.toLowerCase());
  const soaOf: ReadingSoa = new Map(bills.filter((b) => b.status === 'issued').flatMap((b) => {
    const t = tenancies.find((x) => x.id === b.tenancyId);
    const label = `${t ? name(t) : 'a tenant'}’s ${b.kind === 'monthly' ? `${periodLabel(b.period).split(' ')[0]} SOA` : kindOf(b)}`;
    return b.lines.flatMap((l) => l.meter?.readings ?? []).map((id) => [id, { billId: b.id, label }] as const);
  }));
  const saveReadings = async (inputs: ReadingInput[]) => {
    await run({ type: 'saveReadings', propertyId: property.id, inputs });
    toast.success(inputs.length === 1 ? 'Reading saved' : 'Readings saved');
  };
  const meters = hasMeters && <MeterReadings key={period} units={property.units} readings={readings} busy={busy} period={period}
    soaOf={soaOf} needed={todo.meters} canManage={canManage} bare={!wide} onClose={wide ? closeMeters : undefined} onAdd={() => setAddOpen(true)} onSave={saveReadings}
    onOpenBill={onOpenBill} />;

  const btn = 'h-10 sm:h-8';
  /**
   * One tenant, read like a sentence for older users: who and which room on the left, then how much is left to pay and whether it is
   * late, in words and large type. The SOA number sits quietly underneath. Actions are always labelled buttons, never icon-only.
   */
  const row = (r: MonthRow, { badge, number, money, actions, label, key, dim }: {
    badge?: ReactNode; number?: string; money?: { tone: MoneyTone; headline: string; detail: string }; actions?: ReactNode;
    label?: string; key?: string; dim?: boolean }) =>
    <li key={key ?? r.t.id} aria-label={label ?? `${name(r.t)} · ${room(r.t)}`}
      className={cn('px-4 py-4 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-6', dim && 'opacity-70')}>
      <div className="flex min-w-0 gap-3">
        <Initials name={name(r.t)} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-base font-semibold">{name(r.t)}</p>{badge}</div>
          <p className="text-sm text-muted-foreground">{room(r.t)}</p>
          {number && <p className="mt-1 text-xs tabular-nums text-muted-foreground">SOA no. {number}</p>}
        </div>
      </div>
      {money && <div className="mt-3 pl-12 sm:mt-0 sm:pl-0">
        <p className={cn('flex items-center gap-1.5 text-lg font-bold tabular-nums', MONEY_TONE[money.tone])}>
          {money.tone === 'paid' ? <CircleCheck aria-hidden className="h-5 w-5 shrink-0" />
            : money.tone === 'late' ? <CircleAlert aria-hidden className="h-5 w-5 shrink-0" /> : null}{money.headline}</p>
        <p className={cn('text-sm', money.tone === 'late' ? 'font-medium text-destructive' : 'text-muted-foreground')}>{money.detail}</p>
      </div>}
      {actions && <div className="mt-3 flex flex-wrap gap-2 [&>*]:flex-1 sm:mt-0 sm:flex-nowrap sm:justify-end sm:[&>*]:flex-none">{actions}</div>}
    </li>;

  return <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
    <div className="min-w-0 flex-1 space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label="Previous month" disabled={period <= earliest}
            onClick={() => setPeriod(addPeriods(period, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <h3 className="min-w-36 text-center text-lg font-semibold">{periodLabel(period)}</h3>
          <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label="Next month" disabled={period >= latest}
            onClick={() => setPeriod(addPeriods(period, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        {hasMeters && !panelShown && <Button variant="outline" className="h-11 sm:h-9" onClick={showMeters}>
          <Gauge className="h-4 w-4" />Meters</Button>}
        {hasMonthly && <Button variant="outline" className="h-11 sm:h-9" onClick={() => setAmountsOpen(true)}>
          <ReceiptText className="h-4 w-4" />Bill amounts</Button>}
      </div>

      {todo.waiting.length + todo.ready.length + soas.length === 0 && <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center">
        <ReceiptText aria-hidden className="h-8 w-8 text-muted-foreground" />
        <p className="mt-3 font-medium">No SOAs for {periodLabel(period)}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">Tenants get a monthly SOA from their first due date after the months their advance covers.</p>
      </div>}

      {todo.waiting.length > 0 && <section aria-labelledby="bills-waiting" className="overflow-hidden rounded-xl border border-amber-500/40 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 bg-amber-500/10 px-4 py-3">
          <h3 id="bills-waiting" className="min-w-0 flex-1 font-semibold">
            {todo.waiting.length} SOA{todo.waiting.length === 1 ? '' : 's'} waiting for {todo.meters.size && todo.amounts.size ? 'readings and bill amounts'
              : todo.amounts.size ? 'bill amounts' : 'meter readings'}</h3>
          {hasMeters && todo.meters.size > 0 && <Button className="h-11 sm:h-9" onClick={readMeters}><Gauge className="h-4 w-4" />Read meters</Button>}
          {hasMonthly && todo.amounts.size > 0 && <Button className="h-11 sm:h-9" onClick={() => setAmountsOpen(true)}>
            <ReceiptText className="h-4 w-4" />Add bill amounts</Button>}
        </div>
        <ul className="divide-y">{todo.waiting.map((r) => row(r, {
          money: { tone: 'due', headline: r.pending.state === 'needs-reading' && r.pending.kinds.every((k) => isMonthly(r.t.unitId, k))
            ? 'Needs the bill amount' : 'Needs a meter reading', detail: `Due ${short(r.due)}` },
          actions: canManage && <Button variant="outline" size="sm" className={btn}
            onClick={() => setSkipped((s) => new Set(s).add(`${r.t.id}:${period}`))}>Skip utilities this month</Button> }))}</ul>
      </section>}

      {todo.ready.length > 0 && <section aria-labelledby="bills-ready" className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <h3 id="bills-ready" className="min-w-0 flex-1 font-semibold">Ready for SOA <span className="text-muted-foreground">· {todo.ready.length}</span></h3>
          {canManage && <Button className="h-11 sm:h-9" disabled={busy} onClick={() => void issue(readyInputs)}>
            Generate all {todo.ready.length} SOA{todo.ready.length === 1 ? '' : 's'} · {formatBillPesos(todo.readyTotal)}</Button>}
        </div>
        <ul className="divide-y border-t">{todo.ready.map((r) => r.pending.state === 'ready' && row(r, {
          money: { tone: 'due', headline: formatBillPesos(billTotal(r.pending.lines)), detail: `Not generated yet. Due ${short(r.due)}` },
          actions: <>
            <Button variant="outline" size="sm" className={btn} onClick={() => onOpenPending(r.t.id, period, r.skip)}>View SOA</Button>
            {canManage && <Button size="sm" className={btn} disabled={busy}
              onClick={() => r.pending.state === 'ready' && void issue([{ tenancyId: r.t.id, kind: 'monthly', period, dueOn: r.pending.dueOn, lines: r.pending.lines }])}>Generate SOA</Button>}
          </> }))}</ul>
      </section>}

      {soas.length > 0 && <section aria-labelledby="bills-issued" className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 py-3">
          <h3 id="bills-issued" className="font-semibold">SOAs generated <span className="text-muted-foreground">· {liveSoas.length}</span></h3>
          <span className="text-sm tabular-nums text-muted-foreground">{formatBillPesos(liveSoas.reduce((sum, x) => sum + billTotal(x.bill.lines), 0))} total</span>
        </div>
        <div role="group" aria-label="Show SOAs" className="flex flex-wrap gap-2 px-4 pb-3">
          {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((key) => {
            const count = soas.filter((x) => FILTERS[key].keep(x.bill)).length;
            return (count > 0 || key === 'active' || key === filter) && <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary sm:min-h-8">
              {FILTERS[key].label} <span className="tabular-nums">{count}</span></button>;
          })}
        </div>
        {filter !== 'cancelled' && filter !== 'all' && (() => {
          const waiting = soas.filter((x) => unreplaced.has(x.bill.id)).length;
          return waiting > 0 && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t bg-amber-500/10 px-4 py-2 text-sm">
            <span>{waiting} cancelled SOA{waiting === 1 ? ' has' : 's have'} no replacement.</span>
            <Button variant="link" className="h-auto p-0" onClick={() => setFilter('cancelled')}>Show</Button>
          </div>;
        })()}
        {shownSoas.length === 0 && <p className="border-t px-4 py-4 text-sm italic text-muted-foreground">
          {filter === 'active' ? `Every SOA for ${month} is cancelled. Pick “Cancelled” to see them.` : 'Nothing here.'}</p>}
        <ul className="divide-y border-t empty:hidden">{shownSoas.map(({ r, bill }) => {
          const cancelled = bill.status === 'void';
          return row(r, { key: bill.id, dim: cancelled, label: `${KIND[bill.kind]} ${bill.number} · ${name(r.t)} · ${room(r.t)}`,
            number: bill.number, money: billMoney(bill, payments, today),
            badge: bill.kind !== 'monthly' && <span className={cn(chip, 'bg-primary/10 text-primary')}>{KIND[bill.kind]}</span>,
            actions: <>
              {!cancelled && <Button variant="outline" size="sm" className={btn} aria-label={`Copy ${name(r.t)}’s ${kindOf(bill)} as text`}
                onClick={() => void copy(bill, r.t)}><Copy className="h-4 w-4" />Copy as text</Button>}
              {canManage && canRegenerate(bill) && <Button size="sm" className={btn} disabled={busy}
                aria-label={`Generate ${name(r.t)}’s ${kindOf(bill)} again`} onClick={() => regenerate(bill, r.t)}>Generate again</Button>}
              <Button variant="outline" size="sm" className={btn} aria-label={`View ${name(r.t)}’s ${kindOf(bill)}`} onClick={() => onOpenBill(bill.id)}>View SOA</Button>
            </> });
        })}</ul>
      </section>}

    </div>

    {meters && panelShown && <aside aria-label="Meter readings"
      className="w-full space-y-2 duration-300 ease-out animate-in fade-in-0 slide-in-from-right-6 lg:sticky lg:top-4 lg:w-[340px] lg:shrink-0">
      {meters}
    </aside>}
    {hasMonthly && <BillAmountsDialog open={amountsOpen} onOpenChange={setAmountsOpen} units={property.units} tenancies={tenancies}
      utilityBills={utilityBills} period={period} needed={todo.amounts} busy={busy} onSave={async (inputs) => {
        await run({ type: 'saveUtilityBills', propertyId: property.id, inputs });
        toast.success(inputs.length === 1 ? 'Bill amount saved' : 'Bill amounts saved');
      }} />}
    {hasMeters && <AddReadingsDialog open={addOpen} onOpenChange={setAddOpen} units={property.units} readings={readings}
      needed={todo.meters} busy={busy} onSave={saveReadings} />}
    {meters && !wide && <Sheet open={metersOpen} onOpenChange={setMetersOpen}>
      <SheetContent side="bottom" className="flex h-[100dvh] flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3 pr-12 text-left">
          <SheetTitle>{property.name}</SheetTitle>
          <SheetDescription>Type the number on each meter, then save.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">{meters}</div>
      </SheetContent>
    </Sheet>}
  </div>;
}
