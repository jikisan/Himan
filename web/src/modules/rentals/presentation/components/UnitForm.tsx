import { useState } from 'react';
import { centavosToInput, parsePesos, unitSchema, UNIT_KINDS } from '@himan/shared/rentals';
import type { RentalUnit, UnitInput } from '@himan/shared/rentals';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
import { UtilityFields } from './UtilityFields';
import type { UtilityState } from './UtilityFields';
import { utilityColumns } from './utilities';
import { errorMessage } from '../utils/errorMessage';

const KIND = {
  whole: ['Whole house', 'One household'], room: ['Room', 'One tenant'], bedspace: ['Shared room', 'Several beds'],
} as const;

export function UnitForm({ unit, busy, onSave, onCancel }: {
  unit?: RentalUnit; busy: boolean; onSave: (value: UnitInput) => Promise<void>; onCancel: () => void;
}) {
  const [name, setName] = useState(unit?.name ?? '');
  const [kind, setKind] = useState<UnitInput['kind']>(unit?.kind ?? 'room');
  const [capacity, setCapacity] = useState(String(unit?.capacity ?? 2));
  const [rent, setRent] = useState(centavosToInput(unit?.defaultRentCentavos ?? 0));
  const [extra, setExtra] = useState(centavosToInput(unit?.extraPersonRentCentavos ?? 0));
  const [utilities, setUtilities] = useState<UtilityState>({
    modes: { electric: unit?.electricMode ?? 'none', water: unit?.waterMode ?? 'none' },
    amounts: { electric: centavosToInput(unit?.electricAmountCentavos ?? 0), water: centavosToInput(unit?.waterAmountCentavos ?? 0) },
  });
  const [error, setError] = useState('');

  return <form noValidate className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const result = unitSchema.safeParse({ name, kind, capacity: kind === 'bedspace' ? Number(capacity) : 1,
        defaultRentCentavos: rent.trim() ? parsePesos(rent) : 0,
        extraPersonRentCentavos: kind !== 'bedspace' && extra.trim() ? parsePesos(extra) : 0, ...utilityColumns(utilities) });
      if (!result.success) { setError(result.error.issues[0].message); return; }
      setError('');
      await onSave(result.data);
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="space-y-6">
      <FormSection title="Room">
        <Field id="unit-name" label="Room name" className="sm:col-span-2">
          <input id="unit-name" className={inputClass} value={name} placeholder="Room A" onChange={(event) => setName(event.target.value)} />
        </Field>
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-2 sm:col-span-2">
          {UNIT_KINDS.map((value) => <label key={value} className="flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <input type="radio" name="unit-kind" value={value} checked={kind === value} className="sr-only" onChange={() => setKind(value)} />
            <span className="font-medium">{KIND[value][0]}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">{KIND[value][1]}</span>
          </label>)}
        </div>
        {kind === 'bedspace' && <Field id="unit-capacity" label="Beds">
          <input id="unit-capacity" type="number" min={2} max={50} className={inputClass} value={capacity}
            onChange={(event) => setCapacity(event.target.value)} />
        </Field>}
        <Field id="unit-rent" label="Usual rent" hint={kind === 'bedspace' ? 'per bed, per month' : 'per month'}>
          <MoneyInput id="unit-rent" value={rent} placeholder="Optional" onChange={(event) => setRent(event.target.value)} />
        </Field>
        {kind !== 'bedspace' && <Field id="unit-extra" label="Extra per added person" hint="e.g. 500 if 2 people pay 500 more">
          <MoneyInput id="unit-extra" value={extra} placeholder="Optional" onChange={(event) => setExtra(event.target.value)} />
        </Field>}
      </FormSection>
      <FormSection title="Electricity and water" description="What you charge the tenant on top of rent.">
        <UtilityFields idPrefix="unit" value={utilities} onChange={setUtilities} />
      </FormSection>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <FormActions submit="Save room" onCancel={onCancel} />
    </fieldset>
  </form>;
}
