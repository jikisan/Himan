import { useState } from 'react';
import { centavosToInput, parsePesos, unitSchema, UNIT_KINDS, UTILITY_MODES } from '@himan/shared/rentals';
import type { RentalUnit, UnitInput } from '@himan/shared/rentals';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

type Utility = 'electric' | 'water';
const KIND = {
  whole: ['Whole house', 'One renter household'], room: ['Room', 'One renter per room'], bedspace: ['Bedspace', 'Several beds, one room'],
} as const;
const RATE_LABEL = { electric: 'Electricity rate per kWh', water: 'Water rate per m³' } as const;
const FIXED_LABEL = { electric: 'Electricity per month', water: 'Water per month' } as const;

export function UnitForm({ unit, busy, onSave, onCancel }: {
  unit?: RentalUnit; busy: boolean; onSave: (value: UnitInput) => Promise<void>; onCancel: () => void;
}) {
  const [name, setName] = useState(unit?.name ?? '');
  const [kind, setKind] = useState<UnitInput['kind']>(unit?.kind ?? 'room');
  const [capacity, setCapacity] = useState(String(unit?.capacity ?? 1));
  const [modes, setModes] = useState({ electric: unit?.electricMode ?? 'none', water: unit?.waterMode ?? 'none' });
  const [amounts, setAmounts] = useState({ electric: centavosToInput(unit?.electricAmountCentavos ?? 0),
    water: centavosToInput(unit?.waterAmountCentavos ?? 0) });
  const [error, setError] = useState('');

  const utility = (key: Utility, label: string) => <>
    <Field id={`unit-${key}`} label={label}>
      <select id={`unit-${key}`} className={inputClass} value={modes[key]}
        onChange={(event) => setModes((m) => ({ ...m, [key]: event.target.value as UnitInput['electricMode'] }))}>
        {UTILITY_MODES.map((mode) => <option key={mode} value={mode}>
          {{ none: 'Not billed', submeter: 'Submeter × rate', fixed: 'Fixed monthly' }[mode]}</option>)}
      </select>
    </Field>
    {modes[key] === 'none' ? <div className="hidden sm:block" />
      : <Field id={`unit-${key}-amount`} label={modes[key] === 'submeter' ? RATE_LABEL[key] : FIXED_LABEL[key]}>
        <MoneyInput id={`unit-${key}-amount`} value={amounts[key]} placeholder="0.00"
          onChange={(event) => setAmounts((a) => ({ ...a, [key]: event.target.value }))} />
      </Field>}
  </>;

  return <form className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const amount = (key: Utility) => (modes[key] === 'none' ? 0 : parsePesos(amounts[key]));
      const result = unitSchema.safeParse({ name, kind, capacity: kind === 'bedspace' ? Number(capacity) : 1,
        electricMode: modes.electric, electricAmountCentavos: amount('electric'),
        waterMode: modes.water, waterAmountCentavos: amount('water') });
      if (!result.success) { setError(result.error.issues[0].message); return; }
      setError('');
      await onSave(result.data);
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="space-y-6">
      <FormSection title="Unit">
        <Field id="unit-name" label="Unit name" className="sm:col-span-2">
          <input id="unit-name" className={inputClass} value={name} placeholder="Room A" onChange={(event) => setName(event.target.value)} />
        </Field>
        <div role="radiogroup" aria-label="Type" className="grid grid-cols-3 gap-2 sm:col-span-2">
          {UNIT_KINDS.map((value) => <label key={value} className="flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
            <input type="radio" name="unit-kind" value={value} checked={kind === value} className="sr-only"
              onChange={() => setKind(value)} />
            <span className="font-medium">{KIND[value][0]}</span>
            <span className="hidden text-xs text-muted-foreground sm:block">{KIND[value][1]}</span>
          </label>)}
        </div>
        {kind === 'bedspace' && <Field id="unit-capacity" label="Beds">
          <input id="unit-capacity" type="number" min={1} max={50} className={inputClass} value={capacity}
            onChange={(event) => setCapacity(event.target.value)} />
        </Field>}
      </FormSection>
      <FormSection title="Utilities" description="What you charge the renter, not the provider’s rate.">
        {utility('electric', 'Electricity')}
        {utility('water', 'Water')}
      </FormSection>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <FormActions submit="Save unit" onCancel={onCancel} />
    </fieldset>
  </form>;
}
