import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { billPrefix, centavosToInput, manilaToday, parsePesos, propertySchema, LESSOR_CAPACITIES } from '@himan/shared/rentals';
import type { PropertyInput, RentalProperty } from '@himan/shared/rentals';
import { Field, FormActions, FormSection, MoneyInput, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: PropertyInput = { name: '', address: '', ownerName: '', ownerAddress: '', lessorName: '',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV',
  lateFeeCentavos: 0, rentDueDay: null };
type TextKey = Exclude<keyof PropertyInput, 'lessorCapacity' | 'lateFeeCentavos' | 'rentDueDay' | 'requireContract'>;
type NameKey = 'ownerName' | 'lessorName';

/** `accounts` is the owner's payment-accounts section, shown after Bills; `contract` (template and signature) follows the contract details. */
export function PropertyForm({ property, myName, busy, onSave, onCancel, accounts, contract }: {
  property?: RentalProperty; myName: string; busy: boolean; onSave: (value: PropertyInput) => Promise<void>; onCancel: () => void;
  accounts?: ReactNode; contract?: ReactNode;
}) {
  const [form, setForm] = useState<PropertyInput>(() => property ? { ...empty, ...pick(property) } : empty);
  // null = not touched yet: new properties default to "me", saved ones to "me" only when the name already matches.
  const [mine, setMine] = useState<Record<NameKey, boolean | null>>({ ownerName: null, lessorName: null });
  const [error, setError] = useState('');
  const [due, setDue] = useState(property?.rentDueDay ? String(property.rentDueDay) : '');
  const [fee, setFee] = useState(centavosToInput(property?.lateFeeCentavos ?? 0));
  // Owner only: the setting is never sent from anyone else's form.
  const isOwner = property?.role === 'owner';
  const [requireContract, setRequireContract] = useState(!!property?.requireContract);
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
    let lateFeeCentavos;
    try { lateFeeCentavos = fee.trim() ? parsePesos(fee) : 0; } catch (failure) { setError(`Late fee: ${errorMessage(failure)}`); return; }
    const value = { ...form, ownerName: isMine('ownerName') ? myName : form.ownerName,
      lessorName: isMine('lessorName') ? myName : form.lessorName, rentDueDay: due.trim() ? Number(due) : null, lateFeeCentavos,
      invoicePrefix: form.invoicePrefix || billPrefix(form.name), ...(isOwner ? { requireContract } : {}) };
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
      <FormSection title="Bills">
        <Field id="property-due" label="Rent is due every" hint="day of the month · blank = move-in day">
          <input id="property-due" type="number" min={1} max={31} className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field id="property-late-fee" label="Late fee" hint="optional">
          <MoneyInput id="property-late-fee" value={fee} placeholder="0.00" onChange={(e) => setFee(e.target.value)} />
        </Field>
        {property && due !== (property.rentDueDay ? String(property.rentDueDay) : '') && <p className="text-xs text-muted-foreground sm:col-span-2">
          New tenants get this date. Change existing tenants on their tenant sheet.</p>}
        {text('invoicePrefix', 'Bill numbers start with', { hint: `${form.invoicePrefix || 'INV'}-${manilaToday().slice(0, 4)}-0001` })}
      </FormSection>
      {accounts}
      {isOwner && <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" checked={requireContract}
          onChange={(e) => setRequireContract(e.target.checked)} />
        <span><span className="block font-medium">Require a signed contract before move-in</span>
          <span className="block text-xs text-muted-foreground">New tenants stay Pending until they sign and you countersign. Their move-in bill is made then.</span></span>
      </label>}
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
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
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
