import { useState } from 'react';
import { Link } from 'react-router-dom';
import { manilaToday, propertySchema, LESSOR_CAPACITIES } from '@himan/shared/rentals';
import type { PropertyInput, RentalProperty } from '@himan/shared/rentals';
import { Field, FormActions, FormSection, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: PropertyInput = { name: '', address: '', ownerName: '', ownerAddress: '', lessorName: '',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV' };
type TextKey = Exclude<keyof PropertyInput, 'lessorCapacity'>;
type NameKey = 'ownerName' | 'lessorName';

export function PropertyForm({ property, myName, busy, onSave, onCancel }: {
  property?: RentalProperty; myName: string; busy: boolean; onSave: (value: PropertyInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<PropertyInput>(() => property ? { ...empty, ...pick(property) } : empty);
  // null = not touched yet: new properties default to "me", saved ones to "me" only when the name already matches.
  const [mine, setMine] = useState<Record<NameKey, boolean | null>>({ ownerName: null, lessorName: null });
  const [error, setError] = useState('');
  const isMine = (key: NameKey) => !!myName && (mine[key] ?? (property ? property[key] === myName : true));
  const set = (key: TextKey) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const text = (key: TextKey, label: string, extra?: { hint?: string; placeholder?: string; wide?: boolean }) =>
    <Field id={`property-${key}`} label={label} hint={extra?.hint} className={extra?.wide ? 'sm:col-span-2' : ''}>
      <input id={`property-${key}`} className={inputClass} value={form[key]} placeholder={extra?.placeholder} onChange={set(key)} />
    </Field>;
  const name = (key: NameKey, label: string) => <div className="space-y-2 sm:col-span-2">
    <Field id={`property-${key}`} label={label}>
      <input id={`property-${key}`} className={inputClass} readOnly={isMine(key)}
        value={isMine(key) ? myName : form[key]} onChange={set(key)} />
    </Field>
    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:text-muted-foreground">
      <input type="checkbox" aria-label={`Use my name as ${label.toLowerCase()}`} className="size-4 accent-primary" disabled={!myName} checked={isMine(key)}
        onChange={(event) => {
          const checked = event.target.checked;
          setMine((m) => ({ ...m, [key]: checked }));
          // Unticking hands the field back with my name in it, ready to edit, instead of an empty box.
          if (!checked && !form[key]) setForm((f) => ({ ...f, [key]: myName }));
        }} />
      Use my name
    </label>
  </div>;

  return <form className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    const value = { ...form, ownerName: isMine('ownerName') ? myName : form.ownerName,
      lessorName: isMine('lessorName') ? myName : form.lessorName };
    const result = propertySchema.safeParse(value);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try { await onSave(result.data); } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy} className="space-y-6">
      <FormSection title="Property">
        {text('name', 'Name', { wide: true })}
        {text('address', 'Address', { wide: true })}
      </FormSection>
      <FormSection title="Owner">
        {name('ownerName', 'Owner name')}
        {text('ownerAddress', 'Owner address', { wide: true })}
      </FormSection>
      <FormSection title="Lessor" description="The person who signs contracts with renters.">
        {name('lessorName', 'Lessor name')}
        <Field id="property-capacity" label="Signs as">
          <select id="property-capacity" className={inputClass} value={form.lessorCapacity}
            onChange={(event) => setForm((f) => ({ ...f, lessorCapacity: event.target.value as PropertyInput['lessorCapacity'] }))}>
            {LESSOR_CAPACITIES.map((value) => <option key={value} value={value}>
              {value === 'owner' ? 'Owner' : 'Authorized representative'}</option>)}
          </select>
        </Field>
        {text('lessorCivilStatus', 'Civil status')}
        {text('lessorAddress', 'Lessor address', { hint: 'blank uses your profile', wide: true })}
      </FormSection>
      <FormSection title="Contracts and invoices">
        {text('signingCity', 'Signing city')}
        {text('invoicePrefix', 'Invoice prefix', { hint: `${form.invoicePrefix || 'INV'}-${manilaToday().slice(0, 4)}-0001` })}
      </FormSection>
      {!myName && <p className="text-xs text-muted-foreground">
        Add your full name in <Link to="/profile" className="underline underline-offset-2">Profile</Link> to fill owner and lessor with one tick.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <FormActions submit="Save property" onCancel={onCancel} />
    </fieldset>
  </form>;
}

function pick(p: RentalProperty): PropertyInput {
  return { name: p.name, address: p.address, ownerName: p.ownerName, ownerAddress: p.ownerAddress,
    lessorName: p.lessorName, lessorCivilStatus: p.lessorCivilStatus, lessorAddress: p.lessorAddress,
    lessorCapacity: p.lessorCapacity, signingCity: p.signingCity, invoicePrefix: p.invoicePrefix };
}
