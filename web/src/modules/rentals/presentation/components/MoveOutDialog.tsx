import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { manilaToday } from '@himan/shared/rentals';
import type { RentalTenancy } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';

export function MoveOutDialog({ tenancy, name, busy, onConfirm, onClose }: {
  tenancy: RentalTenancy | null; name: string; busy: boolean; onConfirm(moveOut: string): void; onClose(): void;
}) {
  return <Dialog open={!!tenancy} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
      {tenancy && <MoveOutForm key={tenancy.id} tenancy={tenancy} name={name} busy={busy} onConfirm={onConfirm} onClose={onClose} />}
    </DialogContent>
  </Dialog>;
}

function MoveOutForm({ tenancy, name, busy, onConfirm, onClose }: {
  tenancy: RentalTenancy; name: string; busy: boolean; onConfirm(moveOut: string): void; onClose(): void;
}) {
  const today = manilaToday();
  const [date, setDate] = useState(today < tenancy.moveIn ? tenancy.moveIn : today);
  const [error, setError] = useState('');
  return <form noValidate className="grid gap-4" onSubmit={(event) => {
    event.preventDefault();
    if (!date) { setError('Choose the move-out date'); return; }
    if (date < tenancy.moveIn) { setError(`Move-out can’t be before move-in (${format(parseISO(tenancy.moveIn), 'MMM d, yyyy')})`); return; }
    onConfirm(date);
  }}>
    <DialogHeader><DialogTitle>Move out {name}?</DialogTitle>
      <DialogDescription>Their bed becomes free. Deposit settlement comes in a later update.</DialogDescription></DialogHeader>
    <Field id="move-out-date" label="Move-out date">
      <input id="move-out-date" type="date" min={tenancy.moveIn} className={inputClass} value={date}
        onChange={(e) => { setDate(e.target.value); setError(''); }} />
    </Field>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
      <Button type="submit" variant="destructive" disabled={busy}>Confirm move out</Button>
    </div>
  </form>;
}
