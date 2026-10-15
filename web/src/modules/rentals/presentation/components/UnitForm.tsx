import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { centavosToInput, parsePesos, unitSchema, UNIT_KINDS, UTILITY_MODES } from '@himan/shared/rentals';
import type { RentalUnit, UnitInput } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

type Utility = 'electric' | 'water';
const KIND_LABEL = { whole: 'Whole house', room: 'Room', bedspace: 'Bedspace (shared room)' } as const;
const RATE_LABEL = { electric: 'Electricity rate per kWh', water: 'Water rate per m³' } as const;
const FIXED_LABEL = { electric: 'Electricity monthly amount', water: 'Water monthly amount' } as const;

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
          {{ none: 'Not billed', submeter: 'Submeter reading × rate', fixed: 'Fixed monthly amount' }[mode]}</option>)}
      </select>
    </Field>
    {modes[key] !== 'none' && <Field id={`unit-${key}-amount`} label={modes[key] === 'submeter' ? RATE_LABEL[key] : FIXED_LABEL[key]}>
      <input id={`unit-${key}-amount`} inputMode="decimal" className={inputClass} value={amounts[key]}
        onChange={(event) => setAmounts((a) => ({ ...a, [key]: event.target.value }))} />
    </Field>}
  </>;

  return <form className="space-y-4" onSubmit={async (event) => {
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
    <fieldset disabled={busy} className="space-y-4">
      <Field id="unit-name" label="Unit name">
        <input id="unit-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field id="unit-kind" label="Type">
        <select id="unit-kind" className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as UnitInput['kind'])}>
          {UNIT_KINDS.map((value) => <option key={value} value={value}>{KIND_LABEL[value]}</option>)}
        </select>
      </Field>
      {kind === 'bedspace' && <Field id="unit-capacity" label="Beds">
        <input id="unit-capacity" type="number" min={1} max={50} className={inputClass} value={capacity}
          onChange={(event) => setCapacity(event.target.value)} />
      </Field>}
      {utility('electric', 'Electricity')}
      {utility('water', 'Water')}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save unit</Button>
      </div>
    </fieldset>
  </form>;
}
