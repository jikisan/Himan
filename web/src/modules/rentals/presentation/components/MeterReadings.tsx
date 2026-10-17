import { useState } from 'react';
import { Lock, Pencil, Plus, X } from 'lucide-react';
import { endOfMonth, format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBillPesos, manilaToday, periodLabel, readingInputSchema } from '@himan/shared/rentals';
import type { MeterKind, MeterReading, ReadingInput, RentalUnit } from '@himan/shared/rentals';
import { inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';
import { cn } from '@core/presentation/utils';

const LABEL: Record<MeterKind, string> = { electric: 'Electricity', water: 'Water' };
const UNIT_OF: Record<MeterKind, string> = { electric: 'kWh', water: 'm³' };
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 2 });
const short = (date: string) => format(parseISO(date), 'MMM d');
const usageOf = (from: number, to: number) => (Math.round(to * 100) - Math.round(from * 100)) / 100;

export interface Meter { unit: RentalUnit; kind: MeterKind; key: string; rate: number; history: MeterReading[] }
/** Which SOA a reading is on, so it can be shown locked with a way to open that SOA. */
export type ReadingSoa = Map<string, { billId: string; label: string }>;

/** Every sub-metered room and meter, each with its readings newest first. */
function metersOf(units: RentalUnit[], readings: MeterReading[]): Meter[] {
  return units.flatMap((unit) => (['electric', 'water'] as const)
    .filter((kind) => (kind === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter')
    .map((kind) => ({ unit, kind, key: `${unit.id}:${kind}`, rate: kind === 'electric' ? unit.electricAmountCentavos : unit.waterAmountCentavos,
      history: readings.filter((r) => r.unitId === unit.id && r.kind === kind).sort((a, b) => b.readOn.localeCompare(a.readOn)) })));
}

/**
 * Read-only meters table for the selected month: each room's reading that month and what was used since the one before.
 * Tapping a room shows its history, where a reading can be corrected unless an SOA already uses it.
 */
export function MeterReadings({ units, readings, needed, period, soaOf, canManage, busy, bare, onAdd, onSave, onOpenBill, onClose }: {
  units: RentalUnit[]; readings: MeterReading[]; needed: Set<string>; period: string; soaOf: ReadingSoa; canManage: boolean;
  busy: boolean; bare?: boolean; onAdd(): void; onSave(inputs: ReadingInput[]): Promise<void>; onOpenBill(billId: string): void;
  /** Shown as an × in the corner when the table sits beside the bills. */
  onClose?(): void;
}) {
  const meters = metersOf(units, readings);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string; error: string } | null>(null);
  if (!meters.length) return null;
  const last = format(endOfMonth(parseISO(`${period}-01`)), 'yyyy-MM-dd');
  const month = periodLabel(period).split(' ')[0];
  const neededCount = meters.filter((m) => needed.has(m.key)).length;

  const saveEdit = async (m: Meter, r: MeterReading) => {
    if (!editing) return;
    const parsed = readingInputSchema.safeParse({ unitId: m.unit.id, kind: m.kind, readOn: r.readOn, value: Number(editing.value), isReset: r.isReset });
    if (!editing.value.trim() || !parsed.success) { setEditing({ ...editing, error: 'Type the number on the meter' }); return; }
    try { await onSave([parsed.data]); setEditing(null); } catch (failure) { setEditing({ ...editing, error: errorMessage(failure) }); }
  };

  return <section aria-labelledby="meter-readings" className={cn('relative space-y-4', !bare && 'rounded-xl border bg-card p-4 shadow-sm sm:p-5')}>
    {onClose && <Button variant="ghost" size="icon" className="absolute right-2 top-2 size-11 sm:size-9" aria-label="Close meters" onClick={onClose}>
      <X className="h-4 w-4" /></Button>}
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className={cn(onClose && 'pr-10')}>
        <h3 id="meter-readings" className="text-lg font-semibold">Meters · {periodLabel(period)}</h3>
        <p className="text-sm text-muted-foreground">{neededCount ? `${neededCount} meter${neededCount === 1 ? '' : 's'} needed for ${month} SOAs.`
          : `Readings taken in ${month}.`}</p>
      </div>
      {canManage && <Button className={cn('h-11 sm:h-9', onClose && 'w-full')} onClick={onAdd}><Plus className="h-4 w-4" />Add readings</Button>}
    </div>

    <ul className="divide-y rounded-lg border">
      {meters.map((m) => {
        const inMonth = m.history.find((r) => r.readOn.startsWith(period));
        const prevOfMonth = inMonth && m.history.find((r) => r.readOn < inMonth.readOn);
        // Without a reading this month, "previous" is simply the latest one before the month ends.
        const previous = inMonth ? prevOfMonth : m.history.find((r) => r.readOn <= last);
        const used = inMonth && prevOfMonth && !inMonth.isReset ? usageOf(prevOfMonth.value, inMonth.value) : null;
        const open = openHistory === m.key;
        const label = `${m.unit.name} ${LABEL[m.kind].toLowerCase()}`;
        return <li key={m.key} className="p-3">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h4 className="font-semibold">{m.unit.name} · {LABEL[m.kind]}</h4>
            {needed.has(m.key) && <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
              Needed for {month} SOA</span>}
          </div>
          {/* Laid out like the meter part of the SOA: previous, current, then what was used and what it costs. */}
          <dl className="mt-3 grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 text-sm tabular-nums">
            <dt className="text-muted-foreground">Previous{previous && ` (${short(previous.readOn)})`}</dt>
            <dd className="text-right">{previous ? num(previous.value) : <span className="italic text-muted-foreground">None yet</span>}</dd>
            <dt className="text-muted-foreground">Current{inMonth && ` (${short(inMonth.readOn)})`}</dt>
            <dd className="text-right">{inMonth ? <span className="text-base font-bold">{num(inMonth.value)}</span>
              : <span className="italic text-muted-foreground">Not read in {month}</span>}</dd>
            {inMonth && <>
              <dt className="mt-1 border-t pt-2 text-muted-foreground">Total Consumption</dt>
              <dd className="mt-1 border-t pt-2 text-right">{inMonth.isReset ? <span className="text-muted-foreground">Meter was reset or replaced</span>
                : used !== null ? <span className="font-semibold">{num(used)} {UNIT_OF[m.kind]}</span>
                : <span className="text-muted-foreground">Starting reading</span>}</dd>
              {used !== null && <>
                <dt className="text-muted-foreground">Amount ({formatBillPesos(m.rate)}/{UNIT_OF[m.kind]})</dt>
                <dd className="text-right text-base font-bold text-destructive">{formatBillPesos(Math.round(used * m.rate))}</dd>
              </>}
            </>}
          </dl>

          <Button type="button" variant="outline" size="sm" className="mt-3 h-10 sm:h-8" aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} ${label} history`} onClick={() => { setOpenHistory(open ? null : m.key); setEditing(null); setShowAll(false); }}>
            {open ? 'Hide history' : 'Show history'}</Button>
                    {open && <ol aria-label={`${label} history`} className="mt-3 divide-y rounded-md border bg-muted/20 text-sm tabular-nums">
            {m.history.length === 0 ? <li className="p-2 text-muted-foreground">No readings yet.</li>
              : m.history.slice(0, showAll ? undefined : 8).map((r, i) => {
                const older = m.history[i + 1];
                const soa = soaOf.get(r.id);
                const isEditing = editing?.id === r.id;
                return <li key={r.id} className="space-y-2 p-2">
                  <div className="flex items-center gap-3">
                    <span className="w-24 shrink-0">{format(parseISO(r.readOn), 'MMM d, yyyy')}</span>
                    <span className="flex-1 text-muted-foreground">{r.isReset ? 'reset' : older ? `+${num(usageOf(older.value, r.value))} ${UNIT_OF[m.kind]}` : 'start'}</span>
                    <span className="font-semibold">{num(r.value)}</span>
                    {canManage && (soa
                      ? <Lock aria-label="On an SOA, can’t be edited" className="h-4 w-4 shrink-0 text-muted-foreground" />
                      : <Button type="button" variant="ghost" size="icon" className="size-9 sm:size-8" aria-label={`Edit ${short(r.readOn)} reading`}
                          onClick={() => setEditing(isEditing ? null : { id: r.id, value: String(r.value), error: '' })}><Pencil className="h-4 w-4" /></Button>)}
                  </div>
                  {soa && canManage && <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    On {soa.label}. Cancel that SOA to change this reading.
                    <Button type="button" variant="link" className="h-auto p-0 text-xs" onClick={() => onOpenBill(soa.billId)}>View SOA</Button></p>}
                  {isEditing && <form noValidate className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); void saveEdit(m, r); }}>
                    <input type="number" inputMode="decimal" min={0} step="any" autoFocus aria-label={`New value for ${short(r.readOn)}`}
                      className={cn(inputClass, 'w-32 tabular-nums')} value={editing.value} disabled={busy}
                      onChange={(e) => setEditing({ ...editing, value: e.target.value, error: '' })} />
                    <Button type="submit" size="sm" className="h-10 sm:h-8" disabled={busy}>Save</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-10 sm:h-8" onClick={() => setEditing(null)}>Cancel</Button>
                    {editing.error && <p role="alert" className="basis-full text-xs text-destructive">{editing.error}</p>}
                  </form>}
                </li>;
              })}
          </ol>}
          {open && m.history.length > 8 && <Button type="button" variant="link" className="mt-1 h-auto px-0 text-sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show latest 8 only' : `Show all ${m.history.length} readings`}</Button>}
        </li>;
      })}
    </ul>
  </section>;
}

/** One box per sub-metered room, one date, one save. Live usage per box; a lower number needs "reset" ticked. */
export function AddReadingsDialog({ open, onOpenChange, units, readings, needed, busy, onSave }: {
  open: boolean; onOpenChange(open: boolean): void; units: RentalUnit[]; readings: MeterReading[]; needed: Set<string>;
  busy: boolean; onSave(inputs: ReadingInput[]): Promise<void>;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      <DialogHeader><DialogTitle>Add readings</DialogTitle>
        <DialogDescription>Type the number on each meter you read. Leave the rest empty.</DialogDescription></DialogHeader>
      {open && <AddReadingsForm units={units} readings={readings} needed={needed} busy={busy} onCancel={() => onOpenChange(false)}
        onSave={async (inputs) => { await onSave(inputs); onOpenChange(false); }} />}
    </DialogContent>
  </Dialog>;
}

function AddReadingsForm({ units, readings, needed, busy, onSave, onCancel }: {
  units: RentalUnit[]; readings: MeterReading[]; needed: Set<string>; busy: boolean; onSave(inputs: ReadingInput[]): Promise<void>; onCancel(): void;
}) {
  const today = manilaToday();
  // Rooms an SOA is waiting on come first.
  const meters = metersOf(units, readings).sort((a, b) => Number(needed.has(b.key)) - Number(needed.has(a.key)));
  const [values, setValues] = useState<Record<string, string>>({});
  const [resets, setResets] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');
  const prev = (m: Meter) => m.history.find((r) => r.readOn < date);
  const sameDay = (m: Meter) => m.history.find((r) => r.readOn === date);
  const lower = (m: Meter) => !!values[m.key]?.trim() && !!prev(m) && Number(values[m.key]) < prev(m)!.value && !resets[m.key];
  const filled = meters.filter((m) => values[m.key]?.trim());

  return <form noValidate className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    if (!filled.length) { setError('Type at least one reading'); return; }
    if (filled.some(lower)) { setError('Fix the readings marked in red'); return; }
    const inputs: ReadingInput[] = [];
    for (const m of filled) {
      const parsed = readingInputSchema.safeParse({ unitId: m.unit.id, kind: m.kind, readOn: date, value: Number(values[m.key]), isReset: !!resets[m.key] });
      if (!parsed.success) { setError(`${m.unit.name}: ${parsed.error.issues[0].message}`); return; }
      inputs.push(parsed.data);
    }
    try { setError(''); await onSave(inputs); } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <label className="flex items-center justify-between gap-3 text-sm font-medium">Date you read them
      <input type="date" className={cn(inputClass, 'w-44')} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
    </label>
    <fieldset disabled={busy} className="divide-y rounded-lg border">
      {meters.map((m) => {
        const raw = values[m.key] ?? '';
        const before = prev(m);
        const typed = raw.trim() && before && !resets[m.key] && Number(raw) >= before.value ? usageOf(before.value, Number(raw)) : null;
        const replaces = sameDay(m);
        return <div key={m.key} className="space-y-1.5 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-semibold">{m.unit.name} · {LABEL[m.kind]}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{before ? `Last: ${num(before.value)} on ${short(before.readOn)}` : 'First reading'}</span>
          </div>
          {needed.has(m.key) && <span className="inline-block rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">Needed for an SOA</span>}
          <input type="number" inputMode="decimal" min={0} step="any" aria-label={`${m.unit.name} ${LABEL[m.kind].toLowerCase()} reading`}
            placeholder="Number on the meter now"
            className={cn(inputClass, 'h-12 text-lg font-semibold tabular-nums placeholder:text-sm placeholder:font-normal', lower(m) && 'border-destructive focus-visible:ring-destructive')}
            value={raw} onChange={(e) => { setValues((v) => ({ ...v, [m.key]: e.target.value })); setError(''); }} />
          {replaces && raw.trim() && <p className="text-xs text-muted-foreground">Replaces the {num(replaces.value)} reading on {short(date)}.</p>}
          <p aria-live="polite" className={cn('text-xs tabular-nums', lower(m) ? 'font-medium text-destructive' : 'font-medium text-emerald-700 dark:text-emerald-400')}>
            {lower(m) ? `Lower than ${num(before!.value)} on ${short(before!.readOn)}. Tick “Meter was reset or replaced” if it was.`
              : typed !== null ? `Used ${num(typed)} ${UNIT_OF[m.kind]} → ${formatBillPesos(Math.round(typed * m.rate))}` : ''}</p>
          {before && raw.trim() && (Number(raw) < before.value || resets[m.key]) && <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8">
            <input type="checkbox" className="size-4 accent-primary" checked={!!resets[m.key]}
              onChange={(e) => setResets((r) => ({ ...r, [m.key]: e.target.checked }))} />Meter was reset or replaced</label>}
        </div>;
      })}
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
      <Button type="submit" className="h-11 sm:h-9" disabled={busy || !filled.length}>
        {filled.length ? `Save ${filled.length} reading${filled.length === 1 ? '' : 's'}` : 'Save readings'}</Button>
    </div>
  </form>;
}

