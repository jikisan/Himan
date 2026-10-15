import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { renterSchema } from '@himan/shared/rentals';
import type { Renter, RenterInput } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';

const empty: RenterInput = { fullName: '', phone: '', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
const TEXT: [Exclude<keyof RenterInput, 'occupants' | 'notes'>, string, string][] = [
  ['fullName', 'Full name', 'name'], ['phone', 'Mobile number', 'tel'], ['facebook', 'Facebook / Messenger', 'off'],
  ['email', 'Email', 'email'], ['address', 'Home address', 'street-address'],
  ['emergencyName', 'Emergency contact name', 'off'], ['emergencyPhone', 'Emergency contact number', 'off'],
];

export function RenterForm({ renter, readOnly, busy, onSave, onCancel }: {
  renter?: Renter; readOnly: boolean; busy: boolean; onSave: (value: RenterInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<RenterInput>(() => renter ? {
    fullName: renter.fullName, phone: renter.phone, facebook: renter.facebook, email: renter.email, address: renter.address,
    emergencyName: renter.emergencyName, emergencyPhone: renter.emergencyPhone, occupants: renter.occupants, notes: renter.notes,
  } : empty);
  const [error, setError] = useState('');
  return <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    const result = renterSchema.safeParse(form);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError('');
    try { await onSave(result.data); } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <fieldset disabled={busy || readOnly} className="space-y-4">
      {TEXT.map(([key, label, autoComplete]) => <Field key={key} id={`renter-${key}`} label={label}>
        <input id={`renter-${key}`} className={inputClass} autoComplete={autoComplete} value={form[key]}
          onChange={(event) => setForm((f) => ({ ...f, [key]: event.target.value }))} />
      </Field>)}
      <Field id="renter-occupants" label="Occupants">
        <input id="renter-occupants" type="number" min={1} max={50} className={inputClass} value={form.occupants}
          onChange={(event) => setForm((f) => ({ ...f, occupants: Number(event.target.value) }))} />
      </Field>
      <Field id="renter-notes" label="Notes">
        <textarea id="renter-notes" className={`${inputClass} h-24 py-2`} value={form.notes}
          onChange={(event) => setForm((f) => ({ ...f, notes: event.target.value }))} />
      </Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!readOnly && <div className="flex justify-end gap-3 border-t pt-5">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save renter</Button>
      </div>}
    </fieldset>
  </form>;
}
