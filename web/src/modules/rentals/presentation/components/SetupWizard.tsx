import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { billPrefix, parsePesos, propertySchema, unitSchema } from '@himan/shared/rentals';
import type { PropertyInput, UnitInput } from '@himan/shared/rentals';
import type { RentalAction } from '../hooks/useRentals';
import { Field, FormSection, MoneyInput, inputClass } from './Field';
import { UtilityFields } from './UtilityFields';
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
  const [error, setError] = useState('');
  const edit = (key: number, patch: Partial<Row>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const wholeRent = rows[0]?.rent ?? '';

  // Builds every room with the house-wide utilities; throws the first readable problem.
  const rooms = (): UnitInput[] => {
    const list = whole ? [{ name: 'Whole house', kind: 'whole' as const, capacity: 1, rent: wholeRent, extra: rows[0]?.extra ?? '' }]
      : rows.map((r) => ({ name: r.name, kind: r.shared ? 'bedspace' as const : 'room' as const, capacity: r.shared ? Number(r.beds) : 1,
        rent: r.rent, extra: r.shared ? '' : r.extra }));
    const utility = step === 2 ? utilityColumns(utilities) : utilityColumns({ ...utilities, modes: { electric: 'none', water: 'none' } });
    return list.map(({ rent, extra, ...room }) => {
      const result = unitSchema.safeParse({ ...room, defaultRentCentavos: rent.trim() ? parsePesos(rent) : 0,
        extraPersonRentCentavos: extra.trim() ? parsePesos(extra) : 0, ...utility });
      if (!result.success) throw new Error(`${room.name || 'A room'}: ${result.error.issues[0].message}`);
      return result.data;
    });
  };
  const checkStep = () => {
    if (step === 0 && !house.name.trim()) throw new Error('Enter a property name');
    if (step === 0 && house.due.trim() && !(Number.isInteger(Number(house.due)) && Number(house.due) >= 1 && Number(house.due) <= 31))
      throw new Error('Due day is 1–31');
    if (step === 1) {
      if (!whole && rows.length === 0) throw new Error('Add at least one room');
      const names = rows.map((r) => r.name.trim().toLowerCase());
      if (!whole && new Set(names).size !== names.length) throw new Error('Give each room a different name');
      rooms();
    }
  };

  return <form noValidate className="grid gap-6" onSubmit={async (event) => {
    event.preventDefault();
    try {
      checkStep();
      setError('');
      if (step < 2) { setStep(step + 1); return; }
      const input = propertySchema.parse({ ...blankProperty, name: house.name, address: house.address, ownerName: myName, lessorName: myName,
        invoicePrefix: billPrefix(house.name), rentDueDay: house.due.trim() ? Number(house.due) : null });
      await onFinish({ type: 'setupProperty', input, rooms: rooms() });
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <p className="sr-only">Step {step + 1} of 3</p>
    <ol className="grid grid-cols-3 gap-2" aria-label="Steps">
      {STEPS.map((label, i) => <li key={label} aria-current={i === step ? 'step' : undefined}
        className={`flex flex-col gap-1.5 text-xs font-semibold ${i === step ? 'text-primary' : 'text-muted-foreground'}`}>
        <span aria-hidden className={`h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-muted'}`} />{i + 1} · {label}</li>)}
    </ol>
    <fieldset disabled={busy} className="space-y-6">
      {step === 0 && <FormSection title="Your property" description="A house, apartment, boarding house or dorm. You can change this later.">
        <Field id="setup-name" label="Property name" className="sm:col-span-2">
          <input id="setup-name" autoFocus className={inputClass} value={house.name} placeholder="e.g. Lahug Boarding House"
            onChange={(e) => setHouse((h) => ({ ...h, name: e.target.value }))} />
        </Field>
        <Field id="setup-address" label="Address" hint="optional" className="sm:col-span-2">
          <input id="setup-address" autoComplete="street-address" className={inputClass} value={house.address}
            onChange={(e) => setHouse((h) => ({ ...h, address: e.target.value }))} />
        </Field>
        <Field id="setup-due" label="Rent is due every" hint="day of the month · optional" className="sm:col-span-2">
          <input id="setup-due" type="number" min={1} max={31} className={inputClass} value={house.due} placeholder="e.g. 5 · blank = each tenant’s move-in day"
            onChange={(e) => setHouse((h) => ({ ...h, due: e.target.value }))} />
        </Field>
      </FormSection>}

      {step === 1 && <section className="space-y-4">
        <div><h3 className="font-semibold">What do you rent out?</h3>
          <p className="text-sm text-muted-foreground">One card per room. A shared room has beds rented to different people.</p></div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
          <input type="checkbox" className="size-4 accent-primary" checked={whole} onChange={(e) => setWhole(e.target.checked)} />
          I rent out the whole house to one household
        </label>
        {whole && <Field id="setup-whole-rent" label="Usual rent for the house" hint="per month">
          <MoneyInput id="setup-whole-rent" value={wholeRent} placeholder="Optional"
            onChange={(e) => setRows((all) => all.map((r, i) => (i === 0 ? { ...r, rent: e.target.value } : r)))} />
        </Field>}
        {whole && <Field id="setup-whole-extra" label="Extra per added person" hint="optional">
          <MoneyInput id="setup-whole-extra" value={rows[0]?.extra ?? ''} placeholder="Optional"
            onChange={(e) => setRows((all) => all.map((r, i) => (i === 0 ? { ...r, extra: e.target.value } : r)))} />
        </Field>}
        {!whole && <>
          <ul className="space-y-3">{rows.map((row) => <li key={row.key} className="relative rounded-lg border p-3 pr-12">
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
              <Field id={`setup-room-${row.key}`} label="Room name">
                <input id={`setup-room-${row.key}`} className={inputClass} value={row.name} onChange={(e) => edit(row.key, { name: e.target.value })} />
              </Field>
              <Field id={`setup-rent-${row.key}`} label="Usual rent" hint={row.shared ? 'per bed' : undefined}>
                <MoneyInput id={`setup-rent-${row.key}`} value={row.rent} placeholder="Optional" onChange={(e) => edit(row.key, { rent: e.target.value })} />
              </Field>
              <div role="radiogroup" aria-label={`${row.name || 'Room'} type`} className="flex rounded-lg bg-muted p-1 sm:col-span-2">
                {([['Private room', false], ['Shared room', true]] as const).map(([label, shared]) =>
                  <label key={label} className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-md px-2 text-center text-sm font-medium text-muted-foreground transition-colors has-[:checked]:bg-background has-[:checked]:text-foreground has-[:checked]:shadow-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring sm:min-h-8">
                    <input type="radio" name={`setup-kind-${row.key}`} className="sr-only" checked={row.shared === shared}
                      onChange={() => edit(row.key, { shared })} />{label}</label>)}
              </div>
              {row.shared ? <Field id={`setup-beds-${row.key}`} label="Beds">
                <input id={`setup-beds-${row.key}`} type="number" min={2} max={50} className={inputClass} value={row.beds}
                  onChange={(e) => edit(row.key, { beds: e.target.value })} />
              </Field> : <Field id={`setup-extra-${row.key}`} label="Extra per added person">
                <MoneyInput id={`setup-extra-${row.key}`} value={row.extra} placeholder="Optional" onChange={(e) => edit(row.key, { extra: e.target.value })} />
              </Field>}
            </div>
            {rows.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-11 sm:size-9"
              aria-label={`Remove ${row.name || 'room'}`} onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}><X className="h-4 w-4" /></Button>}
          </li>)}</ul>
          <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => setRows((all) => [...all,
            { key: Math.max(...all.map((r) => r.key), -1) + 1, name: `Room ${letter(all.length)}`, shared: false, beds: '2', rent: '', extra: '' }])}>
            <Plus className="h-4 w-4" />Add another room</Button>
        </>}
      </section>}

      {step === 2 && <FormSection title="Electricity and water" description="Set once for every room. You can change a single room later.">
        <UtilityFields idPrefix="setup" value={utilities} onChange={setUtilities} />
      </FormSection>}

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t bg-card px-6 py-4">
        {step === 1 && <span className="mr-auto text-sm font-medium text-muted-foreground">{whole ? 'Whole house' : `${rows.length} ${rows.length === 1 ? 'room' : 'rooms'} · ${
          rows.reduce((sum, r) => sum + (r.shared ? Number(r.beds) || 0 : 1), 0)} beds`}</span>}
        {step === 0 ? <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
          : <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={() => { setError(''); setStep(step - 1); }}>Back</Button>}
        <Button type="submit" className="h-11 sm:h-9">{step < 2 ? 'Next' : 'Finish setup'}</Button>
      </div>
    </fieldset>
  </form>;
}
