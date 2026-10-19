import { useId, useState } from 'react';
import { canonicalText, resolveLessee, sha256Hex } from '@himan/shared/rentals';
import type { PublicLink, SignMode } from '@himan/shared/rentals';
import { Button } from '@/components/ui/button';
import { LinkRepository } from '../../infrastructure';
import { SignaturePad } from '../components/SignaturePad';
import { SignModeChoice } from '../components/ContractPanel';
import { ContractPaper } from '../components/ContractPaper';
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
    <ContractPaper doc={pdfData(c, data)} />
    <p className="text-sm text-muted-foreground">Something wrong? Tell your landlord.</p>
    {c.status === 'sent'
      ? <SignForm contract={{ ...c, body: resolved(c, data) }} onSign={async (input) => {
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

/** The landlord chooses how it's signed; only contracts sent before that choice existed (sign mode null) let the tenant choose. */
function SignForm({ contract, onSign }: { contract: Contract; onSign(input: SignInput): Promise<void> }) {
  const id = useId();
  const [chosen, setMode] = useState<SignMode | null>(null);
  const mode = contract.signMode ?? chosen;
  const [name, setName] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ready = !!mode && !!name.trim() && !!signature && !busy;
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
    {contract.signMode ? <p className="text-base">{contract.signMode === 'notarize'
      ? 'Your landlord asked you to sign online and then have it notarized.' : 'You can sign online. No notary needed.'}</p>
      : <SignModeChoice legend="How do you want to sign?" value={mode} onChange={setMode} disabled={busy} />}
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

/** The text exactly as the database will sign it: `lessee` filled into the name and address placeholders (a signed text has none left). */
const resolved = (c: Contract, data: PublicLink) => resolveLessee(c.body, data.lessee.name, data.lessee.address);

const pdfData = (c: Contract, data: PublicLink): ContractPdfData => ({
  // Same address as the landlord's PDF (rental_link_get already falls back to the property address).
  lessorName: data.property.lessorName, lessorAddress: data.property.lessorAddress || data.property.address, signingCity: data.property.signingCity,
  lines: contractLines(resolved(c, data), c.specialTerms), signMode: c.signMode, tenantName: c.tenantName || data.tenantName,
  tenantSignature: c.tenantSignature, tenantSignedAt: c.tenantSignedAt, lessorSignature: c.lessorSignature ?? null,
  lessorSignedAt: c.lessorSignedAt ?? null, contentHash: c.contentHash, signedInPerson: c.signedInPerson,
});

function SignedView({ contract: c, data }: { contract: Contract; data: PublicLink }) {
  const pdf = pdfData(c, data);
  return <div className="space-y-4 rounded-xl border bg-card p-4">
    <p role="status" className="text-base font-semibold">{c.status === 'countersigned' ? 'Fully signed' : 'Waiting for your landlord to countersign'}</p>
    <div className="grid gap-4 sm:grid-cols-2">
      <Signed title="You" image={c.tenantSignature} alt="Your signature" name={pdf.tenantName} at={c.tenantSignedAt} />
      {c.lessorSignature && <Signed title="Your landlord" image={c.lessorSignature} alt="Your landlord’s signature" name={data.property.lessorName}
        at={c.lessorSignedAt ?? null} />}
    </div>
    {c.signMode === 'notarize' && <p className="text-sm text-muted-foreground">To be notarized: print the PDF and sign it in front of a notary with your landlord.</p>}
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
