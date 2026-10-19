import { useId, useState } from 'react';
import { linkDetailsSchema } from '@himan/shared/rentals';
import type { LinkDetails, PublicLink } from '@himan/shared/rentals';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, fileInputClass, inputClass } from '../components/Field';
import { errorMessage } from '../utils/errorMessage';
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { ABOUT_FIELDS, EMERGENCY_FIELDS, OPTIONAL_FIELDS, PRIVACY_CONSENT } from '../utils/details';
import { LinkRepository } from '../../infrastructure';

const MAX_IDS = 3;
const links = new LinkRepository();

/** The new tenant's part: the details form while the link is open, then where those details stand. */
export function DetailsSection({ token, status, onSent }: { token: string; status: PublicLink['status']; onSent(): Promise<void> }) {
  if (status === 'submitted') return <Note>Thanks, your landlord will review your details.</Note>;
  if (status === 'accepted') return <Note>Your landlord saved your details. Something wrong? Tell your landlord.</Note>;
  return <DetailsForm token={token} onSent={onSent} />;
}

const Note = ({ children }: { children: React.ReactNode }) =>
  <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-base">{children}</p>;

type Upload = { key: number; name: string; state: 'uploading' | 'done' | 'error'; path?: string; error?: string };
function DetailsForm({ token, onSent }: { token: string; onSent(): Promise<void> }) {
  const id = useId();
  const [values, setValues] = useState({ fullName: '', phone: '', address: '', emergencyName: '', emergencyPhone: '', facebook: '', email: '', occupants: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const fe = useFieldErrors();
  const fid = (key: string) => `${id}-${key}`;

  const details: LinkDetails = { ...values, occupants: values.occupants.trim() ? Number(values.occupants) : 1,
    idPaths: uploads.flatMap((u) => (u.path ? [u.path] : [])) };
  const parsed = linkDetailsSchema.safeParse(details);
  const fieldError = (key: string) => (touched[key] && !parsed.success
    ? parsed.error.issues.find((i) => i.path[0] === key)?.message : undefined);
  const uploading = uploads.some((u) => u.state === 'uploading');
  const done = uploads.filter((u) => u.state === 'done').length;

  const choose = async (files: File[]) => {
    for (const file of files.slice(0, MAX_IDS - done)) {
      const key = Math.random();
      setUploads((all) => [...all, { key, name: file.name, state: 'uploading' }]);
      const update = (patch: Partial<Upload>) => setUploads((all) => all.map((u) => (u.key === key ? { ...u, ...patch } : u)));
      try {
        update({ state: 'done', path: await links.uploadId(token, { name: file.name, mimeType: file.type || null, bytes: await file.arrayBuffer() }) });
      } catch (e) { update({ state: 'error', error: errorMessage(e) }); }
    }
  };

  const text = (key: keyof typeof values, label: string, autoComplete: string, type: string, required: boolean) => {
    // A failed Send's message, else the live one once the field was left.
    const message = fe.errors[fid(key)] ?? fieldError(key);
    return <Field key={key} id={fid(key)} label={label} required={required} error={message}>
      <input id={fid(key)} type={type} autoComplete={autoComplete} required={required} value={values[key]} disabled={busy}
        aria-invalid={message ? true : undefined} aria-describedby={message ? `${fid(key)}-error` : undefined} className={inputClass}
        onChange={(e) => { setValues((v) => ({ ...v, [key]: e.target.value })); fe.clear(fid(key)); }}
        onBlur={() => setTouched((t) => ({ ...t, [key]: true }))} />
    </Field>;
  };

  return <form noValidate className="space-y-8 rounded-xl border bg-card p-4 sm:p-6" onSubmit={async (e) => {
    e.preventDefault();
    if (uploading || busy) return;
    fe.clear();
    // Every missing detail at once, each under its field; the first one is focused.
    const bad: [string, string][] = parsed.success ? []
      : zodFieldErrors(parsed.error, ([key]) => fid(key === 'idPaths' ? 'ids' : String(key)));
    if (!agreed) bad.push([fid('agree'), 'Tick the box to agree to the details being stored']);
    if (bad.length || !parsed.success) { fe.failMany(bad); return; }
    setBusy(true);
    try { await links.submitDetails(token, parsed.data); await onSent(); } catch (err) { fe.setFormError(errorMessage(err)); setBusy(false); }
  }}>
    <FormErrorBanner message={fe.formError} />
    <div>
      <h2 className="text-lg font-semibold">Your details</h2>
      <p className="text-sm text-muted-foreground">Your landlord needs these before you move in. You can send them once.</p>
    </div>
    <FieldGroup title="About you">
      {ABOUT_FIELDS.map(([key, label, auto, type]) => text(key, label, auto, type, true))}
    </FieldGroup>
    <FieldGroup title="Emergency contact">
      <div className="grid gap-4 sm:grid-cols-2">{EMERGENCY_FIELDS.map(([key, label, auto, type]) => text(key, label, auto, type, true))}</div>
    </FieldGroup>

    <Field id={fid('ids')} label="Valid ID (photo or PDF, up to 3)" hint="JPEG, PNG or PDF, 10 MB each" required error={fe.errors[fid('ids')]}>
      {done < MAX_IDS && <input id={fid('ids')} type="file" multiple disabled={busy} accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
        className={`${fileInputClass} text-base file:h-12`} required {...fe.invalid(fid('ids'))}
        onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; fe.clear(fid('ids')); void choose(files); }} />}
      {!!uploads.length && <ul aria-live="polite" className="space-y-1 text-sm">
        {uploads.map((u) => <li key={u.key} className={u.state === 'error' ? 'text-destructive' : undefined}>
          {`${u.name} — ${u.state === 'uploading' ? 'Uploading…' : u.state === 'done' ? 'Uploaded' : `${u.error} Try another file.`}`}</li>)}
      </ul>}
    </Field>

    <FieldGroup title="Optional">
      {OPTIONAL_FIELDS.map(([key, label, auto, type]) => text(key, label, auto, type, false))}
      <Field id={fid('occupants')} label="People living there" error={fe.errors[fid('occupants')]}>
        <input id={fid('occupants')} type="number" inputMode="numeric" min={1} max={50} value={values.occupants} disabled={busy} className={inputClass}
          {...fe.invalid(fid('occupants'))} onChange={(e) => { setValues((v) => ({ ...v, occupants: e.target.value })); fe.clear(fid('occupants')); }} />
      </Field>
    </FieldGroup>

    <div className="space-y-1.5">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-base has-[[aria-invalid]]:border-destructive">
        <input id={fid('agree')} type="checkbox" className="mt-1 size-5 shrink-0" checked={agreed} disabled={busy} required {...fe.invalid(fid('agree'))}
          onChange={(e) => { setAgreed(e.target.checked); fe.clear(fid('agree')); }} />
        <span>{PRIVACY_CONSENT}<span aria-hidden="true" className="text-destructive"> *</span></span>
      </label>
      <FieldError id={fid('agree')} message={fe.errors[fid('agree')]} />
    </div>
    {/* On while anything is missing: pressing it takes the tenant to what is. Off only while an ID uploads or it sends. */}
    <Button type="submit" className="h-12 w-full text-base" disabled={uploading || busy}>
      {busy ? 'Sending…' : 'Send my details'}</Button>
  </form>;
}
