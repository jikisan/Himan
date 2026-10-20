import { useState } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import { centavosToInput, formatPesos, manilaToday, moveInDefaults, parsePesos, proratedRent, renterSchema, roomRent, tenancyTermsSchema } from '@himan/shared/rentals';
import type { MeterKind } from '@himan/shared/rentals';
import type { RentalUnit, Renter, RenterInput } from '@himan/shared/rentals';
import type { RentalAction } from '../hooks/useRentals';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';
import { ChargesEditor } from './ChargesEditor';
import { parseCharges } from '../utils/charges';
import type { ChargeRow } from '../utils/charges';
import { cn } from '@core/presentation/utils';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';

/** Everything step 1 of the move-in collects; nothing is saved until the Pay step. */
export type MoveInDraft = Omit<Extract<RentalAction, { type: 'moveIn' }>, 'payment' | 'proofs'>;
const blankPerson: RenterInput = { fullName: '', phone: '', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
const peso = (value: string) => { try { return value.trim() ? parsePesos(value) : null; } catch { return null; } };
/** Input id of each renter / terms schema field. */
const FIELD_ID: Record<string, string> = { moveIn: 'add-move-in', startDate: 'add-move-in', endDate: 'add-end', monthlyRentCentavos: 'add-rent',
  dueDay: 'add-due', advanceMonths: 'add-advance', depositCentavos: 'add-deposit', occupants: 'add-occupants' };
const fieldId = (path: PropertyKey[]) => FIELD_ID[String(path[0])] ?? `add-${String(path[0])}`;
/** The first half-filled or bad charge row: its input id (as ChargesEditor names them) and the message. */
function chargeProblem(rows: ChargeRow[]): [string, string] | null {
  for (const [i, r] of rows.entries()) {
    try { parseCharges([r]); } catch (e) { return [`add-charge-${i}-${r.label.trim() ? 'amount' : 'name'}`, errorMessage(e)]; }
  }
  return null;
}

/** Step 1 of the move-in: who, which terms. Only checks the input; `onNext` gets the draft (nothing is saved here).
 * `others`: people from the owner's other properties; picking one copies their contact details (not their ID) into a new tenant here. */
export function AddTenantForm({ unit, renters, others = [], rentDueDay = null, busy, onNext, onCancel }: {
  unit: RentalUnit; renters: Renter[]; others?: { renter: Renter; propertyName: string }[]; rentDueDay?: number | null; busy: boolean;
  onNext(draft: MoveInDraft): void; onCancel(): void;
}) {
  const [person, setPerson] = useState(blankPerson);
  // A renter id of this property, or `other:<id>` for someone from another property.
  const [existingId, setExistingId] = useState<string | null>(null);
  const other = existingId?.startsWith('other:') ? others.find((o) => `other:${o.renter.id}` === existingId)?.renter : undefined;
  const [moveIn, setMoveIn] = useState(manilaToday());
  // Rent follows the room's price for the headcount until the user types their own amount.
  const [ownRent, setOwnRent] = useState<string | null>(null);
  const people = Math.max(person.occupants || 1, 1);
  const rent = ownRent ?? centavosToInput(roomRent(unit, people));
  const perPerson = unit.extraPersonRentCentavos > 0 && unit.defaultRentCentavos > 0;
  // Contract fields follow move-in and rent until the user types their own value.
  const [own, setOwn] = useState<{ endDate?: string; dueDay?: string; advance?: string; deposit?: string }>({});
  // The hook opens a closed "More details" section around the first bad field.
  const fe = useFieldErrors();
  const chargeError = Object.keys(fe.errors).find((id) => id.startsWith('add-charge-'));
  const [readings, setReadings] = useState<Partial<Record<MeterKind, string>>>({});
  const [charges, setCharges] = useState<ChargeRow[]>([]);
  const meters = (['electric', 'water'] as const).filter((k) => (k === 'electric' ? unit.electricMode : unit.waterMode) === 'submeter');
  const auto = moveInDefaults(moveIn || manilaToday(), peso(rent) ?? 0, rentDueDay);
  const endDate = own.endDate ?? auto.endDate;
  const dueDay = own.dueDay ?? String(auto.dueDay);
  const advance = own.advance ?? '1';
  const deposit = own.deposit ?? centavosToInput(auto.depositCentavos);
  const rentValue = peso(rent);
  const depositValue = deposit.trim() ? peso(deposit) : 0;
  const dueNumber = Number(dueDay);
  const days = rentValue !== null && moveIn && dueNumber >= 1 && dueNumber <= 31 ? proratedRent(rentValue, moveIn, dueNumber) : null;
  const total = rentValue !== null && depositValue !== null ? rentValue * Number(advance || 0) + depositValue + (days?.amount ?? 0) : null;
  const setPeople = (n: number) => { setPerson((p) => ({ ...p, occupants: n })); fe.clear('add-occupants'); };
  const setP = (key: keyof RenterInput) => (e: { target: { value: string } }) => {
    setPerson((p) => ({ ...p, [key]: key === 'occupants' ? Number(e.target.value) : e.target.value }));
    fe.clear(`add-${key}`);
  };
  const setTerm = (key: keyof typeof own, id: string) => (value: string) => { setOwn((o) => ({ ...o, [key]: value })); fe.clear(id); };
  const text = (key: Exclude<keyof RenterInput, 'occupants'>, label: string, extra?: { type?: string; autoComplete?: string; wide?: boolean; hint?: string; required?: boolean }) =>
    <Field id={`add-${key}`} label={label} hint={extra?.hint} required={extra?.required} error={fe.errors[`add-${key}`]} className={extra?.wide ? 'sm:col-span-2' : ''}>
      <input id={`add-${key}`} type={extra?.type ?? 'text'} autoComplete={extra?.autoComplete ?? 'off'} className={inputClass}
        required={extra?.required} {...fe.invalid(`add-${key}`)} value={person[key]} onChange={setP(key)} />
    </Field>;

  return <form noValidate className="space-y-6" onSubmit={(event) => {
    event.preventDefault();
    fe.clear();
    try {
      const copied = other && { fullName: other.fullName, phone: other.phone, facebook: other.facebook, email: other.email, address: other.address,
        emergencyName: other.emergencyName, emergencyPhone: other.emergencyPhone, occupants: other.occupants, notes: '' };
      const renter = copied ? renterSchema.safeParse(copied) : existingId ? null : renterSchema.safeParse(person);
      // Every bad field at once; the hook focuses the first one on the screen.
      // A copied person's details aren't on screen: their problem points at the tenant picker.
      const failed: [string, string][] = renter && !renter.success ? zodFieldErrors(renter.error, copied ? () => 'add-existing' : fieldId) : [];
      const money = (id: string, value: string) => { try { return value.trim() ? parsePesos(value) : 0; } catch (e) { failed.push([id, errorMessage(e)]); return 0; } };
      const monthlyRentCentavos = money('add-rent', rent);
      const depositCentavos = money('add-deposit', deposit);
      const terms = tenancyTermsSchema.safeParse({ moveIn, startDate: moveIn, endDate, monthlyRentCentavos, dueDay: Number(dueDay), advanceMonths: Number(advance),
        depositCentavos });
      // An amount that isn't a number keeps that message rather than the schema's "Enter the monthly rent".
      if (!terms.success) failed.push(...zodFieldErrors(terms.error, fieldId).filter(([id]) => !failed.some(([f]) => f === id)));
      const charge = chargeProblem(charges);
      if (charge) failed.push(charge);
      const badReading = meters.find((kind) => readings[kind]?.trim() && !(Number.isFinite(Number(readings[kind])) && Number(readings[kind]) >= 0));
      if (badReading) failed.push([`add-reading-${badReading}`, 'Meter readings must be 0 or more']);
      if (!terms.success || failed.length) { fe.failMany(failed); return; }
      const starting = meters.flatMap((kind) => readings[kind]?.trim() ? [{ kind, value: Number(readings[kind]) }] : []);
      const { moveIn: date, ...rest } = terms.data;
      onNext({ type: 'moveIn', propertyId: unit.propertyId, unitId: unit.id, renterId: renter ? null : existingId,
        renter: renter?.success ? renter.data : null, moveIn: date, terms: rest, readings: starting, charges: parseCharges(charges) });
    } catch (failure) { fe.setFormError(errorMessage(failure)); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-6">
      {/* One line between each section: Who · Move-in · More details. */}
      <div className="divide-y [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
      <FormSection title="Who is moving in?">
        {(renters.length > 0 || others.length > 0) && <div role="group" aria-label="New or existing tenant" className="flex rounded-lg bg-muted p-1 sm:col-span-2">
          {([['New person', null], ['Already a tenant', renters[0]?.id ?? `other:${others[0].renter.id}`]] as const).map(([label, id]) =>
            <button key={label} type="button" aria-pressed={(existingId === null) === (id === null)}
              onClick={() => setExistingId(id === null ? null : existingId ?? id)}
              className="min-h-11 flex-1 rounded-md text-sm font-medium text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9">
              {label}</button>)}
        </div>}
        {existingId === null ? <>
          {text('fullName', 'Full name', { autoComplete: 'name', wide: true, required: true })}
          {text('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel', wide: true, hint: 'optional' })}
        </> : <Field id="add-existing" label="Tenant" className="sm:col-span-2" error={fe.errors['add-existing']}>
          <select id="add-existing" {...fe.invalid('add-existing')} className={inputClass} value={existingId}
            onChange={(e) => { setExistingId(e.target.value); fe.clear('add-existing'); }}>
            {renters.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
            {others.length > 0 && <optgroup label="From my other properties">
              {others.map((o) => <option key={o.renter.id} value={`other:${o.renter.id}`}>{`${o.renter.fullName} · ${o.propertyName}`}</option>)}
            </optgroup>}
          </select>
          {other && <p className="text-xs text-muted-foreground">Their contact details are copied. Ask for a new ID photo.</p>}
        </Field>}
      </FormSection>
      <FormSection title="Move-in">
        <Field id="add-move-in" label="Move-in date" className="sm:col-span-2" required error={fe.errors['add-move-in']}>
          <input id="add-move-in" type="date" required {...fe.invalid('add-move-in')} className={inputClass} value={moveIn}
            onChange={(e) => { setMoveIn(e.target.value); fe.clear('add-move-in'); }} />
        </Field>
        {unit.kind !== 'bedspace' && <Field id="add-occupants" label="People in the room" error={fe.errors['add-occupants']}>
          <Stepper id="add-occupants" invalid={fe.invalid('add-occupants')} value={person.occupants} min={1} max={50} less="One fewer person" more="One more person"
            onChange={setPeople} onType={setP('occupants')} />
          <p className="text-xs text-muted-foreground">Including the tenant</p>
        </Field>}
        <Field id="add-rent" label="Monthly rent" hint={unit.kind === 'bedspace' ? 'per bed' : undefined} required error={fe.errors['add-rent']}>
          <MoneyInput id="add-rent" required {...fe.invalid('add-rent')} value={rent} placeholder="0.00"
            onChange={(e) => { setOwnRent(e.target.value); fe.clear('add-rent'); }} />
          {perPerson && ownRent === null && <p className="text-xs text-muted-foreground">
            {people > 1 ? `${formatPesos(unit.defaultRentCentavos)} + ${formatPesos(unit.extraPersonRentCentavos)} × ${people - 1} extra person${people === 2 ? '' : 's'}`
              : `+${formatPesos(unit.extraPersonRentCentavos)} for each extra person`}</p>}
        </Field>
        <Field id="add-advance" label="Advance months" error={fe.errors['add-advance']}>
          <Stepper id="add-advance" invalid={fe.invalid('add-advance')} value={Number(advance) || 0} min={0} max={12} less="One month less" more="One month more"
            onChange={(n) => setTerm('advance', 'add-advance')(String(n))} onType={(e) => setTerm('advance', 'add-advance')(e.target.value)} />
          <p className="text-xs text-muted-foreground">Rent paid ahead, used for the first months</p>
        </Field>
        <Field id="add-deposit" label="Deposit" error={fe.errors['add-deposit']}>
          <MoneyInput id="add-deposit" {...fe.invalid('add-deposit')} value={deposit} onChange={(e) => setTerm('deposit', 'add-deposit')(e.target.value)} />
          <p className="text-xs text-muted-foreground">Kept until they move out</p>
        </Field>
        <div aria-live="polite" className="rounded-xl bg-primary/10 px-4 py-3 text-sm sm:col-span-2">
          <p className="font-semibold">Collect on move-in</p>
          <dl className="mt-2 space-y-1 tabular-nums">
            {days && days.amount > 0 && <Line label={`Rent for ${days.days} day${days.days === 1 ? '' : 's'} before the first due date`} amount={days.amount} />}
            {rentValue !== null && Number(advance) > 0 && <Line label={`Advance · ${advance} month${advance === '1' ? '' : 's'}`} amount={rentValue * Number(advance)} />}
            {depositValue !== null && depositValue > 0 && <Line label="Deposit" amount={depositValue} />}
          </dl>
          <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-primary/20 pt-2">
            <span className="font-semibold">Total</span>
            <span className="text-2xl font-bold tabular-nums text-primary">{total === null ? '—' : formatPesos(total)}</span>
          </div>
        </div>
      </FormSection>

      <div className="space-y-3">
        <p className="text-sm font-semibold">More details <span className="font-normal text-muted-foreground">(optional, filled in for you)</span></p>
        <Collapsible title="Due date and lease end"
          summary={`Due every ${dueNumber >= 1 && dueNumber <= 31 ? (dueNumber === 31 ? 'month end' : ordinal(dueNumber)) : '—'} · ends ${endDate ? format(parseISO(endDate), 'MMM d, yyyy') : '—'}`}>
          <p className="text-xs italic text-muted-foreground sm:col-span-2">Change only if your agreement is different.</p>
          <Field id="add-due" label="Due day" hint="31 = month end" error={fe.errors['add-due']}>
            <input id="add-due" type="number" min={1} max={31} {...fe.invalid('add-due')} className={inputClass} value={dueDay}
              onChange={(e) => setTerm('dueDay', 'add-due')(e.target.value)} />
          </Field>
          <Field id="add-end" label="Lease ends" error={fe.errors['add-end']}>
            <input id="add-end" type="date" {...fe.invalid('add-end')} className={inputClass} value={endDate} onChange={(e) => setTerm('endDate', 'add-end')(e.target.value)} />
          </Field>
        </Collapsible>
        <Collapsible title={meters.length ? 'Meters and extra charges' : 'Extra charges'}
          summary={[meters.length ? (meters.some((k) => readings[k]?.trim()) ? 'Starting reading added' : 'No starting reading') : '',
            charges.length ? `${charges.length} extra charge${charges.length === 1 ? '' : 's'}` : 'No extra charges'].filter(Boolean).join(' · ')}>
          {meters.length > 0 && <p className="text-xs italic text-muted-foreground sm:col-span-2">The number on the meter today, so their first SOA counts usage from here.</p>}
          {meters.map((kind) => <Field key={kind} id={`add-reading-${kind}`} label={kind === 'electric' ? 'Electricity reading today' : 'Water reading today'}
            error={fe.errors[`add-reading-${kind}`]}>
            <input id={`add-reading-${kind}`} type="number" inputMode="decimal" min={0} step="any" className={inputClass} {...fe.invalid(`add-reading-${kind}`)}
              value={readings[kind] ?? ''} onChange={(e) => { setReadings((r) => ({ ...r, [kind]: e.target.value })); fe.clear(`add-reading-${kind}`); }} />
          </Field>)}
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">Extra monthly charges <span className="font-normal text-muted-foreground">e.g. parking, added to every SOA</span></p>
            <ChargesEditor idPrefix="add" value={charges} onChange={(rows) => { setCharges(rows); if (chargeError) fe.clear(chargeError); }} />
            {chargeError && <FieldError id={chargeError} message={fe.errors[chargeError]} />}
          </div>
        </Collapsible>
        <Collapsible title="Contact and emergency"
          summary={existingId !== null ? 'Already on file' : [person.facebook, person.emergencyName].filter(Boolean).join(' · ') || 'Messenger, email, emergency contact'}>
          {existingId !== null ? <p className="text-sm text-muted-foreground sm:col-span-2">
            Their contact details are already on file. Change them from their tenant sheet after moving them in.</p> : <>
            <p className="text-xs italic text-muted-foreground sm:col-span-2">Optional: the tenant fills these in, with their ID, when signing the contract.</p>
            {text('facebook', 'Facebook / Messenger')}
            {text('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {text('address', 'Home address', { autoComplete: 'street-address', wide: true })}
            {text('emergencyName', 'Emergency contact name')}
            {text('emergencyPhone', 'Emergency contact number', { type: 'tel' })}
            {unit.kind === 'bedspace' && <Field id="add-occupants" label="People living with them" hint="including them" error={fe.errors['add-occupants']}>
              <input id="add-occupants" type="number" min={1} max={50} {...fe.invalid('add-occupants')} className={inputClass} value={person.occupants} onChange={setP('occupants')} />
            </Field>}
            <Field id="add-notes" label="Notes" className="sm:col-span-2" error={fe.errors['add-notes']}>
              <textarea id="add-notes" {...fe.invalid('add-notes')} className={cn(inputClass, 'h-20 py-2 sm:h-20')} value={person.notes} onChange={setP('notes')} />
            </Field>
          </>}
        </Collapsible>
      </div>
      </div>
      <FormActions submit="Next: payment" onCancel={onCancel} />
    </fieldset>
  </form>;
}

const ordinal = (n: number) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${tail}`;
};

/** − value + box; the number can also be typed. */
function Stepper({ id, value, min, max, less, more, invalid, onChange, onType }: {
  id: string; value: number; min: number; max: number; less: string; more: string; invalid: ReturnType<ReturnType<typeof useFieldErrors>['invalid']>;
  onChange(n: number): void; onType(e: { target: { value: string } }): void;
}) {
  const btn = 'flex w-11 items-center justify-center bg-muted/40 transition-colors hover:bg-muted disabled:opacity-40';
  return <div className={cn('flex h-11 overflow-hidden rounded-lg border border-input sm:h-10', invalid['aria-invalid'] && 'border-destructive ring-2 ring-destructive/25')}>
    <button type="button" aria-label={less} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}><Minus className="h-4 w-4" /></button>
    <input id={id} type="number" min={min} max={max} value={value} onChange={onType} {...invalid}
      className="min-w-0 flex-1 bg-background text-center font-semibold tabular-nums focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
    <button type="button" aria-label={more} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}><Plus className="h-4 w-4" /></button>
  </div>;
}

function Line({ label, amount }: { label: string; amount: number }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd>{formatPesos(amount)}</dd></div>;
}

/** A closed-by-default section that still shows what's in it. */
function Collapsible({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return <details className="group rounded-lg border [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{summary}</span></span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
    </summary>
    <div className="grid gap-x-3 gap-y-4 border-t px-4 py-4 sm:grid-cols-2">{children}</div>
  </details>;
}
