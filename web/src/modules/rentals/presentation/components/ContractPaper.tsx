import { NOTARY_ACKNOWLEDGMENT, renderClauses } from '@himan/shared/rentals';
import type { ContractPdfData } from '../utils/contract';
import { manilaDate } from '../utils/contract';

const muted = 'text-neutral-600';

/**
 * The contract as a white sheet laid out like ContractPdf and made from the same `ContractPdfData`, so what is read here is what
 * downloads. It stays white in dark mode, like paper.
 */
export function ContractPaper({ doc }: { doc: ContractPdfData }) {
  const closing = /^IN WITNESS WHEREOF/i.test(doc.lines.at(-1) ?? '') ? doc.lines.at(-1) : undefined;
  const lines = closing ? doc.lines.slice(0, -1) : doc.lines;
  return <article aria-label="Contract of Lease"
    className="space-y-2 rounded-md border border-neutral-200 bg-white p-5 text-justify text-sm leading-relaxed break-words text-neutral-900 shadow-sm sm:p-8">
    <div className="text-left">
      <p className="font-bold">{doc.lessorName}</p>
      {!!doc.lessorAddress && <p className={muted}>{doc.lessorAddress}</p>}
    </div>
    <h4 className="py-2 text-center text-base font-bold uppercase tracking-wider">Contract of Lease</h4>
    {lines.map((line, i) => <p key={i} className="whitespace-pre-line">{line}</p>)}
    {closing && <p>{closing}</p>}

    <div className="grid grid-cols-2 gap-6 pt-4 text-left sm:gap-8">
      <Signer role="Lessor" name={doc.lessorName} image={doc.lessorSignature} signedAt={doc.lessorSignedAt} />
      <Signer role="Lessee" name={doc.tenantName} image={doc.tenantSignature} signedAt={doc.tenantSignedAt} />
    </div>

    <div className="pt-6 text-left">
      <p className="font-bold">SIGNED IN THE PRESENCE OF:</p>
      <div className="grid grid-cols-2 gap-6 pt-8 sm:gap-8"><span className="border-b border-neutral-400" /><span className="border-b border-neutral-400" /></div>
    </div>

    {doc.contentHash && <p className={`pt-4 text-left text-[11px] ${muted}`}>
      Document fingerprint: {doc.contentHash.slice(0, 12)} (changes if the signed text changes)</p>}

    {doc.signMode === 'notarize' && <div className="mt-6 space-y-2 border-t border-dashed border-neutral-300 pt-6">
      {renderClauses(NOTARY_ACKNOWLEDGMENT, { signing_city: doc.signingCity }).map((line, i) => line === 'ACKNOWLEDGEMENT'
        ? <h5 key={i} className="py-2 text-center text-base font-bold uppercase tracking-wider">{line}</h5>
        : <p key={i} className="whitespace-pre-line">{line}</p>)}
    </div>}
  </article>;
}

function Signer({ role, name, image, signedAt }: { role: string; name: string; image: string | null; signedAt: string | null }) {
  return <div className="min-w-0">
    <div className="flex h-14 items-end">{image && <img src={image} alt={`${role} signature`} className="h-12 max-w-full object-contain object-left" />}</div>
    <div className="border-b border-neutral-400" />
    <p className="font-bold">{name || ' '}</p>
    <p className={muted}>{role.toUpperCase()}</p>
    {signedAt && <p className={`text-[11px] ${muted}`}>Signed online {manilaDate(signedAt)}</p>}
  </div>;
}
