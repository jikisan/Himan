import { useId, useRef, useState } from 'react';
import { Copy, FilePlus2, PenLine, Send, Share2, Smartphone, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { contractStatusLabel, contractValues, linkMessage, manilaToday, renderClauses } from '@himan/shared/rentals';
import type { Clause, ContractText, RentalContract, RentalProperty, Renter, SignMode, TenancyLink } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import type { RentalsState } from '../pages/RentalsPage';
import { SIGN_MODES, contractLines, contractPdfData, previewLessee, signModeWords } from '../utils/contract';
import { errorMessage } from '../utils/errorMessage';
import { inputClass } from './Field';
import { ContractPaper } from './ContractPaper';
import { PaperDialog } from './PaperDialog';
import { PdfButton } from './PdfButton';
import { SignaturePad } from './SignaturePad';
import { InPersonSigning } from './InPersonSigning';

export interface ContractInfo { property: RentalProperty; texts: ContractText[]; template: Clause[]; links: TenancyLink[] }

/** The two ways a contract is signed, as radio cards. */
/** `id` goes on the first radio, so a failed submit can focus the choice; `error` shows under it (`${id}-error`). */
export function SignModeChoice({ legend, value, onChange, disabled, className, id: fieldId, error, required }: {
  legend: string; value: SignMode | null; onChange(mode: SignMode): void; disabled?: boolean; className?: string;
  id?: string; error?: string; required?: boolean;
}) {
  const id = useId();
  return <fieldset className={cn('space-y-2', className)}>
    <legend className="mb-2 text-sm font-medium">{legend}{required && <span aria-hidden="true" className="text-destructive"> *</span>}</legend>
    {SIGN_MODES.map(([mode, label, hint], i) => <label key={mode}
      className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3', value === mode && 'border-primary bg-primary/5',
        error && 'border-destructive')}>
      <input type="radio" id={i === 0 ? fieldId : undefined} name={`${id}-mode`} value={mode} checked={value === mode} disabled={disabled}
        className="mt-1 size-4 shrink-0 accent-primary" required={required} aria-invalid={error ? true : undefined}
        aria-describedby={error && fieldId ? `${fieldId}-error` : undefined} onChange={() => onChange(mode)} />
      <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
    </label>)}
    {fieldId && <FieldError id={fieldId} message={error} />}
  </fieldset>;
}

/** The written contract for one tenancy on the tenant sheet: create → send (or sign on this device) → tenant signs → countersign → PDF.
 * `startEditing`: open straight at the new-contract form (the move-in flow's last step). */
