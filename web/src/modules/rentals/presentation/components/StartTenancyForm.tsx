import { useState } from 'react';
import { addYears, format, parseISO } from 'date-fns';
import { formatPesos, manilaToday, parsePesos, startTenancySchema, unitOccupancy } from '@himan/shared/rentals';
import type { RentalTenancy, RentalUnit, Renter, StartTenancyInput } from '@himan/shared/rentals';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
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

  if (!open.length) return <Blocked>Every unit is full. End a tenancy or add a unit first.</Blocked>;
  if (!renters.length) return <Blocked>Add the renter first in the Renters tab.</Blocked>;
  const peso = (value: string) => { try { return parsePesos(value); } catch { return null; } };
  const rent = form.rent.trim() ? peso(form.rent) : null;
  const deposit = form.deposit.trim() ? peso(form.deposit) : rent;
  const moveInTotal = rent !== null && deposit !== null ? rent * Number(form.advanceMonths || 0) + deposit : null;

  return <form className="space-y-6" onSubmit={async (event) => {
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
    <fieldset disabled={busy} className="space-y-6">
      <FormSection title="Who and where">
        <Field id="tenancy-unit" label="Unit"><select id="tenancy-unit" className={inputClass} value={form.unitId} onChange={set('unitId')}>
          {open.map(({ unit, free }) => <option key={unit.id} value={unit.id}>{unit.name} ({free} free)</option>)}</select></Field>
        <Field id="tenancy-renter" label="Renter"><select id="tenancy-renter" className={inputClass} value={form.renterId} onChange={set('renterId')}>
          {renters.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}</select></Field>
        <Field id="tenancy-move-in" label="Move-in date"><input id="tenancy-move-in" type="date" className={inputClass} value={form.moveIn} onChange={set('moveIn')} /></Field>
      </FormSection>
      <FormSection title="Contract">
        <Field id="tenancy-start" label="Starts"><input id="tenancy-start" type="date" className={inputClass} value={form.startDate} onChange={set('startDate')} /></Field>
        <Field id="tenancy-end" label="Ends"><input id="tenancy-end" type="date" className={inputClass} value={form.endDate} onChange={set('endDate')} /></Field>
        <Field id="tenancy-due" label="Due day" hint="31 = month end"><input id="tenancy-due" type="number" min={1} max={31} className={inputClass} value={form.dueDay} onChange={set('dueDay')} /></Field>
      </FormSection>
      <FormSection title="Money">
        <Field id="tenancy-rent" label="Monthly rent"><MoneyInput id="tenancy-rent" value={form.rent} onChange={set('rent')} placeholder="10,000" /></Field>
        <Field id="tenancy-advance" label="Advance months"><input id="tenancy-advance" type="number" min={0} max={12} className={inputClass} value={form.advanceMonths} onChange={set('advanceMonths')} /></Field>
        <Field id="tenancy-deposit" label="Deposit" hint="blank = 1 month"><MoneyInput id="tenancy-deposit" value={form.deposit} onChange={set('deposit')} placeholder={form.rent || '0.00'} /></Field>
        <div aria-live="polite" className="flex flex-col justify-end rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-xs text-muted-foreground">Due on move-in</span>
          <span className="font-semibold tabular-nums">{moveInTotal === null ? '—' : formatPesos(moveInTotal)}</span>
        </div>
      </FormSection>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <FormActions submit="Start tenancy" onCancel={onCancel} />
    </fieldset>
  </form>;
}

function Blocked({ children }: { children: string }) {
  return <p className="mb-6 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</p>;
}
