import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { centavosToInput, formatPesos, manilaToday, moveInDefaults, parsePesos, renterSchema, roomRent, tenancyTermsSchema } from '@himan/shared/rentals';
import type { RentalUnit, Renter, RenterInput } from '@himan/shared/rentals';
import type { RentalAction } from '../hooks/useRentals';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';
import { cn } from '@core/presentation/utils';

type AddTenant = Extract<RentalAction, { type: 'addTenant' }>;
const blankPerson: RenterInput = { fullName: '', phone: '', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
const peso = (value: string) => { try { return value.trim() ? parsePesos(value) : null; } catch { return null; } };

export function AddTenantForm({ unit, renters, busy, onSave, onCancel }: {
  unit: RentalUnit; renters: Renter[]; busy: boolean; onSave(action: AddTenant): Promise<void>; onCancel(): void;
}) {
  const [person, setPerson] = useState(blankPerson);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [moveIn, setMoveIn] = useState(manilaToday());
  // Rent follows the room's price for the headcount until the user types their own amount.
  const [ownRent, setOwnRent] = useState<string | null>(null);
  const people = Math.max(person.occupants || 1, 1);
  const rent = ownRent ?? centavosToInput(roomRent(unit, people));
  const perPerson = unit.extraPersonRentCentavos > 0 && unit.defaultRentCentavos > 0;
  // Contract fields follow move-in and rent until the user types their own value.
  const [own, setOwn] = useState<{ endDate?: string; dueDay?: string; advance?: string; deposit?: string }>({});
  const [error, setError] = useState('');
  const details = useRef<HTMLDetailsElement>(null);
  // A problem in a field inside the collapsed section opens it so the field is visible.
  const fail = (message: string, path: PropertyKey | undefined) => {
    if (details.current && !['fullName', 'phone', 'moveIn', 'monthlyRentCentavos', 'advanceMonths', 'depositCentavos'].includes(String(path))) details.current.open = true;
    setError(message);
  };
  const auto = moveInDefaults(moveIn || manilaToday(), peso(rent) ?? 0);
  const endDate = own.endDate ?? auto.endDate;
  const dueDay = own.dueDay ?? String(auto.dueDay);
  const advance = own.advance ?? '1';
  const deposit = own.deposit ?? centavosToInput(auto.depositCentavos);
  const rentValue = peso(rent);
  const depositValue = deposit.trim() ? peso(deposit) : 0;
  const total = rentValue !== null && depositValue !== null ? rentValue * Number(advance || 0) + depositValue : null;
  const setPeople = (n: number) => setPerson((p) => ({ ...p, occupants: n }));
  const setP = (key: keyof RenterInput) => (e: { target: { value: string } }) =>
    setPerson((p) => ({ ...p, [key]: key === 'occupants' ? Number(e.target.value) : e.target.value }));
  const text = (key: Exclude<keyof RenterInput, 'occupants'>, label: string, extra?: { type?: string; autoComplete?: string; wide?: boolean }) =>
    <Field id={`add-${key}`} label={label} className={extra?.wide ? 'sm:col-span-2' : ''}>
      <input id={`add-${key}`} type={extra?.type ?? 'text'} autoComplete={extra?.autoComplete ?? 'off'} className={inputClass}
        value={person[key]} onChange={setP(key)} />
    </Field>;

  return <form noValidate className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const renter = existingId ? null : renterSchema.safeParse(person);
      if (renter && !renter.success) { fail(renter.error.issues[0].message, renter.error.issues[0].path[0]); return; }
      if (renter && !renter.data.phone) { fail('Enter the tenant’s mobile number', 'phone'); return; }
      const monthlyRentCentavos = parsePesos(rent);
      const terms = tenancyTermsSchema.safeParse({ moveIn, startDate: moveIn, endDate, monthlyRentCentavos, dueDay: Number(dueDay), advanceMonths: Number(advance),
        depositCentavos: deposit.trim() ? parsePesos(deposit) : 0 });
      if (!terms.success) { fail(terms.error.issues[0].message, terms.error.issues[0].path[0]); return; }
      setError('');
      const { moveIn: date, ...rest } = terms.data;
      await onSave({ type: 'addTenant', propertyId: unit.propertyId, unitId: unit.id, renterId: existingId,
        renter: renter?.data ?? null, moveIn: date, terms: rest });
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="space-y-6">
      <FormSection title="Who is moving in?">
        {renters.length > 0 && <div role="group" aria-label="New or existing tenant" className="flex rounded-lg bg-muted p-1 sm:col-span-2">
          {([['New person', null], ['Already a tenant', renters[0].id]] as const).map(([label, id]) =>
            <button key={label} type="button" aria-pressed={(existingId === null) === (id === null)}
              onClick={() => setExistingId(id === null ? null : existingId ?? id)}
              className="min-h-11 flex-1 rounded-md text-sm font-medium text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9">
              {label}</button>)}
        </div>}
        {existingId === null ? <>
          {text('fullName', 'Full name', { autoComplete: 'name', wide: true })}
          {text('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel', wide: true })}
        </> : <Field id="add-existing" label="Tenant" className="sm:col-span-2">
          <select id="add-existing" className={inputClass} value={existingId} onChange={(e) => setExistingId(e.target.value)}>
            {renters.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
          </select>
        </Field>}
      </FormSection>
      <FormSection title="Move-in">
        <Field id="add-move-in" label="Move-in date" className="sm:col-span-2">
          <input id="add-move-in" type="date" className={inputClass} value={moveIn} onChange={(e) => setMoveIn(e.target.value)} />
        </Field>
        {unit.kind !== 'bedspace' && <Field id="add-occupants" label="People living in the room" hint="including them">
          <div className="flex h-11 overflow-hidden rounded-lg border border-input sm:h-10">
            <button type="button" aria-label="One fewer person" disabled={people <= 1} onClick={() => setPeople(people - 1)}
              className="flex w-11 items-center justify-center bg-muted/40 hover:bg-muted disabled:opacity-40"><Minus className="h-4 w-4" /></button>
            <input id="add-occupants" type="number" min={1} max={50} value={person.occupants} onChange={setP('occupants')}
              className="min-w-0 flex-1 bg-background text-center font-semibold tabular-nums focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
            <button type="button" aria-label="One more person" disabled={people >= 50} onClick={() => setPeople(people + 1)}
              className="flex w-11 items-center justify-center bg-muted/40 hover:bg-muted disabled:opacity-40"><Plus className="h-4 w-4" /></button>
          </div>
        </Field>}
        <Field id="add-rent" label="Monthly rent" hint={unit.kind === 'bedspace' ? 'per bed' : undefined}>
          <MoneyInput id="add-rent" value={rent} placeholder="0.00" onChange={(e) => setOwnRent(e.target.value)} />
          {perPerson && ownRent === null && <span className="mt-1 block text-xs text-muted-foreground">
            {people > 1 ? `${formatPesos(unit.defaultRentCentavos)} + ${formatPesos(unit.extraPersonRentCentavos)} × ${people - 1} extra`
              : `${formatPesos(unit.extraPersonRentCentavos)} more for each extra person`}</span>}
        </Field>
        <Field id="add-advance" label="Advance months">
          <input id="add-advance" type="number" min={0} max={12} className={inputClass} value={advance}
            onChange={(e) => setOwn((o) => ({ ...o, advance: e.target.value }))} />
        </Field>
        <Field id="add-deposit" label="Deposit">
          <MoneyInput id="add-deposit" value={deposit} onChange={(e) => setOwn((o) => ({ ...o, deposit: e.target.value }))} />
        </Field>
        <div aria-live="polite" className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3 sm:col-span-2">
          <span className="text-sm"><span className="block font-medium">Collect on move-in</span>
            <span className="block text-xs text-muted-foreground">{advance || 0} month{advance === '1' ? '' : 's'} advance + deposit</span></span>
          <span className="text-2xl font-bold tabular-nums text-primary">{total === null ? '—' : formatPesos(total)}</span>
        </div>
      </FormSection>
      <details ref={details} className="group rounded-lg border p-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between text-sm font-semibold">
          <span>Contract and contact <span className="font-normal text-muted-foreground">(optional)</span></span><span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-4 space-y-6">
          <FormSection title="Contract" description="Filled in for you. Change only if your agreement is different.">
            <Field id="add-due" label="Due day" hint="31 = month end">
              <input id="add-due" type="number" min={1} max={31} className={inputClass} value={dueDay}
                onChange={(e) => setOwn((o) => ({ ...o, dueDay: e.target.value }))} />
            </Field>
            <Field id="add-end" label="Contract ends">
              <input id="add-end" type="date" className={inputClass} value={endDate} onChange={(e) => setOwn((o) => ({ ...o, endDate: e.target.value }))} />
            </Field>
          </FormSection>
          {existingId === null && <FormSection title="Contact and household">
            {text('facebook', 'Facebook / Messenger')}
            {text('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {text('address', 'Home address', { autoComplete: 'street-address', wide: true })}
            {text('emergencyName', 'Emergency contact name')}
            {text('emergencyPhone', 'Emergency contact number', { type: 'tel' })}
            {unit.kind === 'bedspace' && <Field id="add-occupants" label="People living with them" hint="including them">
              <input id="add-occupants" type="number" min={1} max={50} className={inputClass} value={person.occupants} onChange={setP('occupants')} />
            </Field>}
            <Field id="add-notes" label="Notes" className="sm:col-span-2">
              <textarea id="add-notes" className={cn(inputClass, 'h-20 py-2 sm:h-20')} value={person.notes} onChange={setP('notes')} />
            </Field>
          </FormSection>}
          <p className="text-xs text-muted-foreground">Attach their valid ID after moving them in, from their tenant sheet.</p>
        </div>
      </details>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <FormActions submit="Move in" onCancel={onCancel} />
    </fieldset>
  </form>;
}
