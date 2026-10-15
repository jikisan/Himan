import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { propertySchema, LESSOR_CAPACITIES } from '@himan/shared/rentals';
import type { PropertyInput, RentalProperty } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: PropertyInput = { name: '', address: '', ownerName: '', ownerAddress: '', lessorName: '',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV' };
const TEXT_FIELDS: [keyof PropertyInput, string, string?][] = [
  ['name', 'Property name'], ['address', 'Property address'], ['ownerName', 'Owner name', 'if not you'],
  ['ownerAddress', 'Owner address'], ['lessorName', 'Lessor name', 'blank uses your profile'],
  ['lessorCivilStatus', 'Lessor civil status'], ['lessorAddress', 'Lessor address'],
  ['signingCity', 'City where contracts are signed'], ['invoicePrefix', 'Invoice prefix'],
];

export function PropertyForm({ property, busy, onSave, onCancel }: {
  property?: RentalProperty; busy: boolean; onSave: (value: PropertyInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<PropertyInput>(() => property ? { ...empty, ...pick(property) } : empty);
  const [error, setError] = useState('');
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    const result = propertySchema.safeParse(form);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try { await onSave(result.data); } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="space-y-4">
      {TEXT_FIELDS.map(([key, label, hint]) => <Field key={key} id={`property-${key}`} label={label} hint={hint}>
        <input id={`property-${key}`} className={inputClass} value={form[key]}
          onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))} />
      </Field>)}
      <Field id="property-capacity" label="Lessor signs as">
        <select id="property-capacity" className={inputClass} value={form.lessorCapacity}
          onChange={(event) => setForm((previous) => ({ ...previous, lessorCapacity: event.target.value as PropertyInput['lessorCapacity'] }))}>
          {LESSOR_CAPACITIES.map((value) => <option key={value} value={value}>
            {value === 'owner' ? 'Owner' : 'Authorized representative of the owner'}</option>)}
        </select>
      </Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save property</Button>
      </div>
    </fieldset>
  </form>;
}

function pick(p: RentalProperty): PropertyInput {
  return { name: p.name, address: p.address, ownerName: p.ownerName, ownerAddress: p.ownerAddress,
    lessorName: p.lessorName, lessorCivilStatus: p.lessorCivilStatus, lessorAddress: p.lessorAddress,
    lessorCapacity: p.lessorCapacity, signingCity: p.signingCity, invoicePrefix: p.invoicePrefix };
}
