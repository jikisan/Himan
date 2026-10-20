import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Ban, CircleCheck, CircleDashed, Copy, FilePlus2, PenLine, Link2, Send, Smartphone, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BLANK, contractStatusLabel, contractValues, linkMessage, manilaToday, missingContractDetails, renderClauses } from '@himan/shared/rentals';
import type { Clause, ContractText, MissingContractDetail, PropertyInput, RentalContract, RentalProperty, Renter, SignMode, TenancyLink } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import type { RentalsState } from '../pages/RentalsPage';
import { SIGN_MODES, contractLines, contractPdfData, previewLessee, signModeWords } from '../utils/contract';
import { errorMessage } from '../utils/errorMessage';
import { Field, inputClass } from './Field';
import { propertyInput } from './PropertyForm';
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
export function ContractPanel({ contract, renter, info, canManage, busy, run, startEditing = false, onNotNeeded }: {
  contract: RentalContract; renter: Renter; info: ContractInfo; canManage: boolean; startEditing?: boolean;
  /** Shown as "Not needed" until the contract is sent. */
  onNotNeeded?(): void;
} & Pick<RentalsState, 'busy' | 'run'>) {
  // What was just saved in "Fill these in first", until the refetched property has it.
  const [filled, setFilled] = useState<Partial<PropertyInput>>({});
  const property = { ...info.property, ...filled };
  const text = info.texts.find((t) => t.contractId === contract.id);
  const link = info.links.find((l) => l.tenancyId === contract.tenancyId && !l.revokedAt);
  const [editing, setEditing] = useState(startEditing);
  const [filling, setFilling] = useState(false); // "Send" or "Sign on this device" waits for the missing details
  const [inPerson, setInPerson] = useState(false);
  const [choosingMode, setChoosingMode] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null | undefined>(undefined); // undefined = pad closed
  const [replaceScan, setReplaceScan] = useState(false);
  const scanInput = useRef<HTMLInputElement>(null);
  const replaceConfirmed = useRef(false);
  // Stored with the tenant's name and address as placeholders: they are filled in from what the tenant gives when signing.
  const body = () => renderClauses(info.template, contractValues({ property, contract, signingDate: manilaToday() }), { keepLessee: true });
  const fail = (e: unknown) => toast.error(errorMessage(e));
  const notNeededButton = canManage && onNotNeeded ? <Button variant="outline" className="h-11 w-full sm:h-9 sm:w-auto" disabled={busy}
    onClick={onNotNeeded}><Ban className="h-4 w-4" />Not needed for this tenant</Button> : null;

  const missing = canManage ? missingContractDetails(info.template, property) : [];
  // A draft is re-made from the template before it goes out, so details filled in after it was saved are in it.
  const send = async (draft: ContractText) => {
    const fresh = body();
    if (fresh.join('\n') !== draft.body.join('\n')) await run({ type: 'updateContractText', id: draft.id, changes: { body: fresh } });
    await run({ type: 'sendContract', id: draft.id });
  };

  // Reuses the open link; replaces a turned-off one with the same kind; else makes one: "new" asks the tenant for the details
  // we lack (their address goes in the contract), "existing" goes straight to signing.
  const kind = info.links.find((l) => l.tenancyId === contract.tenancyId)?.kind
    ?? (renter.address.trim() && renter.phone.trim() ? 'existing' : 'new');
  const linkToken = async () => token ?? link?.token ?? await run({ type: 'createLink', tenancyId: contract.tenancyId, kind }) as string;
  const message = (t: string) => linkMessage(`${location.origin}/r/${t}`, renter.fullName, kind);
  // "Copy as text": a short note with the link, ready to paste in Messenger; "Copy link": the link alone.
  const copy = async (asText: boolean) => {
    try {
      const t = await linkToken();
      setToken(t);
      await navigator.clipboard.writeText(asText ? message(t) : `${location.origin}/r/${t}`);
      toast.success(asText ? 'Message with the link copied. Paste it in Messenger.' : 'Link copied.');
    } catch (e) { fail(e); }
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
  // Forms open in a dialog over the card; in the move-in flow (already a dialog) they stay inline.
  const inline = startEditing;
  const detailsForm = (editing || filling) && missing.length > 0;
  const modeLocked = !!text && text.status !== 'draft';
  const form = detailsForm
    ? <ContractDetailsForm missing={missing} busy={busy} heading={inline} onCancel={() => { setEditing(false); setFilling(false); }}
      onSave={async (values) => {
        await run({ type: 'saveProperty', id: property.id, input: { ...propertyInput(info.property), ...values } });
        setFilled(values);
        setFilling(false);
      }} />
    : editing ? <ContractEditor initialTerms={text?.specialTerms ?? ''} initialMode={text?.signMode ?? (modeLocked ? null : 'esign')}
      modeLocked={modeLocked}
      preview={previewLessee(body(), renter.fullName, renter.address)} busy={busy} submit={text ? 'Save changes' : 'Save draft'}
      note={text?.status === 'sent' ? 'Your tenant’s page will ask them to reload and read the new version.' : undefined}
      onCancel={() => setEditing(false)}
      onSave={async (specialTerms, signMode) => {
        if (text) await run({ type: 'updateContractText', id: text.id, changes: { body: body(), specialTerms, ...(signMode && { signMode }) } });
        else await run({ type: 'createContractText', contractId: contract.id, propertyId: property.id, body: body(), specialTerms, signMode: signMode ?? 'esign' });
        toast.success(text ? 'Contract saved' : 'Draft saved. Send it when ready.');
        setEditing(false);
      }} /> : null;
  if (inline && form) return form;
  const formDialog = !inline && <Dialog open={!!form} onOpenChange={(open) => { if (!open) { setEditing(false); setFilling(false); } }}>
    <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col gap-4 overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{detailsForm ? 'Fill these in first' : text ? 'Edit contract' : 'New contract'}</DialogTitle>
        <DialogDescription>{detailsForm ? 'They go into every contract for this property, so it has no blank spaces.'
          : `For ${renter.fullName}. Choose how it’s signed, check the wording, then save.`}</DialogDescription>
      </DialogHeader>
      {form}
    </DialogContent>
  </Dialog>;

  if (!text) return <>
    <StatusCard status="No contract yet" next="Write the contract, then send it to the tenant to sign."
      primary={<Button className={PRIMARY} onClick={() => setEditing(true)}><FilePlus2 className="h-5 w-5" />Create contract</Button>}
      notNeeded={notNeededButton} />
    {formDialog}
  </>;

  const editable = canManage && (text.status === 'draft' || text.status === 'sent');
  const notarize = text.signMode === 'notarize' && !!text.tenantSignedAt;
  // The saved signature is the owner's: other managers draw their own.
  const saved = property.role === 'owner' && !!property.lessorSignature;
  const pdfData = contractPdfData(text, property, renter);
  // The tenant's own name and address stay placeholders until they sign, so any blank left is one of ours.
  const blanks = text.status === 'sent' && text.body.some((line) => line.includes(BLANK));
  const downloadPdf = async () => (await import('../pdf/download')).downloadContractPdf(pdfData);
  const sendNow = async () => {
    if (missing.length) return setFilling(true);
    try {
      await send(text);
      setToken(await linkToken());
      toast.success('Contract ready. Copy the link and send it to your tenant.');
    } catch (e) { fail(e); }
  };
  const signOnDevice = <Button variant="outline" className={SECONDARY} disabled={busy} onClick={async () => {
    try {
      if (text.status === 'draft' && missing.length) return setFilling(true);
      if (text.status === 'draft') await send(text);
      setInPerson(true);
    } catch (e) { fail(e); }
  }}><Smartphone className="h-4 w-4" />Sign on this device</Button>;
  const edit = editable && <Button variant="outline" className={SECONDARY} disabled={busy} onClick={() => setEditing(true)}><PenLine className="h-4 w-4" />Edit</Button>;
  const linkOut = text.status === 'sent' || !!token;
  const scanLabel = text.notarizedScanPath ? 'Replace notarized copy' : 'Upload notarized copy';

  // One next step and one main button per stage; everything else is a smaller button under it.
  let next: string | undefined;
  let primary: ReactNode = null;
  let secondary: ReactNode = null;
  if (text.status === 'draft' && !text.signMode) {
    next = 'Choose how the contract is signed, then send it.';
    primary = canManage && <Button className={PRIMARY} disabled={busy} onClick={() => setChoosingMode(true)}><PenLine className="h-5 w-5" />Choose how it’s signed</Button>;
  } else if (text.status === 'draft' && !linkOut) {
    next = 'Send it to the tenant to sign, or sign it together on this device.';
    primary = canManage && <Button className={PRIMARY} disabled={busy} onClick={() => void sendNow()}><Send className="h-5 w-5" />Send to tenant</Button>;
    secondary = canManage && <>{signOnDevice}{edit}</>;
  } else if (linkOut && text.status !== 'signed' && text.status !== 'countersigned') {
    next = 'Send the tenant their link so they can sign.';
    primary = canManage && <Button className={PRIMARY} disabled={busy} onClick={() => void copy(true)}><Copy className="h-5 w-5" />Copy as text</Button>;
    secondary = canManage && <><Button variant="outline" className={SECONDARY} disabled={busy}
      onClick={() => void copy(false)}><Link2 className="h-4 w-4" />Copy link</Button>{signOnDevice}{edit}</>;
  } else if (text.status === 'signed') {
    next = 'The tenant signed. Add your signature to finish.';
    primary = canManage && drawing === undefined && <Button className={PRIMARY} disabled={busy}
      onClick={() => (saved ? void countersign() : setDrawing(null))}><PenLine className="h-5 w-5" />Countersign</Button>;
  } else if (notarize && !text.notarizedScanPath) {
    next = 'Print it, sign it in front of a notary, then upload the notarized copy.';
  }
  const upload_ = notarize && canManage && <label className={cn(text.notarizedScanPath ? SECONDARY : PRIMARY,
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 font-medium focus-within:ring-2 focus-within:ring-ring',
    text.notarizedScanPath ? 'border hover:bg-muted/50' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
    <Upload className="h-4 w-4" />{scanLabel}
    <input ref={scanInput} type="file" aria-label="Upload notarized copy" accept="application/pdf,image/jpeg,image/png" className="sr-only" disabled={busy}
      onClick={(e) => {
        if (text.notarizedScanPath && !replaceConfirmed.current) { e.preventDefault(); setReplaceScan(true); }
        replaceConfirmed.current = false;
      }}
      onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} /></label>;

  return <>
    <StatusCard done={text.status === 'countersigned'} status={contractStatusLabel(text.status, text.signMode)} next={next}
      details={[text.signMode && `Signing: ${signModeWords(text.signMode)}`, text.notarizedScanPath && 'Notarized copy attached'].filter((d): d is string => !!d)}
      warning={blanks && canManage ? 'This contract has blank spaces. Press Edit and Save changes to fill them in.' : undefined}
      primary={primary || (notarize && !text.notarizedScanPath ? upload_ : null)}
      secondary={<>{secondary}{notarize && text.notarizedScanPath && upload_}
        {/* A draft or unsigned contract downloads as an unsigned copy. */}
        <PaperDialog label="View contract" title="Contract of lease" description={contractStatusLabel(text.status, text.signMode)} className={SECONDARY}
          make={downloadPdf}>{() => <ContractPaper doc={pdfData} />}</PaperDialog>
        <PdfButton className={SECONDARY} make={downloadPdf}>Download PDF</PdfButton></>}
      notNeeded={text.status === 'draft' ? notNeededButton : null}>
      {notarize && canManage && <p className="text-xs text-muted-foreground">Notarized copy: PDF, JPEG or PNG, up to 10 MB.</p>}
    </StatusCard>
    {formDialog}
    <Dialog open={drawing !== undefined} onOpenChange={(open) => { if (!open) setDrawing(undefined); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Countersign the contract</DialogTitle>
          <DialogDescription>{property.role === 'owner' ? 'You haven’t saved a signature yet. Sign in the box to countersign.'
            : 'Draw your signature in the box to countersign.'}</DialogDescription>
        </DialogHeader>
        <SignaturePad label="Draw your signature" onChange={setDrawing} disabled={busy} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="h-11 sm:h-9" onClick={() => setDrawing(undefined)}>Cancel</Button>
          <Button className="h-11 sm:h-9" disabled={busy || !drawing} onClick={() => void countersign(drawing!)}><PenLine className="h-4 w-4" />Sign and countersign</Button>
        </div>
      </DialogContent>
    </Dialog>
    {choosingMode && <SignModeDialog busy={busy} onClose={() => setChoosingMode(false)} onSave={async (signMode) => {
      await run({ type: 'updateContractText', id: text.id, changes: { body: body(), signMode } });
      toast.success('Saved. You can send it now.');
      setChoosingMode(false);
    }} />}
    {inPerson && <InPersonSigning text={text} renter={renter} property={property} busy={busy} run={run} onClose={() => setInPerson(false)} />}
    <ConfirmDialog open={replaceScan} onOpenChange={setReplaceScan} title="Replace the notarized copy?" confirmText="Choose new file"
      description="The copy you attached before is replaced by the new file." onConfirm={() => { replaceConfirmed.current = true; scanInput.current?.click(); }} />
  </>;
}

const PRIMARY = 'h-12 w-full text-base sm:h-10 sm:w-auto';
const SECONDARY = 'h-11 sm:h-9';

/** The contract at a glance: where it stands, the one next step and its button, then the smaller actions. */
function StatusCard({ status, next, details = [], warning, done, primary, secondary, notNeeded, children }: {
  status: string; next?: string; details?: string[]; warning?: string; done?: boolean;
  primary?: ReactNode; secondary?: ReactNode; notNeeded?: ReactNode; children?: ReactNode;
}) {
  const Icon = done ? CircleCheck : CircleDashed;
  return <div className="space-y-3 rounded-xl border bg-card p-4">
    <div className="flex items-start gap-2.5">
      <Icon aria-hidden className={cn('mt-0.5 h-5 w-5 shrink-0', done ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')} />
      <div className="min-w-0">
        <p className="font-semibold" role="status">{status}</p>
        {next && <p className="text-sm">{next}</p>}
        {details.map((d) => <p key={d} className="text-xs text-muted-foreground">{d}</p>)}
      </div>
    </div>
    {warning && <p className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">{warning}</p>}
    {primary}
    {children}
    {secondary && <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap [&>*]:w-full [&>*]:px-2 sm:[&>*]:w-auto sm:[&>*]:px-4">{secondary}</div>}
    {notNeeded && <div className="border-t pt-3">{notNeeded}</div>}
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
    {modeLocked ? mode && <p className="text-xs text-muted-foreground">Signing: {signModeWords(mode)}</p>
      // A legend sits in its fieldset's border box, so the section padding goes on a wrapper.
      : <div><SignModeChoice legend="How is the contract signed?" value={mode} onChange={setMode} disabled={busy} /></div>}
    <div>
    <p className="mb-2 text-sm font-medium">Contract preview</p>
    <section aria-label="Preview" className="max-h-80 space-y-2 overflow-y-auto rounded-md border border-neutral-200 bg-white p-4 text-justify text-sm leading-relaxed break-words text-neutral-900 shadow-sm [color-scheme:light] [scrollbar-width:thin] sm:p-6">
        {contractLines(preview, terms).map((line, i) => <p key={i}>{line}</p>)}
      </section>
    </div>
    <div className="space-y-1.5">
      <label htmlFor="contract-terms" className="text-sm font-medium">Special terms</label>
      <textarea id="contract-terms" rows={3} maxLength={4000} className={`${inputClass} h-auto py-2`} value={terms}
        placeholder="Anything only for this tenant, e.g. “The storage room is not included.”" onChange={(e) => setTerms(e.target.value)} />
      <p className="text-xs text-muted-foreground">Added as the last clause. Change the other clauses in Edit property → Contract template.</p>
    </div>
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

const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];

/** The property details the contract would print as blanks, asked for before the editor; saved to the property for every contract. */
function ContractDetailsForm({ missing, busy, heading, onSave, onCancel }: {
  missing: MissingContractDetail[]; busy: boolean; heading: boolean; onSave(values: Partial<PropertyInput>): Promise<void>; onCancel(): void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const fe = useFieldErrors();
  const id = (d: MissingContractDetail) => `contract-detail-${d.field}`;
  return <form noValidate className="space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    fe.clear();
    const empty = missing.filter((d) => !values[d.field]?.trim());
    if (empty.length) return fe.failMany(empty.map((d) => [id(d), 'Fill this in']));
    try { await onSave(Object.fromEntries(missing.map((d) => [d.field, values[d.field].trim()]))); } catch (e) { fe.setFormError(errorMessage(e)); }
  }}>
    <FormErrorBanner message={fe.formError} />
    {heading && <div>
      <h4 className="text-base font-semibold">Fill these in first</h4>
      <p className="text-xs text-muted-foreground">They go into every contract for this property, so it has no blank spaces.</p>
    </div>}
    <fieldset disabled={busy} className="space-y-3">
      {missing.map((d) => {
        const props = { id: id(d), className: inputClass, required: true, value: values[d.field] ?? '', ...fe.invalid(id(d)),
          onChange: (e: { target: { value: string } }) => { setValues((v) => ({ ...v, [d.field]: e.target.value })); fe.clear(id(d)); } };
        return <Field key={d.field} id={id(d)} label={d.label} required error={fe.errors[id(d)]}>
          {d.field === 'lessorCivilStatus'
            ? <select {...props}><option value="">Choose…</option>
              {CIVIL_STATUSES.map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}</select>
            : <input {...props} />}
        </Field>;
      })}
    </fieldset>
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" className="h-11 sm:h-9" onClick={onCancel}>Cancel</Button>
      <Button type="submit" className="h-11 sm:h-9" disabled={busy}>Save and continue</Button>
    </div>
  </form>;
}

/** "Choose how it’s signed": just the two choices, nothing else. */
function SignModeDialog({ busy, onSave, onClose }: { busy: boolean; onSave(mode: SignMode): Promise<void>; onClose(): void }) {
  const [mode, setMode] = useState<SignMode>('esign');
  const fe = useFieldErrors();
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>How is the contract signed?</DialogTitle>
        <DialogDescription>You can’t change this after sending it.</DialogDescription>
      </DialogHeader>
      <FormErrorBanner message={fe.formError} />
      <div><SignModeChoice legend="Choose one" value={mode} onChange={setMode} disabled={busy} /></div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="h-11 sm:h-9" onClick={onClose}>Cancel</Button>
        <Button className="h-11 sm:h-9" disabled={busy} onClick={async () => {
          fe.clear();
          try { await onSave(mode); } catch (e) { fe.setFormError(errorMessage(e)); }
        }}>Save</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
