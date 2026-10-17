import { useState } from 'react';
import type { ReactNode } from 'react';
import { renterSchema } from '@himan/shared/rentals';
import type { Renter, RenterInput } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';
import { Field, FormActions, FormSection, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: RenterInput = { fullName: '', phone: '', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
type TextKey = Exclude<keyof RenterInput, 'occupants' | 'notes'>;

export function RenterForm({ renter, readOnly, busy, onSave, onCancel, deleteAction }: {
  renter?: Renter; readOnly: boolean; busy: boolean; deleteAction?: ReactNode; onSave: (value: RenterInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<RenterInput>(() => renter ? {
    fullName: renter.fullName, phone: renter.phone, facebook: renter.facebook, email: renter.email, address: renter.address,
    emergencyName: renter.emergencyName, emergencyPhone: renter.emergencyPhone, occupants: renter.occupants, notes: renter.notes,
  } : empty);
  const [error, setError] = useState('');
  const text = (key: TextKey, label: string, autoComplete: string, extra?: { type?: string; placeholder?: string; wide?: boolean }) =>
    <Field id={`renter-${key}`} label={label} className={extra?.wide ? 'sm:col-span-2' : ''}>
      <input id={`renter-${key}`} type={extra?.type ?? 'text'} className={inputClass} autoComplete={autoComplete}
        placeholder={extra?.placeholder} value={form[key]} onChange={(event) => setForm((f) => ({ ...f, [key]: event.target.value }))} />
    </Field>;
  return <form noValidate className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    const result = renterSchema.safeParse(form);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try { await onSave(result.data); } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy || readOnly} className="space-y-6">
      <FormSection title="Contact">
        {text('fullName', 'Full name', 'name', { wide: true, placeholder: 'Juan Dela Cruz' })}
        {text('phone', 'Mobile number', 'tel', { type: 'tel', placeholder: '0917 123 4567' })}
        {text('facebook', 'Facebook / Messenger', 'off')}
        {text('email', 'Email', 'email', { type: 'email', wide: true })}
        {text('address', 'Home address', 'street-address', { wide: true })}
      </FormSection>
      <FormSection title="Emergency contact">
        {text('emergencyName', 'Emergency contact name', 'off')}
        {text('emergencyPhone', 'Emergency contact number', 'off', { type: 'tel' })}
      </FormSection>
      <FormSection title="Household">
        <Field id="renter-occupants" label="Occupants">
          <input id="renter-occupants" type="number" min={1} max={50} className={inputClass} value={form.occupants}
            onChange={(event) => setForm((f) => ({ ...f, occupants: Number(event.target.value) }))} />
        </Field>
        <Field id="renter-notes" label="Notes" className="sm:col-span-2">
          <textarea id="renter-notes" className={cn(inputClass, 'h-24 py-2 sm:h-24')} value={form.notes}
            onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))} />
        </Field>
      </FormSection>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!readOnly && <FormActions submit="Save tenant" onCancel={onCancel} start={deleteAction} />}
    </fieldset>
  </form>;
}
