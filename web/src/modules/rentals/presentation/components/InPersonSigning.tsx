import { useId, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { canonicalText, inPersonDetailsSchema, resolveLessee, sha256Hex, validateRentalFile } from '@himan/shared/rentals';
import type { ContractText, RentalProperty, Renter } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { contractPdfData, signModeWords } from '../utils/contract';
import { errorMessage } from '../utils/errorMessage';
import { OPTIONAL_FIELDS, PRIVACY_CONSENT, TEXT_FIELDS } from '../utils/details';
import { ContractPaper } from './ContractPaper';
import { Field, inputClass } from './Field';
import { SignaturePad } from './SignaturePad';

const MAX_IDS = 3;
const big = `${inputClass} h-12 text-base sm:h-12 sm:text-base`;
type Screen = 'intro' | 'details' | 'sign' | 'handback' | 'countersign';

/**
 * "Tenant mode" on the owner's phone: the tenant fills in their details, reads the contract with their own name and address in it,
 * and signs; then the owner gets the phone back and countersigns. The sign mode is the owner's stored choice (read-only).
 */
export function InPersonSigning({ text, renter, property, busy, run, onClose }: {
  text: ContractText; renter: Renter; property: RentalProperty; onClose(): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const id = useId();
  const [screen, setScreen] = useState<Screen>('intro');
  const [values, setValues] = useState({ fullName: renter.fullName, phone: renter.phone, address: renter.address, emergencyName: renter.emergencyName,
    emergencyPhone: renter.emergencyPhone, facebook: renter.facebook, email: renter.email, occupants: String(renter.occupants) });
  const [ids, setIds] = useState<File[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [ownSignature, setOwnSignature] = useState<string | null>(null);
  const [error, setError] = useState('');
  const first = values.fullName.trim().split(/\s+/)[0] || renter.fullName;
  // A new ID is needed only when none is on file yet.
  const needsId = renter.files.length === 0;
  const details = inPersonDetailsSchema.safeParse({ ...values, occupants: values.occupants.trim() ? Number(values.occupants) : 1 });
  // Exactly the text on screen: the stored body with the typed name and address filled in.
  const body = resolveLessee(text.body, values.fullName, values.address);
  const saved = property.role === 'owner' && !!property.lessorSignature;
  const go = (next: Screen) => { setError(''); setScreen(next); };

  const next = () => {
    if (!details.success) { setError(details.error.issues[0].message); return; }
    if (needsId && !ids.length) { setError('Add a photo of a valid ID'); return; }
    if (!agreed) { setError('Tick the box to agree to the details being stored'); return; }
    go('sign');
  };
  const sign = async () => {
    if (!details.success || !signature || !name.trim()) return;
    setError('');
    try {
      const contentHash = await sha256Hex(canonicalText(body, text.specialTerms));
      const files = await Promise.all(ids.map(async (f) => ({ name: f.name, mimeType: f.type || null, bytes: await f.arrayBuffer() })));
      const { failed } = await run({ type: 'signInPerson', id: text.id, renterId: renter.id, propertyId: property.id, name, signature,
        contentHash, details: details.data, ids: files }) as { failed: string[] };
      if (failed.length) toast.warning(`Signed, but couldn’t attach ${failed.join(', ')}. Add it from their tenant sheet.`);
      go('handback');
    } catch (e) { setError(errorMessage(e)); }
  };
  const countersign = async (drawn?: string) => {
    setError('');
    try {
      await run(drawn ? { type: 'countersign', id: text.id, signature: drawn } : { type: 'countersign', id: text.id });
      toast.success('Contract signed by both');
      onClose();
    } catch (e) { setError(errorMessage(e)); }
  };

  const titles: Record<Screen, [string, string]> = {
    intro: [`Hand the phone to ${renter.fullName}`, 'They fill in their details, read the contract and sign it here.'],
    details: ['Your details', 'Your landlord needs these for your rental.'],
    sign: ['Read and sign', 'This is your contract with your name and address filled in.'],
    handback: ['Thank you!', `Please give the phone back to ${property.lessorName || 'your landlord'}.`],
    countersign: ['Your signature', `Countersign ${first}’s contract.`],
  };
  const pick = (files: File[]) => {
    setError('');
    const room = MAX_IDS - ids.length;
    try {
      for (const f of files) validateRentalFile(f.name, f.type, f.size);
      if (files.length > room) setError(`Add up to ${MAX_IDS} ID files`);
      setIds((all) => [...all, ...files.slice(0, room)]);
    } catch (e) { setError(errorMessage(e)); }
  };

  return <Dialog open onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="flex h-dvh max-h-dvh w-full max-w-none flex-col gap-5 overflow-y-auto rounded-none p-5 sm:h-auto sm:max-h-[92dvh] sm:max-w-xl sm:rounded-lg">
      <DialogHeader className="pr-8 text-left">
        <DialogTitle className="text-xl">{titles[screen][0]}</DialogTitle>
        <DialogDescription className="text-base">{titles[screen][1]}</DialogDescription>
      </DialogHeader>

      {screen === 'intro' && <>
        <p className="rounded-xl bg-primary/10 px-4 py-3 text-base">{text.signMode && `Signing: ${signModeWords(text.signMode)}. `}
          Your details are saved straight to your record, and the contract shows it was signed in person.</p>
        <Button className="h-12 w-full text-base" onClick={() => go('details')}>Start</Button>
      </>}

      {screen === 'details' && <div className="space-y-4">
        {[...TEXT_FIELDS, ...OPTIONAL_FIELDS].map(([key, label, auto, type]) => <Field key={key} id={`${id}-${key}`} label={label}>
          <input id={`${id}-${key}`} type={type} autoComplete={auto} className={big} value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))} />
        </Field>)}
        <Field id={`${id}-occupants`} label="People living there (optional)">
          <input id={`${id}-occupants`} type="number" inputMode="numeric" min={1} max={50} className={big} value={values.occupants}
            onChange={(e) => setValues((v) => ({ ...v, occupants: e.target.value }))} />
        </Field>
        <Field id={`${id}-ids`} label={`Valid ID (photo or PDF, up to ${MAX_IDS})${needsId ? '' : ' (optional)'}`} hint="JPEG, PNG or PDF, 10 MB each">
          {ids.length < MAX_IDS && <input id={`${id}-ids`} type="file" multiple accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
            className="block w-full text-base file:mr-3 file:h-12 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:text-primary-foreground"
            onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; pick(files); }} />}
          {ids.length > 0 && <ul className="space-y-1 text-base">{ids.map((f, i) => <li key={i} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate">{f.name}</span>
            <Button type="button" variant="ghost" size="icon" className="size-11" aria-label={`Remove ${f.name}`}
              onClick={() => setIds((all) => all.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
          </li>)}</ul>}
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-base">
          <input type="checkbox" className="mt-1 size-5 shrink-0" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>{PRIVACY_CONSENT}</span>
        </label>
        <Button className="h-12 w-full text-base" onClick={next}>Next: read the contract</Button>
      </div>}

      {screen === 'sign' && <div className="space-y-4">
        <ContractPaper doc={contractPdfData({ ...text, body }, property, { fullName: values.fullName, address: values.address })} />
        {text.signMode && <p className="text-base">Signing: {signModeWords(text.signMode)}</p>}
        <Field id={`${id}-name`} label="Type your full name">
          <input id={`${id}-name`} autoComplete="name" className={big} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Draw your signature</p>
          <SignaturePad label="Your signature" onChange={setSignature} disabled={busy} />
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="h-12 text-base sm:flex-1" disabled={busy} onClick={() => go('details')}>Back</Button>
          <Button className="h-12 text-base sm:flex-1" disabled={busy || !signature || !name.trim()} onClick={() => void sign()}>
            {busy ? 'Signing…' : 'Sign'}</Button>
        </div>
      </div>}

      {screen === 'handback' && <Button className="h-12 w-full text-base" onClick={() => go('countersign')}>I’m the owner: countersign</Button>}

      {screen === 'countersign' && <div className="space-y-4">
        {saved && <Button className="h-12 w-full text-base" disabled={busy} onClick={() => void countersign()}>Sign with my saved signature</Button>}
        {saved && <p className="text-center text-sm text-muted-foreground">or draw it</p>}
        <SignaturePad label="Draw your signature" onChange={setOwnSignature} disabled={busy} />
        <Button variant={saved ? 'outline' : 'default'} className="h-12 w-full text-base" disabled={busy || !ownSignature}
          onClick={() => void countersign(ownSignature!)}>Sign and countersign</Button>
        <Button variant="ghost" className="h-12 w-full text-base" onClick={onClose}>Countersign later</Button>
      </div>}

      {error && <p role="alert" className="text-base text-destructive">{error}</p>}
    </DialogContent>
  </Dialog>;
}
