import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PAYMENT_METHODS, billBalance, centavosToInput, findDuplicateReference, formatBillPesos, manilaToday, parsePesos, paymentSchema,
  tenancyOwed, validateRentalFile } from '@himan/shared/rentals';
import type { PaymentInput, PaymentMethod, RentalBill, RentalPayment } from '@himan/shared/rentals';
import { Field, MoneyInput, inputClass } from './Field';
import { METHOD, billName } from '../utils/billingMonth';
import { errorMessage } from '../utils/errorMessage';

type Proof = { name: string; mimeType: string; bytes: ArrayBuffer };

/** "Record payment" for one tenant; amount starts at what they still owe. `billId` pre-picks the bill to pay first. */
export function RecordPaymentDialog({ target, name, nameOf, propertyId, bills, payments, busy, onSave, onClose }: {
  target: { tenancyId: string; billId?: string } | null; name: string; nameOf(tenancyId: string): string; propertyId: string;
  bills: RentalBill[]; payments: RentalPayment[]; busy: boolean; onSave(input: PaymentInput, proofs: Proof[]): Promise<void>; onClose(): void;
}) {
  return <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
      {target && <PaymentForm key={`${target.tenancyId}:${target.billId ?? ''}`} {...target} name={name} nameOf={nameOf} propertyId={propertyId}
        bills={bills} payments={payments} busy={busy} onSave={onSave} onClose={onClose} />}
    </DialogContent>
  </Dialog>;
}

function PaymentForm({ tenancyId, billId: startBill, name, nameOf, propertyId, bills, payments, busy, onSave, onClose }: {
  tenancyId: string; billId?: string; name: string; nameOf(tenancyId: string): string; propertyId: string; bills: RentalBill[];
  payments: RentalPayment[]; busy: boolean; onSave(input: PaymentInput, proofs: Proof[]): Promise<void>; onClose(): void;
}) {
  const today = manilaToday();
  const owed = tenancyOwed(tenancyId, bills, payments);
  const unpaid = bills.filter((b) => b.tenancyId === tenancyId && b.status === 'issued' && billBalance(b, payments) > 0)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const [amount, setAmount] = useState(centavosToInput(owed));
  const [method, setMethod] = useState<PaymentMethod>('gcash');
  const [reference, setReference] = useState('');
  const [paidOn, setPaidOn] = useState(today);
  const [notes, setNotes] = useState('');
  const [billId, setBillId] = useState(startBill && unpaid.some((b) => b.id === startBill) ? startBill : '');
  const [proofs, setProofs] = useState<File[]>([]);
  const [error, setError] = useState('');
  const duplicate = findDuplicateReference(payments, propertyId, reference);
  let extra = 0;
  try { extra = amount.trim() ? parsePesos(amount) - owed : 0; } catch { /* shown on save */ }

  return <form noValidate className="grid gap-4" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const result = paymentSchema.safeParse({ amountCentavos: amount.trim() ? parsePesos(amount) : 0, paidOn, method, reference, notes, billId: billId || null });
      if (!result.success) { setError(result.error.issues[0].message); return; }
      if (result.data.paidOn > today) { setError('The payment date can’t be in the future'); return; }
      for (const f of proofs) validateRentalFile(f.name, f.type, f.size);
      setError('');
      await onSave(result.data, await Promise.all(proofs.map(async (f) => ({ name: f.name, mimeType: f.type, bytes: await f.arrayBuffer() }))));
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <DialogHeader><DialogTitle>Record payment</DialogTitle>
      <DialogDescription>Money received from {name}. {owed > 0 ? `They owe ${formatBillPesos(owed)}.` : 'They owe nothing right now.'}</DialogDescription>
    </DialogHeader>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      <Field id="pay-amount" label="Amount">
        <MoneyInput id="pay-amount" value={amount} placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field id="pay-date" label="Date paid">
        <input id="pay-date" type="date" max={today} className={inputClass} value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
      </Field>
      {extra > 0 && <p className="text-sm text-muted-foreground sm:col-span-2">
        {formatBillPesos(extra)} more than they owe. The extra is kept as credit and pays their next SOA.</p>}
      <Field id="pay-method" label="How they paid">
        <select id="pay-method" className={inputClass} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD[m]}</option>)}
        </select>
      </Field>
      <Field id="pay-reference" label="Reference no." hint="optional">
        <input id="pay-reference" className={inputClass} value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} />
      </Field>
      {duplicate && <p role="status" className="rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 sm:col-span-2">
        This reference no. was already used on a {formatBillPesos(duplicate.amountCentavos)} payment from {nameOf(duplicate.tenancyId)} on{' '}
        {format(parseISO(duplicate.paidOn), 'MMM d')}. Check it isn’t the same payment.</p>}
      {unpaid.length > 0 && <Field id="pay-bill" label="Pay this bill first" className="sm:col-span-2">
        <select id="pay-bill" className={inputClass} value={billId} onChange={(e) => setBillId(e.target.value)}>
          <option value="">Oldest unpaid bill first</option>
          {unpaid.map((b) => <option key={b.id} value={b.id}>{billName(b)} · {formatBillPesos(billBalance(b, payments))} left</option>)}
        </select>
      </Field>}
      <Field id="pay-notes" label="Notes" hint="optional" className="sm:col-span-2">
        <textarea id="pay-notes" rows={2} maxLength={500} className={`${inputClass} h-auto py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="space-y-2 sm:col-span-2">
        <Field id="pay-proofs" label="Proof of payment" hint="screenshots, optional">
          <input id="pay-proofs" type="file" multiple accept="image/jpeg,image/png"
            className="block w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border file:bg-background file:px-3 file:text-sm file:font-medium"
            onChange={(e) => { const chosen = [...(e.target.files ?? [])]; setProofs((p) => [...p, ...chosen]); e.target.value = ''; }} />
        </Field>
        {proofs.length > 0 && <ul className="space-y-1 text-sm">{proofs.map((f, i) => <li key={i} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate">{f.name}</span>
          <Button type="button" variant="ghost" size="icon" className="size-11 sm:size-8" aria-label={`Remove ${f.name}`}
            onClick={() => setProofs((p) => p.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
        </li>)}</ul>}
      </div>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onClose}>Cancel</Button>
      <Button type="submit" className="h-11 sm:h-9" disabled={busy}>Save payment</Button>
    </div>
  </form>;
}
