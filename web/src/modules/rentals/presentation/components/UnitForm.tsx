import { useState } from 'react';
import { centavosToInput, parsePesos, unitSchema, UNIT_KINDS } from '@himan/shared/rentals';
import type { RentalUnit, UnitInput } from '@himan/shared/rentals';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FormErrorBanner } from '@core/presentation/components';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
import { UtilityFields } from './UtilityFields';
import { utilityErrors, utilityFieldId } from './fieldChecks';
import type { UtilityState } from './UtilityFields';
import { utilityColumns } from './utilities';
import { errorMessage } from '../utils/errorMessage';

const KIND = {
  whole: ['Whole house', 'One household'], room: ['Room', 'One tenant'], bedspace: ['Shared room', 'Several beds'],
} as const;
const FIELD: Record<string, string> = { name: 'unit-name', capacity: 'unit-capacity', defaultRentCentavos: 'unit-rent', extraPersonRentCentavos: 'unit-extra' };

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
  const fe = useFieldErrors();
  const text = (fieldId: string, set: (value: string) => void) => (event: { target: { value: string } }) => { set(event.target.value); fe.clear(fieldId); };

  return <form noValidate className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    const bad: [string, string][] = [];
    const pesos = (fieldId: string, value: string) => {
      if (!value.trim()) return 0;
      try { return parsePesos(value); } catch (failure) { bad.push([fieldId, errorMessage(failure)]); return 0; }
    };
    const defaultRentCentavos = pesos('unit-rent', rent);
    const extraPersonRentCentavos = kind !== 'bedspace' ? pesos('unit-extra', extra) : 0;
    bad.push(...utilityErrors('unit', utilities));
    if (bad.length) { fe.failMany(bad); return; }
    const result = unitSchema.safeParse({ name, kind, capacity: kind === 'bedspace' ? Number(capacity) : 1,
      defaultRentCentavos, extraPersonRentCentavos, ...utilityColumns(utilities) });
    if (!result.success) {
      const fields = zodFieldErrors(result.error, ([key]) => FIELD[key as string] ?? utilityFieldId('unit', key));
      if (fields.length) fe.failMany(fields); else fe.setFormError(result.error.issues[0].message);
      return;
    }
    try { await onSave(result.data); } catch (failure) { fe.setFormError(errorMessage(failure)); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-6">
      <FormSection title="Room">
        <Field id="unit-name" label="Room name" className="sm:col-span-2" required error={fe.errors['unit-name']}>
          <input id="unit-name" className={inputClass} value={name} placeholder="Room A" required {...fe.invalid('unit-name')}
            onChange={text('unit-name', setName)} />
        </Field>
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-2 sm:col-span-2">
          {UNIT_KINDS.map((value) => <label key={value} className="flex min-h-11 cursor-pointer flex-col justify-center gap-0.5 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <input type="radio" name="unit-kind" value={value} checked={kind === value} className="sr-only" onChange={() => setKind(value)} />
            <span className="font-medium">{KIND[value][0]}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">{KIND[value][1]}</span>
          </label>)}
        </div>
        {kind === 'bedspace' && <Field id="unit-capacity" label="Beds" required error={fe.errors['unit-capacity']}>
          <input id="unit-capacity" type="number" min={2} max={50} className={inputClass} value={capacity} required {...fe.invalid('unit-capacity')}
            onChange={text('unit-capacity', setCapacity)} />
        </Field>}
        <Field id="unit-rent" label="Usual rent" hint={kind === 'bedspace' ? 'per bed, per month' : 'per month'} error={fe.errors['unit-rent']}>
          <MoneyInput id="unit-rent" value={rent} placeholder="Optional" {...fe.invalid('unit-rent')} onChange={text('unit-rent', setRent)} />
        </Field>
        {kind !== 'bedspace' && <Field id="unit-extra" label="Extra per added person" hint="e.g. 500 if 2 people pay 500 more" error={fe.errors['unit-extra']}>
          <MoneyInput id="unit-extra" value={extra} placeholder="Optional" {...fe.invalid('unit-extra')} onChange={text('unit-extra', setExtra)} />
        </Field>}
      </FormSection>
      <FormSection title="Electricity and water" description="What you charge the tenant on top of rent.">
        <UtilityFields idPrefix="unit" value={utilities} onChange={setUtilities} fe={fe} />
      </FormSection>
      <FormActions submit="Save room" onCancel={onCancel} />
    </fieldset>
  </form>;
}
