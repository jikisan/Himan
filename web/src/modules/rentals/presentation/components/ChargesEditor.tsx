import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPesos, parsePesos } from '@himan/shared/rentals';
import { MoneyInput, inputClass } from './Field';
import type { ChargeRow } from '../utils/charges';
import { cn } from '@core/presentation/utils';

const SUGGESTIONS = ['CUSA', 'Parking', 'Wi-Fi', 'Cleaning', 'Appliances'];
const peso = (value: string) => { try { return value.trim() ? parsePesos(value) : 0; } catch { return 0; } };

/** Optional extra monthly charges (name + amount) added to every SOA. Common ones are one tap away. */
export function ChargesEditor({ idPrefix, value, onChange }: { idPrefix: string; value: ChargeRow[]; onChange(rows: ChargeRow[]): void }) {
  const set = (i: number, patch: Partial<ChargeRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const used = new Set(value.map((r) => r.label.trim().toLowerCase()));
  const unused = SUGGESTIONS.filter((s) => !used.has(s.toLowerCase()));
  const total = value.reduce((sum, r) => sum + peso(r.amount), 0);
  // A new row puts the cursor where the user types next: the amount for a suggestion, the name for "Other".
  const add = (label: string) => {
    onChange([...value, { label, amount: '' }]);
    requestAnimationFrame(() => document.getElementById(`${idPrefix}-charge-${value.length}-${label ? 'amount' : 'name'}`)?.focus());
  };

  return <div className="space-y-3">
    {value.length > 0 && <ul className="divide-y rounded-lg border">
      {value.map((row, i) => <li key={i} className="flex items-center gap-2 p-2">
        <input id={`${idPrefix}-charge-${i}-name`} aria-label="Charge name" placeholder="Name, e.g. Parking" className={`${inputClass} min-w-0 flex-1`}
          value={row.label} onChange={(e) => set(i, { label: e.target.value })} />
        <div className="w-32 shrink-0"><MoneyInput id={`${idPrefix}-charge-${i}-amount`} aria-label="Charge amount" placeholder="0.00"
          value={row.amount} onChange={(e) => set(i, { amount: e.target.value })} /></div>
        <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 text-muted-foreground hover:text-destructive sm:size-9"
          aria-label={`Remove ${row.label || 'charge'}`} onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
      </li>)}
      {total > 0 && <li className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total each month</span>
        <span className="font-semibold tabular-nums">{formatPesos(total)}</span>
      </li>}
    </ul>}
    <div className={cn(value.length === 0 && 'rounded-lg border border-dashed px-3 py-4 text-center')}>
      {value.length === 0 && <p className="mb-3 text-sm italic text-muted-foreground">No extra charges. Tap one to add it.</p>}
      <div role="group" aria-label="Add a charge" className={cn('flex flex-wrap gap-2', value.length === 0 && 'justify-center')}>
        {unused.map((label) => <button key={label} type="button" onClick={() => add(label)}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8">
          <Plus aria-hidden className="h-3.5 w-3.5" />{label}</button>)}
        <button type="button" onClick={() => add('')}
          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-dashed px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8">
          <Plus aria-hidden className="h-3.5 w-3.5" />Other</button>
      </div>
    </div>
  </div>;
}
