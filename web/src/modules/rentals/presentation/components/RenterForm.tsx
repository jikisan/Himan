import { useState } from 'react';
import type { ReactNode } from 'react';
import { renterSchema } from '@himan/shared/rentals';
import type { Renter, RenterInput } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FormErrorBanner } from '@core/presentation/components';
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
  const fe = useFieldErrors();
  const edit = (key: keyof RenterInput, value: string | number) => { setForm((f) => ({ ...f, [key]: value })); fe.clear(`renter-${key}`); };
  const text = (key: TextKey, label: string, autoComplete: string, extra?: { type?: string; placeholder?: string; wide?: boolean; required?: boolean }) =>
    <Field id={`renter-${key}`} label={label} className={extra?.wide ? 'sm:col-span-2' : ''} required={extra?.required} error={fe.errors[`renter-${key}`]}>
      <input id={`renter-${key}`} type={extra?.type ?? 'text'} className={inputClass} autoComplete={autoComplete} required={extra?.required}
        {...fe.invalid(`renter-${key}`)} placeholder={extra?.placeholder} value={form[key]} onChange={(event) => edit(key, event.target.value)} />
    </Field>;
  return <form noValidate className="space-y-6" onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    const result = renterSchema.safeParse(form);
    if (!result.success) { fe.failMany(zodFieldErrors(result.error, ([key]) => `renter-${String(key)}`)); return; }
    try { await onSave(result.data); } catch (failure) { fe.setFormError(errorMessage(failure)); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <fieldset disabled={busy || readOnly} className="space-y-6">
      <FormSection title="Contact">
        {text('fullName', 'Full name', 'name', { wide: true, placeholder: 'Juan Dela Cruz', required: true })}
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
        <Field id="renter-occupants" label="Occupants" error={fe.errors['renter-occupants']}>
          <input id="renter-occupants" type="number" min={1} max={50} className={inputClass} value={form.occupants} {...fe.invalid('renter-occupants')}
            onChange={(event) => edit('occupants', Number(event.target.value))} />
        </Field>
        <Field id="renter-notes" label="Notes" className="sm:col-span-2" error={fe.errors['renter-notes']}>
          <textarea id="renter-notes" className={cn(inputClass, 'h-24 py-2 sm:h-24')} value={form.notes} {...fe.invalid('renter-notes')}
            onChange={(event) => edit('notes', event.target.value)} />
        </Field>
      </FormSection>
      {!readOnly && <FormActions submit="Save tenant" onCancel={onCancel} start={deleteAction} />}
    </fieldset>
  </form>;
}
