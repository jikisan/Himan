import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Eye, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatBillPesos, receiptDocument, validateRentalFile } from '@himan/shared/rentals';
import type { ReceiptContext, RentalBill, RentalPayment } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { Field, inputClass } from './Field';
import { errorMessage } from '../utils/errorMessage';
import { METHOD, billName } from '../utils/billingMonth';
import { cn } from '@core/presentation/utils';
import { useFieldErrors } from '@core/presentation/hooks';
import { FormErrorBanner } from '@core/presentation/components';
import { PaperDialog } from './PaperDialog';
import { PdfButton } from './PdfButton';
import { ReceiptPaper } from './ReceiptPaper';

const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');

/**
 * Money received, newest first: what each payment paid, and any credit left over. Managers can void a payment
 * (with a reason) and see or attach proof screenshots; viewers only read. Anyone can download an active payment's receipt
 * when `receipt` gives its context.
 */
export function PaymentsList({ payments, bills, canManage, busy, run, proofUrl, empty, receipt }: {
  payments: RentalPayment[]; bills: RentalBill[]; canManage: boolean; proofUrl: RentalsState['paymentProofUrl']; empty: string;
  receipt?(payment: RentalPayment): ReceiptContext;
} & Pick<RentalsState, 'busy' | 'run'>) {
  const [voiding, setVoiding] = useState<RentalPayment | null>(null);
  if (!payments.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <>
    <ul className="divide-y rounded-lg border text-sm">{payments.map((p) => {
      const isVoid = p.status === 'void';
      const credit = p.amountCentavos - p.allocations.reduce((sum, a) => sum + a.amountCentavos, 0);
      return <li key={p.id} className={cn('space-y-1.5 px-3 py-2.5', isVoid && 'opacity-70')}>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={cn('font-semibold tabular-nums', isVoid && 'line-through')}>{formatBillPesos(p.amountCentavos)}</span>
          <span className="text-muted-foreground">{METHOD[p.method]} · {day(p.paidOn)}{p.reference && ` · Ref ${p.reference}`}</span>
          {isVoid && <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Voided</span>}
        </div>
        {isVoid ? <p className="text-xs text-muted-foreground">Reason: {p.voidReason}</p>
          : <ul className="text-xs text-muted-foreground">
            {p.allocations.map((a) => { const b = bills.find((x) => x.id === a.billId);
              return <li key={a.id}>Paid {formatBillPesos(a.amountCentavos)} of {b ? billName(b) : 'a bill'}</li>; })}
            {credit > 0 && <li>{formatBillPesos(credit)} kept as credit for the next SOA</li>}
          </ul>}
        {p.notes && <p className="whitespace-pre-line text-xs">{p.notes}</p>}
        {canManage && <Proofs payment={p} busy={busy} run={run} proofUrl={proofUrl} />}
        {!isVoid && (receipt || canManage) && <div className="flex justify-end gap-1">
          {receipt && <PdfButton variant="ghost" size="sm" className="h-11 px-2 sm:h-8"
            aria-label={`Receipt PDF for ${formatBillPesos(p.amountCentavos)} on ${day(p.paidOn)}`}
            make={async () => (await import('../pdf/download')).downloadReceiptPdf(p, receipt(p))}>Receipt PDF</PdfButton>}
          {receipt && <PaperDialog variant="ghost" size="sm" className="h-11 px-2 sm:h-8" label="View receipt" title="Receipt"
            description={`${formatBillPesos(p.amountCentavos)} on ${day(p.paidOn)}`}
            aria-label={`View receipt for ${formatBillPesos(p.amountCentavos)} on ${day(p.paidOn)}`}
            make={async () => (await import('../pdf/download')).downloadReceiptPdf(p, receipt(p))}>
            {() => <ReceiptPaper doc={receiptDocument(p, receipt(p))} />}</PaperDialog>}
          {canManage && <Button variant="ghost" size="sm" className="h-11 px-2 text-destructive hover:text-destructive sm:h-8" disabled={busy}
            aria-label={`Void payment of ${formatBillPesos(p.amountCentavos)} on ${day(p.paidOn)}`} onClick={() => setVoiding(p)}>Void</Button>}
        </div>}
      </li>;
    })}</ul>
    <VoidDialog payment={voiding} busy={busy} onClose={() => setVoiding(null)}
      onVoid={async (reason) => { await run({ type: 'voidPayment', id: voiding!.id, reason }); toast.success('Payment voided'); setVoiding(null); }} />
  </>;
}

function Proofs({ payment, busy, run, proofUrl }: { payment: RentalPayment; proofUrl: RentalsState['paymentProofUrl'] } & Pick<RentalsState, 'busy' | 'run'>) {
  return <ProofFiles files={payment.proofs} busy={busy} proofUrl={proofUrl} canAdd={payment.status === 'active'}
    onUpload={(file) => run({ type: 'uploadPaymentProof', paymentId: payment.id, propertyId: payment.propertyId, file })}
    onRemove={(id) => run({ type: 'removePaymentProof', id })} />;
}

type ProofFile = { id: string; name: string; ready: boolean };
type FileInput = { name: string; mimeType: string; bytes: ArrayBuffer };

/** Proof screenshots: view through a short-lived link, remove after a second tap, add more. Managers only. */
export function ProofFiles({ files, busy, proofUrl, canAdd, onUpload, onRemove }: {
  files: ProofFile[]; busy: boolean; proofUrl(id: string): Promise<string>; canAdd: boolean;
  onUpload(file: FileInput): Promise<unknown>; onRemove(id: string): Promise<unknown>;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const open = async (id: string) => {
    const tab = window.open('about:blank', '_blank');
    if (!tab) { toast.error('Allow pop-ups to open this file'); return; }
    tab.opener = null;
    try { tab.location.replace(await proofUrl(id)); } catch (e) { tab.close(); toast.error(errorMessage(e)); }
  };
  const upload = async (chosen: File[]) => {
    try {
      for (const f of chosen) validateRentalFile(f.name, f.type, f.size);
      for (const f of chosen) await onUpload({ name: f.name, mimeType: f.type, bytes: await f.arrayBuffer() });
      if (chosen.length) toast.success(chosen.length === 1 ? 'Proof attached' : `${chosen.length} proofs attached`);
    } catch (e) { toast.error(errorMessage(e)); }
  };
  return <div className="flex flex-wrap items-center gap-1.5">
    <span className="text-xs text-muted-foreground">Proof:</span>
    {files.map((f) => removing === f.id
      ? <span key={f.id} className="flex gap-1">
        <Button variant="destructive" size="sm" className="h-9 sm:h-7" disabled={busy}
          onClick={() => void onRemove(f.id).then(() => toast.success('Proof removed'), (e) => toast.error(errorMessage(e)))
            .finally(() => setRemoving(null))}>Remove</Button>
        <Button variant="outline" size="sm" className="h-9 sm:h-7" onClick={() => setRemoving(null)}>Keep</Button>
      </span>
      : <span key={f.id} className="inline-flex items-center rounded-md border">
        <Button variant="ghost" size="sm" className="h-9 max-w-40 gap-1 px-2 sm:h-7" disabled={!f.ready} aria-label={`View ${f.name}`}
          onClick={() => void open(f.id)}><Eye className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{f.ready ? f.name : 'Upload didn’t finish'}</span></Button>
        <Button variant="ghost" size="icon" className="size-9 text-destructive hover:text-destructive sm:size-7" disabled={busy}
          aria-label={`Remove ${f.name}`} onClick={() => setRemoving(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
      </span>)}
    {canAdd && <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md border border-dashed px-2 text-xs font-medium hover:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:opacity-60 sm:h-7">
      <Upload aria-hidden className="h-3.5 w-3.5" />Add
      <input type="file" className="sr-only" multiple accept="image/jpeg,image/png" disabled={busy} aria-label="Add proof"
        onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ''; }} />
    </label>}
  </div>;
}

function VoidDialog({ payment, busy, onVoid, onClose }: {
  payment: RentalPayment | null; busy: boolean; onVoid(reason: string): Promise<void>; onClose(): void;
}) {
  const [reason, setReason] = useState('');
  const fe = useFieldErrors();
  const close = () => { setReason(''); fe.clear(); onClose(); };
  return <Dialog open={!!payment} onOpenChange={(open) => !open && close()}>
    <DialogContent>
      <form noValidate className="grid gap-4" onSubmit={async (event) => {
        event.preventDefault();
        fe.clear();
        if (!reason.trim()) { fe.fail('void-reason', 'Say why you’re voiding this payment'); return; }
        try { await onVoid(reason.trim()); setReason(''); } catch (e) { fe.setFormError(errorMessage(e)); }
      }}>
        <DialogHeader><DialogTitle>Void this payment?</DialogTitle>
          <DialogDescription>{payment && `${formatBillPesos(payment.amountCentavos)} on ${day(payment.paidOn)}. `}
            The record stays, marked voided. The bills it paid go back to unpaid.</DialogDescription></DialogHeader>
        <FormErrorBanner message={fe.formError} />
        <Field id="void-reason" label="Reason" required error={fe.errors['void-reason']}>
          <textarea id="void-reason" required {...fe.invalid('void-reason')} rows={2} maxLength={300} className={`${inputClass} h-auto py-2`} value={reason}
            placeholder="e.g. Transfer bounced" onChange={(e) => { setReason(e.target.value); fe.clear('void-reason'); }} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={close}>Keep payment</Button>
          <Button type="submit" variant="destructive" className="h-11 sm:h-9" disabled={busy}>Void payment</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
