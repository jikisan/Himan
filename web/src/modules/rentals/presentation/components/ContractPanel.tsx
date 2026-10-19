import { useRef, useState } from 'react';
import { Copy, FilePlus2, PenLine, Send, Share2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { contractStatusLabel, contractValues, linkMessage, manilaToday, renderClauses } from '@himan/shared/rentals';
import type { Clause, ContractText, RentalContract, RentalProperty, Renter, TenancyLink } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { contractLines, contractPdfData } from '../utils/contract';
import { errorMessage } from '../utils/errorMessage';
import { inputClass } from './Field';
import { ContractPaper } from './ContractPaper';
import { PaperDialog } from './PaperDialog';
import { PdfButton } from './PdfButton';
import { SignaturePad } from './SignaturePad';

export interface ContractInfo { property: RentalProperty; texts: ContractText[]; template: Clause[]; links: TenancyLink[] }

/** The written contract for one tenancy on the tenant sheet: create → send → tenant signs → countersign → PDF. */
export function ContractPanel({ contract, renter, info, canManage, busy, run }: {
  contract: RentalContract; renter: Renter; info: ContractInfo; canManage: boolean;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const { property } = info;
  const text = info.texts.find((t) => t.contractId === contract.id);
  const link = info.links.find((l) => l.tenancyId === contract.tenancyId && !l.revokedAt);
  const [editing, setEditing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null | undefined>(undefined); // undefined = pad closed
  const [replaceScan, setReplaceScan] = useState(false);
  const scanInput = useRef<HTMLInputElement>(null);
  const replaceConfirmed = useRef(false);
  const body = () => renderClauses(info.template, contractValues({ property, renter, contract, signingDate: manilaToday() }));
  const fail = (e: unknown) => toast.error(errorMessage(e));

  // Reuses the open link; replaces a turned-off one with the same kind; else makes one (kind "existing": they're already a tenant).
  const kind = info.links.find((l) => l.tenancyId === contract.tenancyId)?.kind ?? 'existing';
  const linkToken = async () => token ?? link?.token ?? await run({ type: 'createLink', tenancyId: contract.tenancyId, kind }) as string;
  const message = (t: string) => linkMessage(`${location.origin}/r/${t}`, renter.fullName, kind);
  const copy = async () => {
    try {
      const t = await linkToken();
      setToken(t);
      await navigator.clipboard.writeText(message(t));
      toast.success('Link copied. Paste it in Messenger.');
    } catch (e) { fail(e); }
  };
  const share = async () => {
    try { await navigator.share({ text: message(await linkToken()) }); } catch (e) { if ((e as Error)?.name !== 'AbortError') fail(e); }
  };
  const countersign = async (signature?: string) => {
    try {
      await run(signature ? { type: 'countersign', id: text!.id, signature } : { type: 'countersign', id: text!.id });
      toast.success('Contract signed by both');
      setDrawing(undefined);
    } catch (e) { fail(e); }
  };
  const upload = async (file: File | undefined) => {
    if (!file || !text) return;
    try {
      await run({ type: 'setNotarizedScan', id: text.id, file: { name: file.name, mimeType: file.type, bytes: await file.arrayBuffer() } });
      toast.success('Notarized copy saved');
    } catch (e) { fail(e); }
  };

  if (!text && !canManage) return <p className="text-sm text-muted-foreground">No written contract yet.</p>;
  if (!text || editing) {
    if (!editing && !text) return <Button variant="outline" className="h-11 sm:h-9" onClick={() => setEditing(true)}>
      <FilePlus2 className="h-4 w-4" />Create contract</Button>;
    return <ContractEditor initialTerms={text?.specialTerms ?? ''} body={body()} busy={busy} submit={text ? 'Save changes' : 'Save draft'}
      note={text?.status === 'sent' ? 'Your tenant’s page will ask them to reload and read the new version.' : undefined}
      onCancel={() => setEditing(false)}
      onSave={async (specialTerms) => {
        if (text) await run({ type: 'updateContractText', id: text.id, changes: { body: body(), specialTerms } });
        else await run({ type: 'createContractText', contractId: contract.id, propertyId: property.id, body: body(), specialTerms });
        toast.success(text ? 'Contract saved' : 'Draft saved. Send it when ready.');
        setEditing(false);
      }} />;
  }

  const editable = canManage && (text.status === 'draft' || text.status === 'sent');
  const notarize = text.signMode === 'notarize' && !!text.tenantSignedAt;
  // The saved signature is the owner's: other managers draw their own.
  const saved = property.role === 'owner' && !!property.lessorSignature;
  const pdfData = contractPdfData(text, property, renter.fullName);
  const downloadPdf = async () => (await import('../pdf/download')).downloadContractPdf(pdfData);
  return <div className="space-y-3">
    <p className="rounded-md bg-muted/50 px-3 py-2 text-sm font-medium" role="status">{contractStatusLabel(text.status, text.signMode)}</p>
    {text.notarizedScanPath && <p className="text-xs text-muted-foreground">Notarized copy attached.</p>}
    {canManage && <div className="flex flex-wrap gap-2">
      {text.status === 'draft' && <Button className="h-11 sm:h-9" disabled={busy} onClick={async () => {
        try {
          await run({ type: 'sendContract', id: text.id });
          setToken(await linkToken());
          toast.success('Contract ready. Copy the link and send it to your tenant.');
        } catch (e) { fail(e); }
      }}><Send className="h-4 w-4" />Send to tenant</Button>}
      {(text.status === 'sent' || token) && <>
        <Button variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => void copy()}><Copy className="h-4 w-4" />Copy link for Messenger</Button>
        {typeof navigator.share === 'function' && <Button variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => void share()}>
          <Share2 className="h-4 w-4" />Share</Button>}
      </>}
      {editable && <Button variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => setEditing(true)}><PenLine className="h-4 w-4" />Edit</Button>}
      {text.status === 'signed' && drawing === undefined && <Button className="h-11 sm:h-9" disabled={busy}
        onClick={() => (saved ? void countersign() : setDrawing(null))}><PenLine className="h-4 w-4" />Countersign</Button>}
      {notarize && <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring sm:min-h-9">
        <Upload className="h-4 w-4" />{text.notarizedScanPath ? 'Replace notarized copy' : 'Upload notarized copy'}
        <input ref={scanInput} type="file" aria-label="Upload notarized copy" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={busy}
          onClick={(e) => {
            if (text.notarizedScanPath && !replaceConfirmed.current) { e.preventDefault(); setReplaceScan(true); }
            replaceConfirmed.current = false;
          }}
          onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
      </label>}
    </div>}
    {notarize && canManage && <p className="text-xs text-muted-foreground">PDF, JPEG or PNG, up to 10 MB.</p>}
    {drawing !== undefined && <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm">{property.role === 'owner' ? 'You haven’t saved a signature yet. Sign here to countersign.' : 'Draw your signature to countersign.'}</p>
      <SignaturePad label="Draw your signature" onChange={setDrawing} disabled={busy} />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="h-11 sm:h-9" onClick={() => setDrawing(undefined)}>Cancel</Button>
        <Button className="h-11 sm:h-9" disabled={busy || !drawing} onClick={() => void countersign(drawing!)}>Sign and countersign</Button>
      </div>
    </div>}
    {/* A draft or unsigned contract downloads as an unsigned copy. */}
    <div className="flex flex-wrap gap-2">
      <PaperDialog label="View contract" title="Contract of lease" description={contractStatusLabel(text.status, text.signMode)} className="h-11 sm:h-9"
        make={downloadPdf}>{() => <ContractPaper doc={pdfData} />}</PaperDialog>
      <PdfButton className="h-11 sm:h-9" make={downloadPdf}>Download PDF</PdfButton>
    </div>
    <ConfirmDialog open={replaceScan} onOpenChange={setReplaceScan} title="Replace the notarized copy?" confirmText="Choose new file"
      description="The copy you attached before is replaced by the new file." onConfirm={() => { replaceConfirmed.current = true; scanInput.current?.click(); }} />
  </div>;
}

