import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { differenceInCalendarDays, endOfMonth, format, parseISO } from 'date-fns';
import { addPeriods, billBalance, billMoney, billPaid, billState, billTotal, centavosToInput, errorMessage, finalBillLines, formatBillPesos, isOverdue,
  lineTitle, manilaToday, monthRows, monthTodo, paidChangeWarning, parsePesos, periodLabel, periodOf, readingInputSchema, statementText, unreplacedCancelled,
  utilityBillInputSchema, utilityLine } from '@himan/shared/rentals';
import type { BillLine, IssueBillInput, MeterKind, MeterReading, MonthRow, MoneyTone, ReadingInput, RentalBill, RentalPayment, RentalProperty, RentalTenancy,
  RentalUnit, Renter, StatementInfo, UtilityBill, UtilityBillInput } from '@himan/shared/rentals';
import type { RentalsState } from '../hooks/useRentals';
import { Badge, Banner, Btn, Check, DateField, Empty, Field, Initials, Input, MoneyInput, Row, Sheet, Title, card, muted, text, useFieldErrors,
  useRentalToast } from './ui';
import { Paper, billHtml, sharePdf } from './papers';
import type { StatementBill } from './types';

const KIND: Record<RentalBill['kind'], string> = { move_in: 'Move-in SOA', monthly: 'Monthly SOA', final: 'Final SOA' };
const MONEY: Record<MoneyTone, string> = { due: text, late: 'text-red-600 dark:text-red-400', paid: 'text-emerald-700 dark:text-emerald-400',
  cancelled: `${muted} line-through` };
const short = (date: string) => format(parseISO(date), 'MMM d');

