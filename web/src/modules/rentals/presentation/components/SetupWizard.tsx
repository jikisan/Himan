import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { billPrefix, parsePesos, propertySchema, unitSchema } from '@himan/shared/rentals';
import type { PropertyInput, UnitInput } from '@himan/shared/rentals';
import type { RentalAction } from '../hooks/useRentals';
import { useFieldErrors } from '@core/presentation/hooks';
import { FormErrorBanner } from '@core/presentation/components';
import { Field, FormSection, MoneyInput, inputClass } from './Field';
import { UtilityFields } from './UtilityFields';
import { utilityErrors } from './fieldChecks';
import type { UtilityState } from './UtilityFields';
import { utilityColumns } from './utilities';
import { errorMessage } from '../utils/errorMessage';

type Setup = Extract<RentalAction, { type: 'setupProperty' }>;
type Row = { key: number; name: string; shared: boolean; beds: string; rent: string; extra: string };
const STEPS = ['Property', 'Rooms', 'Electricity and water'] as const;
const blankProperty: PropertyInput = { name: '', address: '', ownerName: '', ownerAddress: '', lessorName: '',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV',
  lateFeeCentavos: 0, rentDueDay: null };
const letter = (i: number) => (i < 26 ? String.fromCharCode(65 + i) : String(i + 1));