function ContractEditor({ initialTerms, body, busy, submit, note, onSave, onCancel }: {
  initialTerms: string; body: string[]; busy: boolean; submit: string; note?: string; onSave(terms: string): Promise<void>; onCancel(): void;
}) {
  const [terms, setTerms] = useState(initialTerms);
  const [error, setError] = useState('');
  return <div className="space-y-3">
    <section aria-label="Preview" className="max-h-72 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed [scrollbar-width:thin]">
      {contractLines(body, terms).map((line, i) => <p key={i}>{line}</p>)}
    </section>
    <div className="space-y-1">
      <label htmlFor="contract-terms" className="text-sm font-medium">Special terms</label>
      <textarea id="contract-terms" rows={3} maxLength={4000} className={`${inputClass} h-auto py-2`} value={terms}
        placeholder="Anything only for this tenant, e.g. “The storage room is not included.”" onChange={(e) => setTerms(e.target.value)} />
      <p className="text-xs text-muted-foreground">Added as the last clause. Change the other clauses in Edit property → Contract template.</p>
    </div>
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex justify-end gap-2">
      <Button variant="ghost" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
      <Button className="h-11 sm:h-9" disabled={busy} onClick={async () => {
        setError('');
        try { await onSave(terms.trim()); } catch (e) { setError(errorMessage(e)); }
      }}>{submit}</Button>
    </div>
  </div>;
}
