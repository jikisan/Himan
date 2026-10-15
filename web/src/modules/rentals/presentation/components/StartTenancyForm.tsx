import { useState } from 'react';
import { addYears, format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { manilaToday, parsePesos, startTenancySchema, unitOccupancy } from '@himan/shared/rentals';
import type { RentalTenancy, RentalUnit, Renter, StartTenancyInput } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

export function StartTenancyForm({ units, renters, tenancies, busy, onSave, onCancel }: {
  units: RentalUnit[]; renters: Renter[]; tenancies: RentalTenancy[]; busy: boolean;
  onSave: (value: StartTenancyInput) => Promise<void>; onCancel: () => void;
}) {
  const open = units.map((u) => ({ unit: u, free: unitOccupancy(u, tenancies).free })).filter((u) => u.free > 0);
  const today = manilaToday();
  const [form, setForm] = useState({ unitId: open[0]?.unit.id ?? '', renterId: renters[0]?.id ?? '', moveIn: today,
    startDate: today, endDate: format(addYears(parseISO(today), 1), 'yyyy-MM-dd'), rent: '', dueDay: String(Number(today.slice(8))),
    advanceMonths: '1', deposit: '' });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  if (!open.length) return <p className="text-muted-foreground">Every unit is full. End a tenancy or add a unit first.</p>;
  if (!renters.length) return <p className="text-muted-foreground">Add the renter first in the Renters tab.</p>;

  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const monthlyRentCentavos = parsePesos(form.rent);
      const result = startTenancySchema.safeParse({ unitId: form.unitId, renterId: form.renterId, moveIn: form.moveIn,
        startDate: form.startDate, endDate: form.endDate, monthlyRentCentavos, dueDay: Number(form.dueDay),
        advanceMonths: Number(form.advanceMonths),
        depositCentavos: form.deposit.trim() ? parsePesos(form.deposit) : monthlyRentCentavos });
      if (!result.success) { setError(result.error.issues[0].message); return; }
      setError('');
      await onSave(result.data);
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      <Field id="tenancy-unit" label="Unit"><select id="tenancy-unit" className={inputClass} value={form.unitId} onChange={set('unitId')}>
        {open.map(({ unit, free }) => <option key={unit.id} value={unit.id}>{unit.name} ({free} free)</option>)}</select></Field>
      <Field id="tenancy-renter" label="Renter"><select id="tenancy-renter" className={inputClass} value={form.renterId} onChange={set('renterId')}>
        {renters.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}</select></Field>
      <Field id="tenancy-move-in" label="Move-in date"><input id="tenancy-move-in" type="date" className={inputClass} value={form.moveIn} onChange={set('moveIn')} /></Field>
      <Field id="tenancy-rent" label="Monthly rent"><input id="tenancy-rent" inputMode="decimal" className={inputClass} value={form.rent} onChange={set('rent')} placeholder="10,000" /></Field>
      <Field id="tenancy-start" label="Contract start"><input id="tenancy-start" type="date" className={inputClass} value={form.startDate} onChange={set('startDate')} /></Field>
      <Field id="tenancy-end" label="Contract end"><input id="tenancy-end" type="date" className={inputClass} value={form.endDate} onChange={set('endDate')} /></Field>
      <Field id="tenancy-due" label="Due day" hint="31 = last day of month"><input id="tenancy-due" type="number" min={1} max={31} className={inputClass} value={form.dueDay} onChange={set('dueDay')} /></Field>
      <Field id="tenancy-advance" label="Advance months"><input id="tenancy-advance" type="number" min={0} max={12} className={inputClass} value={form.advanceMonths} onChange={set('advanceMonths')} /></Field>
      <Field id="tenancy-deposit" label="Deposit" hint="blank = one month’s rent"><input id="tenancy-deposit" inputMode="decimal" className={inputClass} value={form.deposit} onChange={set('deposit')} /></Field>
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5 sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Start tenancy</Button>
      </div>
    </fieldset>
  </form>;
}
