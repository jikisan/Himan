import { useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
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

type AddTenant = Extract<RentalAction, { type: 'addTenant' }>;
const blankPerson: RenterInput = { fullName: '', phone: '', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
const peso = (value: string) => { try { return value.trim() ? parsePesos(value) : null; } catch { return null; } };

export function AddTenantForm({ unit, renters, rentDueDay = null, busy, onSave, onCancel }: {
  unit: RentalUnit; renters: Renter[]; rentDueDay?: number | null; busy: boolean; onSave(action: AddTenant): Promise<void>; onCancel(): void;
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
  const contractRef = useRef<HTMLDetailsElement>(null);
  const metersRef = useRef<HTMLDetailsElement>(null);
  const contactRef = useRef<HTMLDetailsElement>(null);
  // A problem in a field inside a collapsed section opens that section so the field is visible.
  const fail = (message: string, path: PropertyKey | undefined) => {
    const key = String(path);
    const section = ['dueDay', 'endDate', 'startDate'].includes(key) ? contractRef : ['readings', 'charges'].includes(key) ? metersRef
      : ['facebook', 'email', 'address', 'emergencyName', 'emergencyPhone', 'notes', 'occupants'].includes(key) ? contactRef : null;
    if (section?.current) section.current.open = true;
    setError(message);
  };
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
      let extra;
      try { extra = parseCharges(charges); } catch (e) { fail(errorMessage(e), 'charges'); return; }
      const starting = meters.flatMap((kind) => readings[kind]?.trim() ? [{ kind, value: Number(readings[kind]) }] : []);
      if (starting.some((r) => !Number.isFinite(r.value) || r.value < 0)) { fail('Meter readings must be 0 or more', 'readings'); return; }
      const { moveIn: date, ...rest } = terms.data;
      await onSave({ type: 'addTenant', propertyId: unit.propertyId, unitId: unit.id, renterId: existingId,
        renter: renter?.data ?? null, moveIn: date, terms: rest, readings: starting, charges: extra });
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
        {unit.kind !== 'bedspace' && <div className="space-y-1.5">
          <label htmlFor="add-occupants" className="text-sm font-medium">People in the room</label>
          <Stepper id="add-occupants" value={person.occupants} min={1} max={50} less="One fewer person" more="One more person"
            onChange={setPeople} onType={setP('occupants')} />
          <p className="text-xs text-muted-foreground">Including the tenant</p>
        </div>}
        <Field id="add-rent" label="Monthly rent" hint={unit.kind === 'bedspace' ? 'per bed' : undefined}>
          <MoneyInput id="add-rent" value={rent} placeholder="0.00" onChange={(e) => setOwnRent(e.target.value)} />
          {perPerson && ownRent === null && <p className="text-xs text-muted-foreground">
            {people > 1 ? `${formatPesos(unit.defaultRentCentavos)} + ${formatPesos(unit.extraPersonRentCentavos)} × ${people - 1} extra person${people === 2 ? '' : 's'}`
              : `+${formatPesos(unit.extraPersonRentCentavos)} for each extra person`}</p>}
        </Field>
        <div className="space-y-1.5">
          <label htmlFor="add-advance" className="text-sm font-medium">Advance months</label>
          <Stepper id="add-advance" value={Number(advance) || 0} min={0} max={12} less="One month less" more="One month more"
            onChange={(n) => setOwn((o) => ({ ...o, advance: String(n) }))} onType={(e) => setOwn((o) => ({ ...o, advance: e.target.value }))} />
          <p className="text-xs text-muted-foreground">Rent paid ahead, used for the first months</p>
        </div>
        <Field id="add-deposit" label="Deposit">
          <MoneyInput id="add-deposit" value={deposit} onChange={(e) => setOwn((o) => ({ ...o, deposit: e.target.value }))} />
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
        <Collapsible refEl={contractRef} title="Contract"
          summary={`Due every ${dueNumber >= 1 && dueNumber <= 31 ? (dueNumber === 31 ? 'month end' : ordinal(dueNumber)) : '—'} · ends ${endDate ? format(parseISO(endDate), 'MMM d, yyyy') : '—'}`}>
          <p className="text-xs text-muted-foreground sm:col-span-2">Change only if your agreement is different.</p>
          <Field id="add-due" label="Due day" hint="31 = month end">
            <input id="add-due" type="number" min={1} max={31} className={inputClass} value={dueDay}
              onChange={(e) => setOwn((o) => ({ ...o, dueDay: e.target.value }))} />
          </Field>
          <Field id="add-end" label="Contract ends">
            <input id="add-end" type="date" className={inputClass} value={endDate} onChange={(e) => setOwn((o) => ({ ...o, endDate: e.target.value }))} />
          </Field>
        </Collapsible>
        <Collapsible refEl={metersRef} title={meters.length ? 'Meters and extra charges' : 'Extra charges'}
          summary={[meters.length ? (meters.some((k) => readings[k]?.trim()) ? 'Starting reading added' : 'No starting reading') : '',
            charges.length ? `${charges.length} extra charge${charges.length === 1 ? '' : 's'}` : 'No extra charges'].filter(Boolean).join(' · ')}>
          {meters.map((kind) => <Field key={kind} id={`add-reading-${kind}`} label={kind === 'electric' ? 'Electricity reading today' : 'Water reading today'}>
            <input id={`add-reading-${kind}`} type="number" inputMode="decimal" min={0} step="any" className={inputClass}
              value={readings[kind] ?? ''} onChange={(e) => setReadings((r) => ({ ...r, [kind]: e.target.value }))} />
          </Field>)}
          {meters.length > 0 && <p className="text-xs text-muted-foreground sm:col-span-2">The number on the meter today, so their first SOA counts usage from here.</p>}
          <div className="space-y-2 sm:col-span-2">
            <p className="text-sm font-medium">Extra monthly charges <span className="font-normal text-muted-foreground">e.g. parking, added to every SOA</span></p>
            <ChargesEditor idPrefix="add" value={charges} onChange={setCharges} />
          </div>
        </Collapsible>
        <Collapsible refEl={contactRef} title="Contact and emergency"
          summary={existingId !== null ? 'Already on file' : [person.facebook, person.emergencyName].filter(Boolean).join(' · ') || 'Messenger, email, emergency contact'}>
          {existingId !== null ? <p className="text-sm text-muted-foreground sm:col-span-2">
            Their contact details are already on file. Change them from their tenant sheet after moving them in.</p> : <>
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
            <p className="text-xs text-muted-foreground sm:col-span-2">Attach their valid ID after moving them in, from their tenant sheet.</p>
          </>}
        </Collapsible>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <FormActions submit="Move in" onCancel={onCancel} />
    </fieldset>
  </form>;
}

const ordinal = (n: number) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${tail}`;
};

/** − value + box; the number can also be typed. */
function Stepper({ id, value, min, max, less, more, onChange, onType }: {
  id: string; value: number; min: number; max: number; less: string; more: string;
  onChange(n: number): void; onType(e: { target: { value: string } }): void;
}) {
  const btn = 'flex w-11 items-center justify-center bg-muted/40 transition-colors hover:bg-muted disabled:opacity-40';
  return <div className="flex h-11 overflow-hidden rounded-lg border border-input sm:h-10">
    <button type="button" aria-label={less} disabled={value <= min} onClick={() => onChange(value - 1)} className={btn}><Minus className="h-4 w-4" /></button>
    <input id={id} type="number" min={min} max={max} value={value} onChange={onType}
      className="min-w-0 flex-1 bg-background text-center font-semibold tabular-nums focus-visible:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
    <button type="button" aria-label={more} disabled={value >= max} onClick={() => onChange(value + 1)} className={btn}><Plus className="h-4 w-4" /></button>
  </div>;
}

function Line({ label, amount }: { label: string; amount: number }) {
  return <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{label}</dt><dd>{formatPesos(amount)}</dd></div>;
}

/** A closed-by-default section that still shows what's in it. */
function Collapsible({ refEl, title, summary, children }: {
  refEl: RefObject<HTMLDetailsElement | null>; title: string; summary: string; children: ReactNode;
}) {
  return <details ref={refEl} className="group rounded-lg border [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{summary}</span></span>
      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
    </summary>
    <div className="grid gap-3 border-t px-4 py-4 sm:grid-cols-2">{children}</div>
  </details>;
}
