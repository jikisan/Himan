import { useId, useState } from 'react';
import { canonicalText, sha256Hex } from '@himan/shared/rentals';
import type { PublicLink, SignMode } from '@himan/shared/rentals';
import { Button } from '@/components/ui/button';
import { cn } from '@core/presentation/utils';
import { LinkRepository } from '../../infrastructure';
import { SignaturePad } from '../components/SignaturePad';
import { PdfButton } from '../components/PdfButton';
import { inputClass } from '../components/Field';
import { contractLines, manilaDate } from '../utils/contract';
import type { ContractPdfData } from '../utils/contract';
import { errorMessage } from '../utils/errorMessage';

const links = new LinkRepository();
type Contract = NonNullable<PublicLink['contract']>;

/** The contract once the landlord has sent it: read, choose how to sign, sign; then the signed view and its PDF. */
export function ContractSection({ token, data, reload }: { token: string; data: PublicLink; reload(): Promise<void> }) {
  const c = data.contract;
  const [notice, setNotice] = useState('');
  if (!c || c.status === 'draft') return <Plain>Your landlord hasn’t sent the contract yet. Check this link again later.</Plain>;
  if (data.kind === 'new' && data.status === 'open') return <Plain>Send your details first, then you can read and sign the contract here.</Plain>;
  return <section aria-labelledby="contract-title" className="space-y-4">
    <h2 id="contract-title" className="text-lg font-semibold">Contract of lease</h2>
    {notice && <p role="status" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-base">{notice}</p>}
    <div className="space-y-3 rounded-xl border bg-card p-4 text-base leading-relaxed break-words">
      {contractLines(c.body, c.specialTerms).map((line, i) => <p key={i} className="whitespace-pre-line">{line}</p>)}
    </div>
    <p className="text-sm text-muted-foreground">Something wrong? Tell your landlord.</p>
    {c.status === 'sent'
      ? <SignForm contract={c} onSign={async (input) => {
        try { await links.sign(token, input); } catch (error) {
          const message = errorMessage(error);
          if (!/contract changed|reload the page/i.test(message)) throw error;
          await reload();
          setNotice('Your landlord updated the contract. Please read it again.');
          return;
        }
        setNotice('');
        await reload();
      }} />
      : <SignedView contract={c} data={data} />}
  </section>;
}

const Plain = ({ children }: { children: React.ReactNode }) => <p className="rounded-xl border bg-card px-4 py-4 text-base">{children}</p>;

type SignInput = { name: string; signMode: SignMode; signature: string; userAgent: string; contentHash: string };

function SignForm({ contract, onSign }: { contract: Contract; onSign(input: SignInput): Promise<void> }) {
  const id = useId();
  const [mode, setMode] = useState<SignMode | null>(null);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = !!mode && !!name.trim() && !!signature && !busy;
  const options: [SignMode, string, string][] = [
    ['esign', 'Sign online only', 'Your drawn signature is enough.'],
    ['notarize', 'Sign online, then notarize', 'You also sign a printed copy in front of a notary.'],
  ];
  return <form className="space-y-4 rounded-xl border bg-card p-4" onSubmit={async (e) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setError('');
    try {
      // The fingerprint of exactly the text on screen; the database refuses it if the landlord changed the contract since.
      const contentHash = await sha256Hex(canonicalText(contract.body, contract.specialTerms));
      await onSign({ name, signMode: mode, signature, userAgent: navigator.userAgent, contentHash });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  }}>
    <h3 className="text-base font-semibold">Sign the contract</h3>
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">How do you want to sign?</legend>
      {options.map(([value, label, hint]) => <label key={value}
        className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3', mode === value && 'border-primary bg-primary/5')}>
        <input type="radio" name={`${id}-mode`} value={value} checked={mode === value} disabled={busy} className="mt-1 size-5 shrink-0"
          onChange={() => setMode(value)} />
        <span><span className="block text-base font-medium">{label}</span><span className="block text-sm text-muted-foreground">{hint}</span></span>
      </label>)}
    </fieldset>
    <div className="space-y-1.5">
      <label htmlFor={`${id}-name`} className="text-sm font-medium">Type your full name</label>
      <input id={`${id}-name`} autoComplete="name" value={name} disabled={busy} className={inputClass} onChange={(e) => setName(e.target.value)} />
    </div>
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Draw your signature</p>
      <SignaturePad label="Your signature" onChange={setSignature} disabled={busy} />
    </div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" className="h-12 w-full text-base" disabled={!ready}>{busy ? 'Signing…' : 'Sign'}</Button>
  </form>;
}

function SignedView({ contract: c, data }: { contract: Contract; data: PublicLink }) {
  const pdf: ContractPdfData = {
    // Same address as the landlord's PDF (rental_link_get already falls back to the property address).
    lessorName: data.property.lessorName, lessorAddress: data.property.lessorAddress || data.property.address, signingCity: data.property.signingCity,
    lines: contractLines(c.body, c.specialTerms), signMode: c.signMode, tenantName: c.tenantName || data.tenantName,
    tenantSignature: c.tenantSignature, tenantSignedAt: c.tenantSignedAt, lessorSignature: c.lessorSignature ?? null,
    lessorSignedAt: c.lessorSignedAt ?? null, contentHash: c.contentHash,
  };
  return <div className="space-y-4 rounded-xl border bg-card p-4">
    <p role="status" className="text-base font-semibold">{c.status === 'countersigned' ? 'Fully signed' : 'Waiting for your landlord to countersign'}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Signed title="You" image={c.tenantSignature} alt="Your signature" name={pdf.tenantName} at={c.tenantSignedAt} />
      {c.lessorSignature && <Signed title="Your landlord" image={c.lessorSignature} alt="Your landlord’s signature" name={data.property.lessorName}
        at={c.lessorSignedAt ?? null} />}
    </div>
    {c.signMode === 'notarize' && <p className="text-sm text-muted-foreground">You chose to notarize: print the PDF and sign it in front of a notary with your landlord.</p>}
    <PdfButton className="h-12 w-full text-base" make={async () => (await import('../pdf/download')).downloadContractPdf(pdf)}>Download PDF</PdfButton>
  </div>;
}

function Signed({ title, image, alt, name, at }: { title: string; image: string | null; alt: string; name: string; at: string | null }) {
  return <div className="space-y-1">
    <p className="text-sm text-muted-foreground">{title}</p>
    {image && <img src={image} alt={alt} className="h-20 w-full rounded-lg border bg-white object-contain" />}
    <p className="text-base font-medium">{name}</p>
    {at && <p className="text-sm text-muted-foreground">Signed {manilaDate(at)}</p>}
  </div>;
}
