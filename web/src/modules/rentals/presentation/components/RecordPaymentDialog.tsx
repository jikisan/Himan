import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { billBalance, formatBillPesos, tenancyOwed } from '@himan/shared/rentals';
import type { PaymentInput, RentalBill, RentalPayment } from '@himan/shared/rentals';
import { Field, inputClass } from './Field';
import { PaymentFields } from './PaymentFields';
import { billName } from '../utils/billingMonth';
import { errorMessage } from '../utils/errorMessage';
import { paymentDraft, readPayment } from '../utils/payment';
import type { Proof } from '../utils/payment';

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
  const owed = tenancyOwed(tenancyId, bills, payments);
  const unpaid = bills.filter((b) => b.tenancyId === tenancyId && b.status === 'issued' && billBalance(b, payments) > 0)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const [draft, setDraft] = useState(() => paymentDraft(owed));
  const [billId, setBillId] = useState(startBill && unpaid.some((b) => b.id === startBill) ? startBill : '');
  const [error, setError] = useState('');

  return <form noValidate className="grid gap-4" onSubmit={async (event) => {
    event.preventDefault();
    try {
      const { input, proofs } = await readPayment(draft, billId || null);
      setError('');
      await onSave(input, proofs);
    } catch (failure) { setError(errorMessage(failure)); }
  }}>
    <DialogHeader><DialogTitle>Record payment</DialogTitle>
      <DialogDescription>Money received from {name}. {owed > 0 ? `They owe ${formatBillPesos(owed)}.` : 'They owe nothing right now.'}</DialogDescription>
    </DialogHeader>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      <PaymentFields value={draft} onChange={setDraft} owed={owed} propertyId={propertyId} payments={payments} nameOf={nameOf}>
        {unpaid.length > 0 && <Field id="pay-bill" label="Pay this bill first" className="sm:col-span-2">
          <select id="pay-bill" className={inputClass} value={billId} onChange={(e) => setBillId(e.target.value)}>
            <option value="">Oldest unpaid bill first</option>
            {unpaid.map((b) => <option key={b.id} value={b.id}>{billName(b)} · {formatBillPesos(billBalance(b, payments))} left</option>)}
          </select>
        </Field>}
      </PaymentFields>
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onClose}>Cancel</Button>
      <Button type="submit" className="h-11 sm:h-9" disabled={busy}>Save payment</Button>
    </div>
  </form>;
}