export function SetupWizard({ myName, busy, onFinish, onCancel }: {
  myName: string; busy: boolean; onFinish(action: Setup): Promise<void>; onCancel(): void;
}) {
  const [step, setStep] = useState(0);
  const [house, setHouse] = useState({ name: '', address: '', due: '' });
  const [whole, setWhole] = useState(false);
  const [rows, setRows] = useState<Row[]>([{ key: 0, name: 'Room A', shared: false, beds: '2', rent: '', extra: '' }]);
  const [utilities, setUtilities] = useState<UtilityState>({ modes: { electric: 'none', water: 'none' }, amounts: { electric: '', water: '' } });
  const fe = useFieldErrors();
  const edit = (key: number, patch: Partial<Row>, fieldId: string) => {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    fe.clear(fieldId);
  };
  const wholeRent = rows[0]?.rent ?? '';

  // Builds every room with the house-wide utilities; `bad` gets each problem under its own field.
  const rooms = (bad: [string, string][]): UnitInput[] => {
    const list = whole ? [{ name: 'Whole house', kind: 'whole' as const, capacity: 1, rent: wholeRent, extra: rows[0]?.extra ?? '',
      ids: { name: '', rent: 'setup-whole-rent', extra: 'setup-whole-extra', capacity: '' } }]
      : rows.map((r) => ({ name: r.name, kind: r.shared ? 'bedspace' as const : 'room' as const, capacity: r.shared ? Number(r.beds) : 1,
        rent: r.rent, extra: r.shared ? '' : r.extra,
        ids: { name: `setup-room-${r.key}`, rent: `setup-rent-${r.key}`, extra: `setup-extra-${r.key}`, capacity: `setup-beds-${r.key}` } }));
    const utility = step === 2 ? utilityColumns(utilities) : utilityColumns({ ...utilities, modes: { electric: 'none', water: 'none' } });
    return list.flatMap(({ rent, extra, ids, ...room }) => {
      const pesos = (fieldId: string, value: string) => {
        if (!value.trim()) return 0;
        try { return parsePesos(value); } catch (failure) { bad.push([fieldId, errorMessage(failure)]); return null; }
      };
      const defaultRentCentavos = pesos(ids.rent, rent);
      const extraPersonRentCentavos = pesos(ids.extra, extra);
      if (defaultRentCentavos === null || extraPersonRentCentavos === null) return [];
      const result = unitSchema.safeParse({ ...room, defaultRentCentavos, extraPersonRentCentavos, ...utility });
      if (result.success) return [result.data];
      const issue = result.error.issues[0];
      const key = String(issue.path[0]) as keyof typeof ids;
      bad.push([ids[key] || ids.name || ids.rent, issue.message]);
      return [];
    });
  };
  /** Every problem on this step, under its field; a step-wide one (no rooms) comes back as `form`. */
  const checkStep = (): { bad: [string, string][]; form?: string } => {
    const bad: [string, string][] = [];
    if (step === 0) {
      if (!house.name.trim()) bad.push(['setup-name', 'Enter a property name']);
      if (house.due.trim() && !(Number.isInteger(Number(house.due)) && Number(house.due) >= 1 && Number(house.due) <= 31))
        bad.push(['setup-due', 'Due day is 1–31']);
    }
    if (step === 1) {
      if (!whole && rows.length === 0) return { bad, form: 'Add at least one room' };
      if (!whole) rows.forEach((r, i) => {
        if (rows.slice(0, i).some((o) => o.name.trim().toLowerCase() === r.name.trim().toLowerCase()))
          bad.push([`setup-room-${r.key}`, 'Give each room a different name']);
      });
      rooms(bad);
    }
    if (step === 2) bad.push(...utilityErrors('setup', utilities));
    return { bad };
  };

  return <form noValidate className="grid gap-6" onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    const { bad, form } = checkStep();
    if (form) { fe.setFormError(form); return; }
    if (bad.length) { fe.failMany(bad); return; }
    if (step < 2) { setStep(step + 1); return; }
    try {
      const input = propertySchema.parse({ ...blankProperty, name: house.name, address: house.address, ownerName: myName, lessorName: myName,
        invoicePrefix: billPrefix(house.name), rentDueDay: house.due.trim() ? Number(house.due) : null });
      await onFinish({ type: 'setupProperty', input, rooms: rooms([]) });
    } catch (failure) { fe.setFormError(errorMessage(failure)); }
  }}>
    <p className="sr-only">Step {step + 1} of 3</p>
    <ol className="grid grid-cols-3 gap-2" aria-label="Steps">
      {STEPS.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined}
        className={`flex flex-col gap-1.5 text-xs font-semibold ${i === step ? 'text-primary' : 'text-muted-foreground'}`}>
        <span aria-hidden className={`h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />{i + 1} · {label}</li>)}
    </ol>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-6">
      {step === 0 && <FormSection title="Your property" description="A house, apartment, boarding house or dorm. You can change this later.">
        <Field id="setup-name" label="Property name" className="sm:col-span-2" required error={fe.errors['setup-name']}>
          <input id="setup-name" autoFocus className={inputClass} value={house.name} placeholder="e.g. Lahug Boarding House" required
            {...fe.invalid('setup-name')} onChange={(e) => { setHouse((h) => ({ ...h, name: e.target.value })); fe.clear('setup-name'); }} />
        </Field>
        <Field id="setup-address" label="Address" hint="optional" className="sm:col-span-2">
          <input id="setup-address" autoComplete="street-address" className={inputClass} value={house.address}
            onChange={(e) => setHouse((h) => ({ ...h, address: e.target.value }))} />
        </Field>
        <Field id="setup-due" label="Rent is due every" hint="day of the month · optional" className="sm:col-span-2" error={fe.errors['setup-due']}>
          <input id="setup-due" type="number" min={1} max={31} className={inputClass} value={house.due} placeholder="e.g. 5 · blank = each tenant’s move-in day"
            {...fe.invalid('setup-due')} onChange={(e) => { setHouse((h) => ({ ...h, due: e.target.value })); fe.clear('setup-due'); }} />
        </Field>
      </FormSection>}

      {step === 1 && <section className="space-y-4">
        <div><h3 className="font-semibold">What do you rent out?</h3>
          <p className="text-sm text-muted-foreground">One card per room. A shared room has beds rented to different people.</p></div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input type="checkbox" className="size-4 accent-primary" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
          I rent out the whole house to one household
        </label>
        {whole && <Field id="setup-whole-rent" label="Usual rent for the house" hint="per month" error={fe.errors['setup-whole-rent']}>
          <MoneyInput id="setup-whole-rent" value={wholeRent} placeholder="Optional" {...fe.invalid('setup-whole-rent')}
            onChange={(e) => { setRows((all) => all.map((r, i) => (i === 0 ? { ...r, rent: e.target.value } : r))); fe.clear('setup-whole-rent'); }} />
        </Field>}
        {whole && <Field id="setup-whole-extra" label="Extra per added person" hint="optional" error={fe.errors['setup-whole-extra']}>
          <MoneyInput id="setup-whole-extra" value={rows[0]?.extra ?? ''} placeholder="Optional" {...fe.invalid('setup-whole-extra')}
            onChange={(e) => { setRows((all) => all.map((r, i) => (i === 0 ? { ...r, extra: e.target.value } : r))); fe.clear('setup-whole-extra'); }} />
        </Field>}
        {!whole && <>
          <ul className="space-y-3">{rows.map((row) => <li key={row.key} className="rounded-lg border p-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
              <Field id={`setup-room-${row.key}`} label="Room name" required error={fe.errors[`setup-room-${row.key}`]}>
                <input id={`setup-room-${row.key}`} className={inputClass} value={row.name} required {...fe.invalid(`setup-room-${row.key}`)}
                  onChange={(e) => edit(row.key, { name: e.target.value }, `setup-room-${row.key}`)} />
              </Field>
              <Field id={`setup-rent-${row.key}`} label="Usual rent" hint={row.shared ? 'per bed' : undefined} error={fe.errors[`setup-rent-${row.key}`]}>
                <MoneyInput id={`setup-rent-${row.key}`} value={row.rent} placeholder="Optional" {...fe.invalid(`setup-rent-${row.key}`)}
                  onChange={(e) => edit(row.key, { rent: e.target.value }, `setup-rent-${row.key}`)} />
              </Field>
              <div role="radiogroup" aria-label={`${row.name || 'Room'} type`} className="flex rounded-lg bg-muted p-1 sm:col-span-2">
                {([['Private room', false], ['Shared room', true]] as const).map(([label, shared]) =>
                  <label key={label} className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-medium text-muted-foreground transition-colors has-[:checked]:bg-background has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:min-h-8">
                    <input type="radio" name={`setup-kind-${row.key}`} className="sr-only" checked={row.shared === shared}
                      onChange={() => edit(row.key, { shared }, `setup-beds-${row.key}`)} />{label}</label>)}
              </div>
              {row.shared ? <Field id={`setup-beds-${row.key}`} label="Beds" required error={fe.errors[`setup-beds-${row.key}`]}>
                <input id={`setup-beds-${row.key}`} type="number" min={2} max={50} className={inputClass} value={row.beds} required
                  {...fe.invalid(`setup-beds-${row.key}`)} onChange={(e) => edit(row.key, { beds: e.target.value }, `setup-beds-${row.key}`)} />
              </Field> : <Field id={`setup-extra-${row.key}`} label="Extra per added person" error={fe.errors[`setup-extra-${row.key}`]}>
                <MoneyInput id={`setup-extra-${row.key}`} value={row.extra} placeholder="Optional" {...fe.invalid(`setup-extra-${row.key}`)}
                  onChange={(e) => edit(row.key, { extra: e.target.value }, `setup-extra-${row.key}`)} />
              </Field>}
            </div>
            {rows.length > 1 && <Button type="button" variant="ghost" size="sm" className="mt-2 h-11 px-2.5 text-muted-foreground hover:text-destructive sm:h-9"
              aria-label={`Remove ${row.name || 'room'}`} onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}><X className="h-4 w-4" />Remove</Button>}
          </li>)}</ul>
          <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setRows((all) => [...all,
            { key: Math.max(...all.map((r) => r.key), -1) + 1, name: `Room ${letter(all.length)}`, shared: false, beds: '2', rent: '', extra: '' }])}>
            <Plus className="h-4 w-4" />Add another room</Button>
        </>}
      </section>}

      {step === 2 && <FormSection title="Electricity and water" description="Set once for every room. You can change a single room later.">
        <UtilityFields idPrefix="setup" value={utilities} onChange={setUtilities} fe={fe} />
      </FormSection>}

      <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t bg-card px-6 py-4">
        {step === 1 && <span className="mr-auto text-sm font-medium text-muted-foreground">{whole ? 'Whole house' : `${rows.length} ${rows.length === 1 ? 'room' : 'rooms'} · ${
          rows.reduce((sum, r) => sum + (r.shared ? Number(r.beds) || 0 : 1), 0)} beds`}</span>}
        {step === 0 ? <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
          : <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => { fe.clear(); setStep(step - 1); }}>Back</Button>}
        <Button type="submit" className="h-11 sm:h-9">{step < 2 ? 'Next' : 'Finish setup'}</Button>
      </div>
    </fieldset>
  </form>;
}