/** One month of bills, grouped by what to do next: waiting for a meter, ready to issue, issued. Same rules as web BillsView. */
export function BillsView({ property, tenancies, renters, readings, bills, utilityBills, payments, canManage, busy, run, statementInfo, startWithMeters,
  startWithAmounts, startOnCancelled, onOpenBill, onOpenPending }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; readings: MeterReading[]; bills: RentalBill[]; utilityBills: UtilityBill[];
  payments: RentalPayment[]; canManage: boolean; statementInfo(t: RentalTenancy, bill?: RentalBill): StatementInfo; startWithMeters?: boolean;
  startWithAmounts?: boolean; startOnCancelled?: string; onOpenBill(billId: string): void; onOpenPending(tenancyId: string, period: string, skip: boolean): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const toast = useRentalToast();
  const today = manilaToday();
  const [period, setPeriod] = useState(startOnCancelled ?? periodOf(today));
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [metersOpen, setMetersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(!!startWithMeters);
  const [amountsOpen, setAmountsOpen] = useState(!!startWithAmounts);
  const earliest = tenancies.map((t) => periodOf(t.moveIn)).sort()[0] ?? periodOf(today);
  const latest = addPeriods(periodOf(today), 1);
  const name = (t: RentalTenancy) => renters.find((r) => r.id === t.renterId)?.fullName ?? 'Tenant';
  const room = (t: RentalTenancy) => property.units.find((u) => u.id === t.unitId)?.name ?? 'Room';
  const rows = monthRows({ property, tenancies, readings, bills, utilityBills }, period, skipped);
  const todo = monthTodo(rows, [], today, property.units);
  const isMonthly = (unitId: string, kind: MeterKind) => {
    const unit = property.units.find((u) => u.id === unitId);
    return (kind === 'electric' ? unit?.electricMode : unit?.waterMode) === 'monthly';
  };
  const hasMonthly = canManage && property.units.some((u) => u.electricMode === 'monthly' || u.waterMode === 'monthly');
  const hasMeters = canManage && property.units.some((u) => u.electricMode === 'submeter' || u.waterMode === 'submeter');
  const soas = rows.flatMap((r) => [...(r.pending.state === 'issued' ? [r.pending.bill] : []), ...r.others].map((bill) => ({ r, bill })));
  const overdue = (b: RentalBill) => billState(b, payments, today) === 'overdue';
  const rank = (b: RentalBill) => (b.status === 'void' ? 2 : overdue(b) ? 0 : 1);
  soas.sort((a, b) => rank(a.bill) - rank(b.bill) || a.bill.dueOn.localeCompare(b.bill.dueOn));
  const liveSoas = soas.filter((x) => x.bill.status !== 'void');
  const FILTERS = {
    active: { label: 'Active', keep: (b: RentalBill) => b.status !== 'void' }, overdue: { label: 'Overdue', keep: overdue },
    cancelled: { label: 'Cancelled', keep: (b: RentalBill) => b.status === 'void' }, all: { label: 'All', keep: () => true },
  } as const;
  const [filter, setFilter] = useState<keyof typeof FILTERS>(startOnCancelled ? 'cancelled' : 'active');
  const shownSoas = soas.filter((x) => FILTERS[filter].keep(x.bill));
  const month = periodLabel(period).split(' ')[0];
  const readyInputs: IssueBillInput[] = todo.ready.flatMap(({ t, pending }) => pending.state === 'ready'
    ? [{ tenancyId: t.id, kind: 'monthly' as const, period, dueOn: pending.dueOn, lines: pending.lines }] : []);

  const issue = async (inputs: IssueBillInput[]) => {
    try {
      const { issued, failed } = await run({ type: 'issueBills', inputs }) as { issued: number; failed: string[] };
      if (issued) toast(`${issued} SOA${issued === 1 ? '' : 's'} generated. Copy each one as text.`);
      if (failed.length) toast(`Couldn’t generate the SOA${failed.length === 1 ? '' : 's'} for ${failed.map((id) => name(tenancies.find((t) => t.id === id)!)).join(', ')}. Try again.`, 'warning');
    } catch (e) { toast(errorMessage(e), 'error'); }
  };
  const unreplaced = new Set(unreplacedCancelled({ property, tenancies, readings, bills, utilityBills }).map((b) => b.id));
  const regenerate = (b: RentalBill, t: RentalTenancy) => {
    const ctx = { property, tenancies, readings, bills, utilityBills };
    const unit = property.units.find((u) => u.id === t.unitId);
    const lines = b.kind === 'final' && t.moveOut ? finalBillLines(ctx, t.id, t.moveOut)
      : b.lines.flatMap((l) => l.kind !== 'electric' && l.kind !== 'water' ? [l]
        : unit ? [utilityLine({ unit, kind: l.kind, tenancy: t, tenancies, readings, bills, upTo: b.dueOn, period: b.period, dueOn: b.dueOn, utilityBills })].filter((x): x is BillLine => !!x) : [l]);
    void issue([{ tenancyId: t.id, kind: b.kind, period: b.period, dueOn: b.dueOn, lines: lines.length ? lines : b.lines }]);
  };
  const copy = async (bill: RentalBill, t: RentalTenancy) => {
    try { await Clipboard.setStringAsync(statementText(bill, statementInfo(t, bill))); toast(`Copied ${name(t)}’s SOA as text. Paste it anywhere, like Messenger.`); }
    catch { toast('Couldn’t copy. Open the bill and copy it from there.', 'error'); }
  };
  const kindOf = (b: RentalBill) => KIND[b.kind].replace(/^\S+/, (w) => w.toLowerCase());
  const soaOf: ReadingSoa = new Map(bills.filter((b) => b.status === 'issued').flatMap((b) => {
    const t = tenancies.find((x) => x.id === b.tenancyId);
    const label = `${t ? name(t) : 'a tenant'}’s ${b.kind === 'monthly' ? `${periodLabel(b.period).split(' ')[0]} SOA` : kindOf(b)}`;
    return b.lines.flatMap((l) => l.meter?.readings ?? []).map((id) => [id, { billId: b.id, label }] as const);
  }));
  const saveReadings = async (inputs: ReadingInput[]) => {
    await run({ type: 'saveReadings', propertyId: property.id, inputs });
    toast(inputs.length === 1 ? 'Reading saved' : 'Readings saved');
  };

  const row = (r: MonthRow, { badge, number, money, actions, key, dim }: {
    badge?: ReactNode; number?: string; money?: { tone: MoneyTone; headline: string; detail: string }; actions?: ReactNode; key?: string; dim?: boolean }) =>
    <View key={key ?? r.t.id} className={`gap-3 border-t border-gray-200 px-4 py-4 dark:border-gray-700 ${dim ? 'opacity-70' : ''}`}>
      <View className="flex-row gap-3"><Initials name={name(r.t)} />
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2"><Text className={`text-base font-semibold ${text}`}>{name(r.t)}</Text>{badge}</View>
          <Text className={`text-sm ${muted}`}>{room(r.t)}</Text>
          {number ? <Text className={`text-xs ${muted}`}>SOA no. {number}</Text> : null}
        </View></View>
      {money && <View className="pl-12"><Text className={`text-lg font-bold ${MONEY[money.tone]}`}>{money.headline}</Text>
        <Text className={`text-sm ${money.tone === 'late' ? 'font-semibold text-red-600 dark:text-red-400' : muted}`}>{money.detail}</Text></View>}
      {actions ? <Row>{actions}</Row> : null}
    </View>;

  return <View className="gap-4">
    <View className="flex-row items-center justify-between gap-2">
      <Btn iconOnly icon="chevron-left" label="Previous" a11y="Previous month" disabled={period <= earliest} onPress={() => setPeriod(addPeriods(period, -1))} />
      <Text accessibilityRole="header" className={`flex-1 text-center text-lg font-semibold ${text}`}>{periodLabel(period)}</Text>
      <Btn iconOnly label="Next" icon="chevron-right" a11y="Next month" disabled={period >= latest} onPress={() => setPeriod(addPeriods(period, 1))} />
    </View>
    {(hasMeters || hasMonthly) && <Row>
      {hasMeters && <Btn icon="activity" label="Meters" onPress={() => setMetersOpen(true)} />}
      {hasMonthly && <Btn icon="file-text" label="Bill amounts" onPress={() => setAmountsOpen(true)} />}
    </Row>}

    {todo.waiting.length + todo.ready.length + soas.length === 0 && <Empty icon="file-text" title={`No SOAs for ${periodLabel(period)}`}>
      Tenants get a monthly SOA from their first due date after the months their advance covers.</Empty>}

    {todo.waiting.length > 0 && <View className="overflow-hidden rounded-2xl border border-amber-300 bg-white dark:border-amber-800 dark:bg-gray-800">
      <View className="gap-3 bg-amber-50 px-4 py-3 dark:bg-amber-950/40">
        <Title size="base">{`${todo.waiting.length} SOA${todo.waiting.length === 1 ? '' : 's'} waiting for ${todo.meters.size && todo.amounts.size ? 'readings and bill amounts'
          : todo.amounts.size ? 'bill amounts' : 'meter readings'}`}</Title>
        <Row>
          {hasMeters && todo.meters.size > 0 && <Btn variant="primary" icon="activity" label="Read meters" onPress={() => setAddOpen(true)} />}
          {hasMonthly && todo.amounts.size > 0 && <Btn variant="primary" icon="file-text" label="Add bill amounts" onPress={() => setAmountsOpen(true)} />}
        </Row>
      </View>
      {todo.waiting.map((r) => row(r, {
        money: { tone: 'due', headline: r.pending.state === 'needs-reading' && r.pending.kinds.every((k) => isMonthly(r.t.unitId, k))
          ? 'Needs the bill amount' : 'Needs a meter reading', detail: `Due ${short(r.due)}` },
        actions: canManage && <Btn small label="Skip utilities this month" onPress={() => setSkipped((s) => new Set(s).add(`${r.t.id}:${period}`))} /> }))}
    </View>}

    {todo.ready.length > 0 && <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <View className="gap-3 px-4 py-3"><Title size="base">{`Ready for SOA · ${todo.ready.length}`}</Title>
        {canManage && <Btn variant="primary" busy={busy} label={`Generate all ${todo.ready.length} SOA${todo.ready.length === 1 ? '' : 's'} · ${formatBillPesos(todo.readyTotal)}`}
          onPress={() => void issue(readyInputs)} />}</View>
      {todo.ready.map((r) => r.pending.state === 'ready' && row(r, {
        money: { tone: 'due', headline: formatBillPesos(billTotal(r.pending.lines)), detail: `Not generated yet. Due ${short(r.due)}` },
        actions: <>
          <Btn small icon="file-text" label="View SOA" onPress={() => onOpenPending(r.t.id, period, r.skip)} />
          {canManage && <Btn small variant="primary" label="Generate SOA" disabled={busy}
            onPress={() => r.pending.state === 'ready' && void issue([{ tenancyId: r.t.id, kind: 'monthly', period, dueOn: r.pending.dueOn, lines: r.pending.lines }])} />}
        </> }))}
    </View>}

    {soas.length > 0 && <View className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <View className="gap-1 px-4 py-3"><Title size="base">{`SOAs generated · ${liveSoas.length}`}</Title>
        <Text className={`text-sm ${muted}`}>{formatBillPesos(liveSoas.reduce((sum, x) => sum + billTotal(x.bill.lines), 0))} total</Text></View>
      <View className="flex-row flex-wrap gap-2 px-4 pb-3">
        {(Object.keys(FILTERS) as (keyof typeof FILTERS)[]).map((key) => {
          const count = soas.filter((x) => FILTERS[key].keep(x.bill)).length;
          return (count > 0 || key === 'active' || key === filter) && <Btn key={key} small variant={filter === key ? 'primary' : 'outline'}
            label={`${FILTERS[key].label} ${count}`} onPress={() => setFilter(key)} />;
        })}
      </View>
      {filter !== 'cancelled' && filter !== 'all' && soas.some((x) => unreplaced.has(x.bill.id)) && <View className="flex-row items-center gap-3 bg-amber-50 px-4 py-2 dark:bg-amber-950/40">
        <Text className={`flex-1 text-sm ${text}`}>{soas.filter((x) => unreplaced.has(x.bill.id)).length} cancelled SOA(s) with no replacement.</Text>
        <Btn small label="Show" onPress={() => setFilter('cancelled')} /></View>}
      {shownSoas.length === 0 && <Text className={`border-t border-gray-200 px-4 py-4 italic ${muted}`}>
        {filter === 'active' ? `Every SOA for ${month} is cancelled. Pick “Cancelled” to see them.` : 'Nothing here.'}</Text>}
      {shownSoas.map(({ r, bill }) => {
        const cancelled = bill.status === 'void';
        return row(r, { key: bill.id, dim: cancelled, number: bill.number, money: billMoney(bill, payments, today),
          badge: bill.kind !== 'monthly' && <Badge tone="primary" label={KIND[bill.kind]} />,
          actions: <>
            {!cancelled && <Btn small icon="copy" label="Copy as text" a11y={`Copy ${name(r.t)}’s ${kindOf(bill)} as text`} onPress={() => void copy(bill, r.t)} />}
            {canManage && unreplaced.has(bill.id) && <Btn small variant="primary" label="Generate again" disabled={busy} onPress={() => regenerate(bill, r.t)} />}
            <Btn small icon="file-text" label="View SOA" a11y={`View ${name(r.t)}’s ${kindOf(bill)}`} onPress={() => onOpenBill(bill.id)} />
          </> });
      })}
    </View>}

    {hasMeters && <Sheet open={metersOpen} onClose={() => setMetersOpen(false)} title={`Meters · ${periodLabel(period)}`} subtitle={property.name}>
      <MeterReadings units={property.units} readings={readings} busy={busy} period={period} soaOf={soaOf} needed={todo.meters} canManage={canManage}
        onAdd={() => setAddOpen(true)} onSave={saveReadings} onOpenBill={(id) => { setMetersOpen(false); onOpenBill(id); }} />
      {addOpen && <AddReadings units={property.units} readings={readings} needed={todo.meters} busy={busy} onClose={() => setAddOpen(false)}
        onSave={async (inputs) => { await saveReadings(inputs); setAddOpen(false); }} />}
    </Sheet>}
    {hasMeters && !metersOpen && <AddReadingsSheet open={addOpen} units={property.units} readings={readings} needed={todo.meters} busy={busy}
      onClose={() => setAddOpen(false)} onSave={async (inputs) => { await saveReadings(inputs); setAddOpen(false); }} />}
    {hasMonthly && <Sheet open={amountsOpen} onClose={() => setAmountsOpen(false)} title={`${periodLabel(period)} bill amounts`} closeLabel="Cancel"
      subtitle="Type the total on each bill. It goes on that month’s SOA.">
      <AmountsForm units={property.units} tenancies={tenancies} utilityBills={utilityBills} period={period} needed={todo.amounts} busy={busy}
        onSave={async (inputs) => {
          await run({ type: 'saveUtilityBills', propertyId: property.id, inputs });
          toast(inputs.length === 1 ? 'Bill amount saved' : 'Bill amounts saved');
          setAmountsOpen(false);
        }} />
    </Sheet>}
  </View>;
}

// ---- Meters

const LABEL: Record<MeterKind, string> = { electric: 'Electricity', water: 'Water' };
const UNIT_OF: Record<MeterKind, string> = { electric: 'kWh', water: 'm³' };
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 2 });
const usageOf = (from: number, to: number) => (Math.round(to * 100) - Math.round(from * 100)) / 100;
interface Meter { unit: RentalUnit; kind: MeterKind; key: string; rate: number; history: MeterReading[] }
type ReadingSoa = Map<string, { billId: string; label: string }>;

