import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { billPrefix, centavosToInput, manilaToday, parsePesos, propertySchema, LESSOR_CAPACITIES } from '@himan/shared/rentals';
import type { PropertyInput, RentalProperty } from '@himan/shared/rentals';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FormErrorBanner } from '@core/presentation/components';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: PropertyInput = { name: '', address: '', ownerName: '', ownerAddress: '', lessorName: '',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV',
  lateFeeCentavos: 0, rentDueDay: null };
type TextKey = Exclude<keyof PropertyInput, 'lessorCapacity' | 'lateFeeCentavos' | 'rentDueDay'>;
type NameKey = 'ownerName' | 'lessorName';
const FIELD: Record<string, string> = { lessorCapacity: 'property-capacity', lateFeeCentavos: 'property-late-fee', rentDueDay: 'property-due' };
const fieldOf = (key: PropertyKey) => FIELD[key as string] ?? `property-${String(key)}`;

/** `accounts` is the owner's payment-accounts section, shown after Bills; `contract` (template and signature) follows the contract details. */
export function PropertyForm({ property, myName, busy, onSave, onCancel, accounts, contract }: {
  property?: RentalProperty; myName: string; busy: boolean; onSave: (value: PropertyInput) => Promise<void>; onCancel: () => void;
  accounts?: ReactNode; contract?: ReactNode;
}) {
  const [form, setForm] = useState<PropertyInput>(() => property ? { ...empty, ...pick(property) } : empty);
  // null = not touched yet: new properties default to "me", saved ones to "me" only when the name already matches.
  const [mine, setMine] = useState<Record<NameKey, boolean | null>>({ ownerName: null, lessorName: null });
  const fe = useFieldErrors();
  const [due, setDue] = useState(property?.rentDueDay ? String(property.rentDueDay) : '');
  const [fee, setFee] = useState(centavosToInput(property?.lateFeeCentavos ?? 0));
  const isMine = (key: NameKey) => !!myName && (mine[key] ?? (property ? property[key] === myName : true));
  const set = (key: TextKey) => (event: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    fe.clear(`property-${key}`);
  };
  const text = (key: TextKey, label: string, extra?: { hint?: string; placeholder?: string; wide?: boolean; required?: boolean }) =>
    <Field id={`property-${key}`} label={label} hint={extra?.hint} className={extra?.wide ? 'sm:col-span-2' : ''} required={extra?.required}
      error={fe.errors[`property-${key}`]}>
      <input id={`property-${key}`} className={inputClass} value={form[key]} placeholder={extra?.placeholder} required={extra?.required}
        {...fe.invalid(`property-${key}`)} onChange={set(key)} />
    </Field>;
  const name = (key: NameKey, label: string) => <div className="space-y-2 sm:col-span-2">
    <Field id={`property-${key}`} label={label} error={fe.errors[`property-${key}`]}>
      <input id={`property-${key}`} className={inputClass} readOnly={isMine(key)} {...fe.invalid(`property-${key}`)}
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

  return <form noValidate className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    let lateFeeCentavos;
    try { lateFeeCentavos = fee.trim() ? parsePesos(fee) : 0; } catch (failure) { fe.fail('property-late-fee', `Late fee: ${errorMessage(failure)}`); return; }
    const value = { ...form, ownerName: isMine('ownerName') ? myName : form.ownerName,
      lessorName: isMine('lessorName') ? myName : form.lessorName, rentDueDay: due.trim() ? Number(due) : null, lateFeeCentavos,
      invoicePrefix: form.invoicePrefix || billPrefix(form.name) };
    const result = propertySchema.safeParse(value);
    if (!result.success) { fe.failMany(zodFieldErrors(result.error, ([key]) => fieldOf(key))); return; }
    try { await onSave(result.data); } catch (failure) { fe.setFormError(errorMessage(failure)); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy} className="space-y-6">
      <FormSection title="Property">
        {text('name', 'Name', { wide: true, required: true })}
        {text('address', 'Address', { wide: true })}
      </FormSection>
      <FormSection title="Bills">
        <Field id="property-due" label="Rent is due every" hint="day of the month · blank = move-in day" error={fe.errors['property-due']}>
          <input id="property-due" type="number" min={1} max={31} className={inputClass} value={due} {...fe.invalid('property-due')}
            onChange={(e) => { setDue(e.target.value); fe.clear('property-due'); }} />
        </Field>
        <Field id="property-late-fee" label="Late fee" hint="optional" error={fe.errors['property-late-fee']}>
          <MoneyInput id="property-late-fee" value={fee} placeholder="0.00" {...fe.invalid('property-late-fee')}
            onChange={(e) => { setFee(e.target.value); fe.clear('property-late-fee'); }} />
        </Field>
        {property && due !== (property.rentDueDay ? String(property.rentDueDay) : '') && <p className="text-xs text-muted-foreground sm:col-span-2">
          New tenants get this date. Change existing tenants on their tenant sheet.</p>}
        {text('invoicePrefix', 'Bill numbers start with', { hint: `${form.invoicePrefix || 'INV'}-${manilaToday().slice(0, 4)}-0001` })}
      </FormSection>
      {accounts}
      <details open={!!property && hasContractDetails(property)} className="group rounded-lg border p-4 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
          <span><span className="block">Contract details – fill in later</span><span className="block text-xs font-normal text-muted-foreground">Only needed when you print a contract.</span></span>
          <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="mt-5 space-y-6">
          <FormSection title="Owner of the house">
            {name('ownerName', 'Owner name')}
            {text('ownerAddress', 'Owner address', { wide: true })}
          </FormSection>
          <FormSection title="Who signs the contract" description="Usually the owner, or someone they authorized.">
            {name('lessorName', 'Signer’s name')}
            <Field id="property-capacity" label="Signs as">
              <select id="property-capacity" className={inputClass} value={form.lessorCapacity}
                onChange={(event) => setForm((f) => ({ ...f, lessorCapacity: event.target.value as PropertyInput['lessorCapacity'] }))}>
                {LESSOR_CAPACITIES.map((value) => <option key={value} value={value}>
                  {value === 'owner' ? 'The owner' : 'Authorized representative'}</option>)}
              </select>
            </Field>
            {text('lessorCivilStatus', 'Civil status')}
            {text('lessorAddress', 'Signer’s address', { hint: 'blank uses your profile', wide: true })}
          </FormSection>
          <FormSection title="Printing">
            {text('signingCity', 'City where contracts are signed')}
          </FormSection>
        </div>
      </details>
      {contract}
      {!myName && <p className="text-xs text-muted-foreground">
        Add your full name in <Link to="/profile" className="underline underline-offset-2">Profile</Link> to fill the owner and signer with one tick.</p>}
      <FormActions submit="Save property" onCancel={onCancel} />
    </fieldset>
  </form>;
}

const hasContractDetails = (p: RentalProperty) =>
  [p.ownerAddress, p.lessorCivilStatus, p.lessorAddress, p.signingCity].some(Boolean);

function pick(p: RentalProperty): PropertyInput {
  return { name: p.name, address: p.address, ownerName: p.ownerName, ownerAddress: p.ownerAddress,
    lessorName: p.lessorName, lessorCivilStatus: p.lessorCivilStatus, lessorAddress: p.lessorAddress,
    lessorCapacity: p.lessorCapacity, signingCity: p.signingCity, invoicePrefix: p.invoicePrefix,
    lateFeeCentavos: p.lateFeeCentavos, rentDueDay: p.rentDueDay };
}
