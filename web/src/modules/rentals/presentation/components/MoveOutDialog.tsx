import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { manilaToday } from '@himan/shared/rentals';
import type { MeterKind, RentalTenancy, RentalUnit } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';

type FinalReadings = { kind: MeterKind; value: number }[];

export function MoveOutDialog({ tenancy, unit, name, busy, onConfirm, onClose }: {
  tenancy: RentalTenancy | null; unit?: RentalUnit; name: string; busy: boolean; onConfirm(moveOut: string, readings: FinalReadings): void; onClose(): void;
}) {
  return <Dialog open={!!tenancy} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
      {tenancy && <MoveOutForm key={tenancy.id} tenancy={tenancy} unit={unit} name={name} busy={busy} onConfirm={onConfirm} onClose={onClose} />}
    </DialogContent>
  </Dialog>;
}

function MoveOutForm({ tenancy, unit, name, busy, onConfirm, onClose }: {
  tenancy: RentalTenancy; unit?: RentalUnit; name: string; busy: boolean; onConfirm(moveOut: string, readings: FinalReadings): void; onClose(): void;
}) {
  const meters = unit ? (['electric', 'water'] as const).filter((k) => (k === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter') : [];
  const [readings, setReadings] = useState<Partial<Record<MeterKind, string>>>({});
  const today = manilaToday();
  const [date, setDate] = useState(today < tenancy.moveIn ? tenancy.moveIn : today);
  const [error, setError] = useState('');
  return <form noValidate className="grid gap-4" onSubmit={(event) => {
    event.preventDefault();
    if (!date) { setError('Choose the move-out date'); return; }
    if (date < tenancy.moveIn) { setError(`Move-out can’t be before move-in (${format(parseISO(tenancy.moveIn), 'MMM d, yyyy')})`); return; }
    const final = meters.flatMap((kind) => readings[kind]?.trim() ? [{ kind, value: Number(readings[kind]) }] : []);
    if (final.some((r) => !Number.isFinite(r.value) || r.value < 0)) { setError('Meter readings must be 0 or more'); return; }
    onConfirm(date, final);
  }}>
    <DialogHeader><DialogTitle>Move out {name}?</DialogTitle>
      <DialogDescription>Their bed becomes free. {meters.length > 0 ? 'A final reading makes a final bill for their last usage.' : ''}
        Deposit settlement comes in a later update.</DialogDescription></DialogHeader>
    <Field id="move-out-date" label="Move-out date">
      <input id="move-out-date" type="date" min={tenancy.moveIn} className={inputClass} value={date}
        onChange={(e) => { setDate(e.target.value); setError(''); }} />
    </Field>
    {meters.map((kind) => <Field key={kind} id={`final-${kind}`} label={`Final ${kind === 'electric' ? 'electricity' : 'water'} reading (optional)`}>
      <input id={`final-${kind}`} type="number" inputMode="decimal" min={0} step="any" className={inputClass} value={readings[kind] ?? ''}
        onChange={(e) => setReadings((r) => ({ ...r, [kind]: e.target.value }))} />
    </Field>)}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" variant="destructive" disabled={busy}>Confirm move out</Button>
    </div>
  </form>;
}