function metersOf(units: RentalUnit[], readings: MeterReading[]): Meter[] {
  return units.flatMap((unit) => (['electric', 'water'] as const)
    .filter((kind) => (kind === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter')
    .map((kind) => ({ unit, kind, key: `${unit.id}:${kind}`, rate: kind === 'electric' ? unit.electricAmountCentavos : unit.waterAmountCentavos,
      history: readings.filter((r) => r.unitId === unit.id && r.kind === kind).sort((a, b) => b.readOn.localeCompare(a.readOn)) })));
}

function MeterReadings({ units, readings, needed, period, soaOf, canManage, busy, onAdd, onSave, onOpenBill }: {
  units: RentalUnit[]; readings: MeterReading[]; needed: Set<string>; period: string; soaOf: ReadingSoa; canManage: boolean; busy: boolean;
  onAdd(): void; onSave(inputs: ReadingInput[]): Promise<void>; onOpenBill(billId: string): void;
}) {
  const meters = metersOf(units, readings);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const fe = useFieldErrors();
  const last = format(endOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
  const month = periodLabel(period).split(' ')[0];
  const neededCount = meters.filter((m) => needed.has(m.key)).length;
  const saveEdit = async (m: Meter, r: MeterReading) => {
    if (!editing) return;
    fe.clear();
    const parsed = readingInputSchema.safeParse({ unitId: m.unit.id, kind: m.kind, readOn: r.readOn, value: Number(editing.value), isReset: r.isReset });
    if (!editing.value.trim() || !parsed.success) { fe.fail(r.id, 'Type the number on the meter'); return; }
    try { await onSave([parsed.data]); setEditing(null); } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Text className={muted}>{neededCount ? `${neededCount} meter${neededCount === 1 ? '' : 's'} needed for ${month} SOAs.` : `Readings taken in ${month}.`}</Text>
    {canManage && <Btn variant="primary" icon="plus" label="Add readings" onPress={onAdd} />}
    <Banner message={fe.formError} />
    {meters.map((m) => {
      const inMonth = m.history.find((r) => r.readOn.startsWith(period));
      const prevOfMonth = inMonth && m.history.find((r) => r.readOn < inMonth.readOn);
      const previous = inMonth ? prevOfMonth : m.history.find((r) => r.readOn <= last);
      const used = inMonth && prevOfMonth && !inMonth.isReset ? usageOf(prevOfMonth.value, inMonth.value) : null;
      const open = openHistory === m.key;
      return <View key={m.key} className={`${card} gap-2`}>
        <Text className={`text-base font-semibold ${text}`}>{m.unit.name} · {LABEL[m.kind]}</Text>
        {needed.has(m.key) && <Badge tone="amber" label={`Needed for ${month} SOA`} />}
        <View className="gap-1">
          <View className="flex-row justify-between"><Text className={muted}>Previous{previous ? ` (${short(previous.readOn)})` : ''}</Text>
            <Text className={previous ? text : `italic ${muted}`}>{previous ? num(previous.value) : 'None yet'}</Text></View>
          <View className="flex-row justify-between"><Text className={muted}>Current{inMonth ? ` (${short(inMonth.readOn)})` : ''}</Text>
            <Text className={inMonth ? `text-base font-bold ${text}` : `italic ${muted}`}>{inMonth ? num(inMonth.value) : `Not read in ${month}`}</Text></View>
          {inMonth && <View className="flex-row justify-between border-t border-gray-200 pt-2 dark:border-gray-700"><Text className={muted}>Total consumption</Text>
            <Text className={used !== null ? `font-semibold ${text}` : muted}>{inMonth.isReset ? 'Meter was reset or replaced' : used !== null ? `${num(used)} ${UNIT_OF[m.kind]}` : 'Starting reading'}</Text></View>}
          {used !== null && <View className="flex-row justify-between"><Text className={muted}>Amount ({formatBillPesos(m.rate)}/{UNIT_OF[m.kind]})</Text>
            <Text className="text-base font-bold text-red-600 dark:text-red-400">{formatBillPesos(Math.round(used * m.rate))}</Text></View>}
        </View>
        <Btn small label={open ? 'Hide history' : 'Show history'} onPress={() => { setOpenHistory(open ? null : m.key); setEditing(null); setShowAll(false); }} />
        {open && (m.history.length === 0 ? <Text className={muted}>No readings yet.</Text> : m.history.slice(0, showAll ? undefined : 8).map((r, i) => {
          const older = m.history[i + 1];
          const soa = soaOf.get(r.id);
          const isEditing = editing?.id === r.id;
          return <View key={r.id} className="gap-2 border-t border-gray-200 py-2 dark:border-gray-700">
            <View className="flex-row items-center gap-3">
              <Text className={`w-28 ${text}`}>{format(parseISO(r.readOn), 'MMM d, yyyy')}</Text>
              <Text className={`flex-1 ${muted}`}>{r.isReset ? 'reset' : older ? `+${num(usageOf(older.value, r.value))} ${UNIT_OF[m.kind]}` : 'start'}</Text>
              <Text className={`font-semibold ${text}`}>{num(r.value)}</Text>
            </View>
            {canManage && (soa ? <View className="gap-1"><Text className={`text-xs ${muted}`}>On {soa.label}. Cancel that SOA to change this reading.</Text>
              <Btn small icon="file-text" label="View SOA" onPress={() => onOpenBill(soa.billId)} /></View>
              : !isEditing && <Btn small icon="edit-2" label="Edit" a11y={`Edit ${short(r.readOn)} reading`} onPress={() => { fe.clear(); setEditing({ id: r.id, value: String(r.value) }); }} />)}
            {isEditing && <View className="gap-2">
              <Field label={`New value for ${short(r.readOn)}`} required error={fe.errors[r.id]}>
                <Input keyboardType="decimal-pad" autoFocus value={editing.value} invalid={!!fe.errors[r.id]} editable={!busy}
                  onChangeText={(v) => { setEditing({ ...editing, value: v }); fe.clear(r.id); }} /></Field>
              <Row><Btn variant="primary" label="Save" busy={busy} onPress={() => void saveEdit(m, r)} /><Btn label="Cancel" onPress={() => setEditing(null)} /></Row>
            </View>}
          </View>;
        }))}
        {open && m.history.length > 8 && <Btn small variant="ghost" label={showAll ? 'Show latest 8 only' : `Show all ${m.history.length} readings`} onPress={() => setShowAll(!showAll)} />}
      </View>;
    })}
  </>;
}

function AddReadingsSheet({ open, onClose, ...props }: { open: boolean; onClose(): void } & Omit<Parameters<typeof AddReadings>[0], 'onClose'>) {
  return <Sheet open={open} onClose={onClose} title="Add readings" subtitle="Type the number on each meter you read. Leave the rest empty." closeLabel="Cancel">
    {open && <AddReadingsFields {...props} />}
  </Sheet>;
}

/** Inside the Meters sheet: a nested sheet (a second modal from inside the first). */
function AddReadings({ onClose, ...props }: Parameters<typeof AddReadingsFields>[0] & { onClose(): void }) {
  return <AddReadingsSheet open onClose={onClose} {...props} />;
}

function AddReadingsFields({ units, readings, needed, busy, onSave }: {
  units: RentalUnit[]; readings: MeterReading[]; needed: Set<string>; busy: boolean; onSave(inputs: ReadingInput[]): Promise<void>;
}) {
  const today = manilaToday();
  const meters = metersOf(units, readings).sort((a, b) => Number(needed.has(b.key)) - Number(needed.has(a.key)));
  const [values, setValues] = useState<Record<string, string>>({});
  const [resets, setResets] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(today);
  const fe = useFieldErrors();
  const prev = (m: Meter) => m.history.find((r) => r.readOn < date);
  const sameDay = (m: Meter) => m.history.find((r) => r.readOn === date);
  const lower = (m: Meter) => !!values[m.key]?.trim() && !!prev(m) && Number(values[m.key]) < prev(m)!.value && !resets[m.key];
  const lowerText = (m: Meter) => `Lower than ${num(prev(m)!.value)} on ${short(prev(m)!.readOn)}. Tick “Meter was reset or replaced” if it was.`;
  const filled = meters.filter((m) => values[m.key]?.trim());
  const save = async () => {
    fe.clear();
    if (!filled.length) { if (meters.length) fe.fail(meters[0].key, 'Type at least one reading'); return; }
    const failed: [string, string][] = [];
    const inputs: ReadingInput[] = [];
    for (const m of filled) {
      if (lower(m)) { failed.push([m.key, lowerText(m)]); continue; }
      const parsed = readingInputSchema.safeParse({ unitId: m.unit.id, kind: m.kind, readOn: date, value: Number(values[m.key]), isReset: !!resets[m.key] });
      if (parsed.success) { inputs.push(parsed.data); continue; }
      const issue = parsed.error.issues[0];
      failed.push([issue.path[0] === 'readOn' ? 'date' : m.key, issue.message]);
    }
    if (failed.length) { fe.failMany(failed); return; }
    try { await onSave(inputs); } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Banner message={fe.formError} />
    <Field label="Date you read them" required error={fe.errors.date}><DateField label="Date you read them" value={date} max={today} onChange={(v) => { setDate(v); fe.clear('date'); }} /></Field>
    {meters.map((m) => {
      const raw = values[m.key] ?? '';
      const before = prev(m);
      const typed = raw.trim() && before && !resets[m.key] && Number(raw) >= before.value ? usageOf(before.value, Number(raw)) : null;
      const replaces = sameDay(m);
      return <View key={m.key} className={`${card} gap-2`}>
        <Text className={`text-base font-semibold ${text}`}>{m.unit.name} · {LABEL[m.kind]}</Text>
        <Text className={`text-xs ${muted}`}>{before ? `Last: ${num(before.value)} on ${short(before.readOn)}` : 'First reading'}</Text>
        {needed.has(m.key) && <Badge tone="amber" label="Needed for an SOA" />}
        <Input keyboardType="decimal-pad" accessibilityLabel={`${m.unit.name} ${LABEL[m.kind].toLowerCase()} reading`} placeholder="Number on the meter now" editable={!busy}
          invalid={!!fe.errors[m.key] || lower(m)} value={raw} className="text-lg font-semibold"
          onChangeText={(v) => { setValues((x) => ({ ...x, [m.key]: v })); fe.clear(m.key); }} />
        {replaces && raw.trim() ? <Text className={`text-xs ${muted}`}>Replaces the {num(replaces.value)} reading on {short(date)}.</Text> : null}
        {fe.errors[m.key] ? <Text className="text-sm text-red-600 dark:text-red-400">{fe.errors[m.key]}</Text>
          : <Text className={`text-xs font-semibold ${lower(m) ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {lower(m) ? lowerText(m) : typed !== null ? `Used ${num(typed)} ${UNIT_OF[m.kind]} → ${formatBillPesos(Math.round(typed * m.rate))}` : ''}</Text>}
        {before && raw.trim() && (Number(raw) < before.value || resets[m.key]) ? <Check label="Meter was reset or replaced" checked={!!resets[m.key]}
          onChange={(v) => { setResets((x) => ({ ...x, [m.key]: v })); fe.clear(m.key); }} /> : null}
      </View>;
    })}
    <Btn variant="primary" busy={busy} disabled={!filled.length} label={filled.length ? `Save ${filled.length} reading${filled.length === 1 ? '' : 's'}` : 'Save readings'}
      onPress={() => void save()} />
  </>;
}

function AmountsForm({ units, tenancies, utilityBills, period, needed, busy, onSave }: {
  units: RentalUnit[]; tenancies: RentalTenancy[]; utilityBills: UtilityBill[]; period: string; needed: Set<string>; busy: boolean;
  onSave(inputs: UtilityBillInput[]): Promise<void>;
}) {
  const items = units.flatMap((unit) => (['electric', 'water'] as const)
    .filter((kind) => (kind === 'electric' ? unit.electricMode : unit.waterMode) === 'monthly')
    .map((kind) => ({ unit, kind, key: `${unit.id}:${kind}`, saved: utilityBills.find((b) => b.unitId === unit.id && b.kind === kind && b.period === period) })))
    .sort((a, b) => Number(needed.has(b.key)) - Number(needed.has(a.key)));
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(items.map((i) => [i.key, i.saved ? centavosToInput(i.saved.amountCentavos) : ''])));
  const fe = useFieldErrors();
  const sharing = (unit: RentalUnit) => tenancies.filter((t) => t.unitId === unit.id && t.moveOut === null).length;
  const changed = items.filter((i) => values[i.key]?.trim() && values[i.key] !== (i.saved ? centavosToInput(i.saved.amountCentavos) : ''));
  const save = async () => {
    fe.clear();
    if (!changed.length) { if (items.length) fe.fail(items[0].key, 'Type at least one amount'); return; }
    const inputs: UtilityBillInput[] = [];
    const failed: [string, string][] = [];
    for (const i of changed) {
      let message: string;
      try {
        const parsed = utilityBillInputSchema.safeParse({ unitId: i.unit.id, kind: i.kind, period, amountCentavos: parsePesos(values[i.key]) });
        if (parsed.success) { inputs.push(parsed.data); continue; }
        message = parsed.error.issues[0].message;
      } catch (e) { message = errorMessage(e); }
      failed.push([i.key, message]);
    }
    if (failed.length) { fe.failMany(failed); return; }
    try { await onSave(inputs); } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Banner message={fe.formError} />
    {items.map((i) => <Field key={i.key} label={`${i.unit.name} · ${LABEL[i.kind]}`} hint={needed.has(i.key) ? 'Needed for an SOA' : i.saved ? 'Saved' : undefined} error={fe.errors[i.key]}>
      <MoneyInput accessibilityLabel={`${i.unit.name} ${LABEL[i.kind]} amount`} value={values[i.key] ?? ''} placeholder="Amount on the bill" invalid={!!fe.errors[i.key]}
        onChangeText={(v) => { setValues((x) => ({ ...x, [i.key]: v })); fe.clear(i.key); }} />
      {sharing(i.unit) > 1 && <Text className={`text-xs ${muted}`}>Split between {sharing(i.unit)} tenants.</Text>}
    </Field>)}
    <Text className={`text-xs ${muted}`}>SOAs already generated keep the amount they had. Cancel one and generate it again to use a new amount.</Text>
    <Btn variant="primary" label="Save amounts" busy={busy} disabled={!changed.length} onPress={() => void save()} />
  </>;
}

// ---- One bill

const isUtility = (l: BillLine) => l.kind === 'electric' || l.kind === 'water';
const signedPesos = (value: string) => (value.trim().startsWith('-') ? -parsePesos(value.trim().slice(1)) : parsePesos(value));
const STATE_TONE = { paid: 'green', partial: 'amber', unpaid: 'gray', overdue: 'red', void: 'gray' } as const;

export function BillStateBadge({ bill, payments, today }: { bill: RentalBill; payments: RentalPayment[]; today: string }) {
  const state = billState(bill, payments, today);
  const left = `${formatBillPesos(billBalance(bill, payments))} left`;
  const late = differenceInCalendarDays(parseISO(today), parseISO(bill.dueOn));
  const label = state === 'paid' ? 'Paid' : state === 'partial' ? `Partial · ${left}` : state === 'unpaid' ? 'Unpaid' : state === 'void' ? 'Cancelled'
    : billPaid(bill.id, payments) > 0 ? `Overdue · ${left}` : `Overdue · ${late} day${late === 1 ? '' : 's'}`;
  return <Badge label={label} tone={STATE_TONE[state]} />;
}

/** One bill (issued or still pending) in a full-screen sheet: the paper SOA, money received, then its actions. */
export function BillSheet({ open, onClose, bill, info, canManage, busy, onSaveLines, onIssue, onCancelBill, payments = [], credit = 0, onRecordPayment, qrUrl, children, overlay }: {
  open: boolean; onClose(): void; bill: (StatementBill & { id?: string }) | null; info: StatementInfo | null; canManage: boolean; busy: boolean;
  qrUrl?(path: string): string; onSaveLines(lines: BillLine[]): Promise<void>; onIssue?(): Promise<void>; onCancelBill?(): void;
  payments?: RentalPayment[]; credit?: number; onRecordPayment?(): void; children?: ReactNode; overlay?: ReactNode;
}) {
  const toast = useRentalToast();
  const [editing, setEditing] = useState(false);
  if (!bill || !info) return <Sheet open={open} onClose={onClose} title="SOA"><Text className={muted}>This SOA isn’t available.</Text></Sheet>;
  const issued = !!bill.number && bill.status === 'issued';
  const saved = issued ? bill as RentalBill : null;
  const paid = saved ? billPaid(saved.id, payments) : 0;
  const changeable = issued && !saved?.settled;
  const fromCredit = !!saved && payments.some((p) => p.status === 'active' && p.paidOn < saved.issuedOn && p.allocations.some((a) => a.billId === saved.id));
  const lateFee = canManage && changeable && info.lateFeeCentavos > 0 && isOverdue(bill as RentalBill, manilaToday()) && !bill.lines.some((l) => l.kind === 'penalty');
  const copy = async () => {
    try { await Clipboard.setStringAsync(statementText(bill, info)); toast('Copied. Paste it in Messenger.'); }
    catch { toast('Couldn’t copy. Try again.', 'error'); }
  };
  const close = () => { setEditing(false); onClose(); };
  const footer = !editing && <View className="gap-2">
    {canManage && saved && onRecordPayment && billBalance(saved, payments) > 0 && <Btn variant="primary" icon="dollar-sign" label="Record payment" onPress={onRecordPayment} />}
    {canManage && !bill.number && onIssue && <Btn variant="primary" label="Generate SOA" busy={busy} onPress={() => void onIssue()} />}
    <Row wrap={false}>
      <Btn grow icon="copy" label="Copy as text" onPress={() => void copy()} />
      {bill.number && bill.id ? <Btn grow icon="share" label="Share PDF" onPress={() => void sharePdf(billHtml(bill, info, qrUrl), `Statement-${bill.number}`)
        .catch(() => toast('Couldn’t make the PDF. Try again.', 'error'))} /> : null}
    </Row>
  </View>;
  return <Sheet open={open} onClose={close} title={bill.number ? `SOA ${bill.number}` : 'SOA preview'} subtitle={`${info.renterName} · ${info.roomName}`} footer={footer} overlay={overlay}>
    {editing ? <EditLines lines={bill.lines} busy={busy} onCancel={() => setEditing(false)}
      onSave={async (lines) => { await onSaveLines(lines); setEditing(false); toast('SOA saved'); }} />
      : <>
        {saved && <View className="gap-1"><BillStateBadge bill={saved} payments={payments} today={manilaToday()} />
          {fromCredit && <Text className={`text-sm ${muted}`}>Part of this SOA was paid from the tenant’s credit.</Text>}
          {saved.settled && <Text className={`text-sm ${muted}`}>Settled with the deposit, so this SOA can’t be changed.</Text>}</View>}
        {!bill.number && credit > 0 && <Banner tone="gray" message={`${info.renterName} has ${formatBillPesos(credit)} credit. It pays this SOA as soon as you generate it.`} />}
        <Paper html={billHtml(bill, info, qrUrl)} />
        {saved && <View className="gap-2"><Title size="base">Money received</Title>{children}</View>}
        {canManage && changeable && <Row>
          {lateFee && <Btn label={`Add late fee ${formatBillPesos(info.lateFeeCentavos)}`} disabled={busy}
            onPress={() => void onSaveLines([...bill.lines, { kind: 'penalty', label: 'Late payment penalty', amount: info.lateFeeCentavos }])
              .then(() => toast('Late fee added'), (e) => toast(errorMessage(e), 'error'))} />}
          <Btn icon="edit-2" label="Edit SOA" onPress={() => paid > 0 ? Alert.alert(`Edit ${bill.number}?`, paidChangeWarning(paid),
            [{ text: 'Back', style: 'cancel' }, { text: 'Edit SOA', onPress: () => setEditing(true) }]) : setEditing(true)} />
          {onCancelBill && <Btn variant="dangerOutline" icon="trash-2" label="Cancel SOA" onPress={onCancelBill} />}
        </Row>}
      </>}
  </Sheet>;
}

function EditLines({ lines, busy, onSave, onCancel }: { lines: BillLine[]; busy: boolean; onSave(lines: BillLine[]): Promise<void>; onCancel(): void }) {
  const [amounts, setAmounts] = useState(() => lines.map((l) => (l.amount < 0 ? '-' : '') + centavosToInput(Math.abs(l.amount))));
  const [kept, setKept] = useState(() => lines.map(() => true));
  const [extra, setExtra] = useState<{ label: string; amount: string }[]>([]);
  const fe = useFieldErrors();
  const save = async () => {
    fe.clear();
    const failed: [string, string][] = [];
    const amountOf = (id: string, value: string) => { try { return signedPesos(value); } catch (e) { failed.push([id, errorMessage(e)]); return 0; } };
    const next: BillLine[] = lines.flatMap((l, i) => !kept[i] ? [] : isUtility(l) ? [l] : [{ ...l, amount: amountOf(`line-${i}`, amounts[i]) }]);
    extra.forEach((x, i) => {
      if (!x.label.trim() || !x.amount.trim()) failed.push([`extra-${i}`, 'Enter a name and amount for each extra line']);
      else next.push({ kind: 'other', label: x.label.trim(), amount: amountOf(`extra-${i}`, x.amount) });
    });
    if (failed.length) { fe.failMany(failed); return; }
    if (!next.length) { fe.setFormError('A bill needs at least one line'); return; }
    try { await onSave(next); } catch (e) { fe.setFormError(errorMessage(e)); }
  };
  return <>
    <Banner message={fe.formError} />
    <Text className={muted}>Change amounts, or add a line. Use a minus sign for a discount, e.g. -500.</Text>
    {lines.map((l, i) => kept[i] && <Field key={i} label={lineTitle(l)} error={fe.errors[`line-${i}`]}>
      {isUtility(l) ? <Text className={`text-base ${muted}`}>{formatBillPesos(l.amount)} (from the readings)</Text>
        : <MoneyInput accessibilityLabel={`${lineTitle(l)} amount`} keyboardType="numbers-and-punctuation" value={amounts[i]} invalid={!!fe.errors[`line-${i}`]}
          onChangeText={(v) => { setAmounts((a) => a.map((x, j) => (j === i ? v : x))); fe.clear(`line-${i}`); }} />}
      {(l.kind === 'penalty' || l.kind === 'other') && <Btn small variant="ghost" icon="x" label="Remove" a11y={`Remove ${l.label}`}
        onPress={() => { setKept((k) => k.map((v, j) => (j === i ? false : v))); fe.clear(`line-${i}`); }} />}
    </Field>)}
    {extra.map((x, i) => <Field key={`x${i}`} label="Other charge" error={fe.errors[`extra-${i}`]}>
      <Input accessibilityLabel="Other charge name" placeholder="e.g. Discount" value={x.label}
        onChangeText={(v) => { setExtra((all) => all.map((y, j) => (j === i ? { ...y, label: v } : y))); fe.clear(`extra-${i}`); }} />
      <MoneyInput accessibilityLabel="Other charge amount" keyboardType="numbers-and-punctuation" value={x.amount}
        onChangeText={(v) => { setExtra((all) => all.map((y, j) => (j === i ? { ...y, amount: v } : y))); fe.clear(`extra-${i}`); }} />
      <Btn small variant="ghost" icon="x" label="Remove" a11y="Remove this line" onPress={() => { setExtra((all) => all.filter((_, j) => j !== i)); fe.clear(); }} />
    </Field>)}
    <Btn icon="plus" label="Add other charge" onPress={() => setExtra((all) => [...all, { label: '', amount: '' }])} />
    <Row wrap={false}><Btn grow label="Back" onPress={onCancel} /><Btn grow variant="primary" label="Save SOA" busy={busy} onPress={() => void save()} /></Row>
  </>;
}