export function ContractPanel({ contract, renter, info, canManage, busy, run, startEditing = false }: {
  contract: RentalContract; renter: Renter; info: ContractInfo; canManage: boolean; startEditing?: boolean;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const { property } = info;
  const text = info.texts.find((t) => t.contractId === contract.id);
  const link = info.links.find((l) => l.tenancyId === contract.tenancyId && !l.revokedAt);
  const [editing, setEditing] = useState(startEditing);
  const [inPerson, setInPerson] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null | undefined>(undefined); // undefined = pad closed
  const [replaceScan, setReplaceScan] = useState(false);
  const scanInput = useRef<HTMLInputElement>(null);
  const replaceConfirmed = useRef(false);
  // Stored with the tenant's name and address as placeholders: they are filled in from what the tenant gives when signing.
  const body = () => renderClauses(info.template, contractValues({ property, contract, signingDate: manilaToday() }), { keepLessee: true });
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
    const modeLocked = !!text && text.status !== 'draft';
    if (!editing && !text) return <Button variant="outline" className="h-11 sm:h-9" onClick={() => setEditing(true)}>
      <FilePlus2 className="h-4 w-4" />Create contract</Button>;
    return <ContractEditor initialTerms={text?.specialTerms ?? ''} initialMode={text?.signMode ?? (modeLocked ? null : 'esign')}
      modeLocked={modeLocked}
      preview={previewLessee(body(), renter.fullName, renter.address)} busy={busy} submit={text ? 'Save changes' : 'Save draft'}
      note={text?.status === 'sent' ? 'Your tenant’s page will ask them to reload and read the new version.' : undefined}
      onCancel={() => setEditing(false)}
      onSave={async (specialTerms, signMode) => {
        if (text) await run({ type: 'updateContractText', id: text.id, changes: { body: body(), specialTerms, ...(signMode && { signMode }) } });
        else await run({ type: 'createContractText', contractId: contract.id, propertyId: property.id, body: body(), specialTerms, signMode: signMode ?? 'esign' });
        toast.success(text ? 'Contract saved' : 'Draft saved. Send it when ready.');
        setEditing(false);
      }} />;
  }

  const editable = canManage && (text.status === 'draft' || text.status === 'sent');
  const notarize = text.signMode === 'notarize' && !!text.tenantSignedAt;
  // The saved signature is the owner's: other managers draw their own.
  const saved = property.role === 'owner' && !!property.lessorSignature;
  const pdfData = contractPdfData(text, property, renter);
  const signHere = canManage && (text.status === 'sent' || (text.status === 'draft' && !!text.signMode));
  const downloadPdf = async () => (await import('../pdf/download')).downloadContractPdf(pdfData);
  return <div className="space-y-3">
    <p className="rounded-md bg-muted/50 px-3 py-2 text-sm font-medium" role="status">{contractStatusLabel(text.status, text.signMode)}</p>
    {text.signMode ? <p className="text-xs text-muted-foreground">Signing: {signModeWords(text.signMode)}</p>
      : text.status === 'draft' && canManage && <p className="text-xs text-muted-foreground">Choose how the contract is signed before sending it: tap Edit.</p>}
    {text.notarizedScanPath && <p className="text-xs text-muted-foreground">Notarized copy attached.</p>}
    {signHere && <Button className="h-12 w-full text-base sm:h-10" disabled={busy} onClick={async () => {
      try {
        if (text.status === 'draft') await run({ type: 'sendContract', id: text.id });
        setInPerson(true);
      } catch (e) { fail(e); }
    }}><Smartphone className="h-5 w-5" />Sign on this device</Button>}
    {canManage && <div className="flex flex-wrap gap-2">
      {text.status === 'draft' && <Button className="h-11 sm:h-9" disabled={busy || !text.signMode} onClick={async () => {
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
    {inPerson && <InPersonSigning text={text} renter={renter} property={property} busy={busy} run={run} onClose={() => setInPerson(false)} />}
    <ConfirmDialog open={replaceScan} onOpenChange={setReplaceScan} title="Replace the notarized copy?" confirmText="Choose new file"
      description="The copy you attached before is replaced by the new file." onConfirm={() => { replaceConfirmed.current = true; scanInput.current?.click(); }} />
  </div>;
}

/** `modeLocked`: sent, so the tenant may be reading it; the sign mode is fixed (the database refuses a change). */
function ContractEditor({ initialTerms, initialMode, modeLocked, preview, busy, submit, note, onSave, onCancel }: {
  initialTerms: string; initialMode: SignMode | null; modeLocked: boolean; preview: string[]; busy: boolean; submit: string; note?: string;
  onSave(terms: string, signMode?: SignMode): Promise<void>; onCancel(): void;
}) {
  const [terms, setTerms] = useState(initialTerms);
  const [mode, setMode] = useState(initialMode);
  const fe = useFieldErrors();
  return <div className="space-y-5">
    <FormErrorBanner message={fe.formError} />
    <div className="divide-y [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
    <div>
    <section aria-label="Preview" className="max-h-72 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed [scrollbar-width:thin]">
        {contractLines(preview, terms).map((line, i) => <p key={i}>{line}</p>)}
      </section>
    </div>
    <div className="space-y-1.5">
      <label htmlFor="contract-terms" className="text-sm font-medium">Special terms</label>
      <textarea id="contract-terms" rows={3} maxLength={4000} className={`${inputClass} h-auto py-2`} value={terms}
        placeholder="Anything only for this tenant, e.g. “The storage room is not included.”" onChange={(e) => setTerms(e.target.value)} />
      <p className="text-xs text-muted-foreground">Added as the last clause. Change the other clauses in Edit property → Contract template.</p>
    </div>
    {modeLocked ? mode && <p className="text-xs text-muted-foreground">Signing: {signModeWords(mode)}</p>
      // A legend sits in its fieldset's border box, so the section padding goes on a wrapper.
      : <div><SignModeChoice legend="How is the contract signed?" value={mode} onChange={setMode} disabled={busy} /></div>}
    </div>
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
    <div className="flex justify-end gap-2 pt-1">
      <Button variant="ghost" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
      <Button className="h-11 sm:h-9" disabled={busy} onClick={async () => {
        fe.clear();
        try { await onSave(terms.trim(), modeLocked ? undefined : mode ?? undefined); } catch (e) { fe.setFormError(errorMessage(e)); }
      }}>{submit}</Button>
    </div>
  </div>;
}
