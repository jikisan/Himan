import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { formatBillPesos, manilaToday, readingInputSchema } from '@himan/shared/rentals';
import type { MeterKind, MeterReading, ReadingInput, RentalUnit } from '@himan/shared/rentals';
import { inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';
import { cn } from '@core/presentation/utils';

const LABEL: Record<MeterKind, string> = { electric: 'Electricity', water: 'Water' };
const UNIT_OF: Record<MeterKind, string> = { electric: 'kWh', water: 'm³' };
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 2 });

/** One box per metered room and meter; all saved together with one reading date. */
export function MeterReadings({ units, readings, busy, onSave }: {
  units: RentalUnit[]; readings: MeterReading[]; busy: boolean; onSave(inputs: ReadingInput[]): Promise<void>;
}) {
  const meters = units.flatMap((unit) => (['electric', 'water'] as const)
    .filter((kind) => (kind === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter')
    .map((kind) => ({ unit, kind, key: `${unit.id}:${kind}`,
      rate: kind === 'electric' ? unit.electricAmountCentavos : unit.waterAmountCentavos,
      last: readings.filter((r) => r.unitId === unit.id && r.kind === kind).sort((a, b) => b.readOn.localeCompare(a.readOn))[0] })));
  const [values, setValues] = useState<Record<string, string>>({});
  const [resets, setResets] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState(manilaToday());
  const [error, setError] = useState('');
  if (!meters.length) return null;
  const lower = (m: (typeof meters)[number]) => {
    const value = Number(values[m.key]);
    return values[m.key]?.trim() !== '' && !!m.last && value < m.last.value && !resets[m.key];
  };

  return <section aria-labelledby="meter-readings" className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
    <form noValidate onSubmit={async (event) => {
      event.preventDefault();
      const filled = meters.filter((m) => values[m.key]?.trim());
      if (!filled.length) { setError('Type at least one reading'); return; }
      if (filled.some(lower)) { setError('Fix the readings marked in red'); return; }
      const inputs: ReadingInput[] = [];
      for (const m of filled) {
        const parsed = readingInputSchema.safeParse({ unitId: m.unit.id, kind: m.kind, readOn: date, value: Number(values[m.key]), isReset: !!resets[m.key] });
        if (!parsed.success) { setError(`${m.unit.name}: ${parsed.error.issues[0].message}`); return; }
        inputs.push(parsed.data);
      }
      try {
        setError('');
        await onSave(inputs);
        setValues({}); setResets({});
      } catch (failure) { setError(errorMessage(failure)); }
    }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="meter-readings" className="font-semibold">Meter readings</h3>
          <p className="text-sm text-muted-foreground">Read every meter, type the numbers, save once.</p>
        </div>
        <label className="grid gap-1 text-sm font-medium">Reading date
          <input type="date" className={cn(inputClass, 'w-44')} value={date} max={manilaToday()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <fieldset disabled={busy}>
        <ul className="mt-4 divide-y">
          {meters.map((m) => {
            const raw = values[m.key] ?? '';
            const value = Number(raw);
            const reset = !!resets[m.key];
            const usage = m.last && !reset && raw.trim() && value >= m.last.value
              ? (Math.round(value * 100) - Math.round(m.last.value * 100)) / 100 : null;
            const name = `${m.unit.name} ${LABEL[m.kind].toLowerCase()} reading`;
            return <li key={m.key} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-start">
              <div className="min-w-0">
                <p className="font-medium">{m.unit.name} · {LABEL[m.kind]}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {m.last ? `Last: ${num(m.last.value)} · ${format(parseISO(m.last.readOn), 'MMM d')}` : 'No reading yet. The first one is the starting point.'}</p>
              </div>
              <div className="space-y-1">
                <input type="number" inputMode="decimal" min={0} step="any" aria-label={name} placeholder="New reading"
                  className={cn(inputClass, 'tabular-nums', lower(m) && 'border-destructive focus-visible:ring-destructive')}
                  value={raw} onChange={(e) => { setValues((v) => ({ ...v, [m.key]: e.target.value })); setError(''); }} />
                <p aria-live="polite" className={cn('text-xs tabular-nums', lower(m) ? 'text-destructive' : 'text-muted-foreground')}>
                  {lower(m) ? `Lower than the last reading (${num(m.last!.value)}). Tick “Meter was reset or replaced” if it was.`
                    : usage !== null ? `${num(usage)} ${UNIT_OF[m.kind]} = ${formatBillPesos(Math.round(usage * 100 * m.rate / 100))}`
                    : raw.trim() ? 'Starting reading' : ''}</p>
                {m.last && raw.trim() && (value < m.last.value || reset) && <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8">
                  <input type="checkbox" className="size-4 accent-primary" checked={reset}
                    onChange={(e) => setResets((r) => ({ ...r, [m.key]: e.target.checked }))} />Meter was reset or replaced</label>}
              </div>
            </li>;
          })}
        </ul>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
        <div className="mt-3 flex justify-end">
          <Button type="submit" variant="outline" className="h-11 sm:h-9">Save readings</Button>
        </div>
      </fieldset>
    </form>
  </section>;
}
