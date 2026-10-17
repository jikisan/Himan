import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MoneyInput, inputClass } from './Field';
import type { ChargeRow } from '../utils/charges';

const SUGGESTIONS = ['CUSA', 'Parking', 'Wi-Fi', 'Cleaning', 'Furniture and appliances'];

/** Optional extra monthly charges (name + amount) added to every bill. */
export function ChargesEditor({ idPrefix, value, onChange }: { idPrefix: string; value: ChargeRow[]; onChange(rows: ChargeRow[]): void }) {
  const list = `${idPrefix}-charge-names`;
  const set = (i: number, patch: Partial<ChargeRow>) => onChange(value.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return <div className="space-y-2">
    <datalist id={list}>{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
    {value.length === 0 && <p className="text-sm text-muted-foreground">None. Most rooms don’t need any.</p>}
    {value.map((row, i) => <div key={i} className="flex items-center gap-2">
      <input aria-label="Charge name" list={list} placeholder="e.g. Parking" className={`${inputClass} min-w-0 flex-1`}
        value={row.label} onChange={(e) => set(i, { label: e.target.value })} />
      <div className="w-32 shrink-0"><MoneyInput aria-label="Charge amount" placeholder="0.00" value={row.amount}
        onChange={(e) => set(i, { amount: e.target.value })} /></div>
      <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0 sm:size-9" aria-label={`Remove ${row.label || 'charge'}`}
        onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
    </div>)}
    <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => onChange([...value, { label: '', amount: '' }])}>
      <Plus className="h-4 w-4" />Add charge</Button>
  </div>;
}
