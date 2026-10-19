import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PAYMENT_METHODS, findDuplicateReference, formatBillPesos, manilaToday, parsePesos } from '@himan/shared/rentals';
import type { PaymentMethod, RentalPayment } from '@himan/shared/rentals';
import { Field, MoneyInput, inputClass } from './Field';
import { METHOD } from '../utils/billingMonth';
import type { PaymentDraft } from '../utils/payment';

/** Amount, date, method, reference (with a duplicate warning), notes and proof screenshots. `owed`: an amount above it is shown as credit.
 * `children` go after the reference (e.g. a bill picker). */
export function PaymentFields({ value, onChange, owed, propertyId, payments, nameOf, children }: {
  value: PaymentDraft; onChange(next: PaymentDraft): void; owed: number; propertyId: string; payments: RentalPayment[];
  nameOf(tenancyId: string): string; children?: ReactNode;
}) {
  const set = <K extends keyof PaymentDraft>(key: K, v: PaymentDraft[K]) => onChange({ ...value, [key]: v });
  const duplicate = findDuplicateReference(payments, propertyId, value.reference);
  let extra = 0;
  try { extra = value.amount.trim() ? parsePesos(value.amount) - owed : 0; } catch { /* shown on save */ }
  return <>
    <Field id="pay-amount" label="Amount">
      <MoneyInput id="pay-amount" value={value.amount} placeholder="0.00" onChange={(e) => set('amount', e.target.value)} />
    </Field>
    <Field id="pay-date" label="Date paid">
      <input id="pay-date" type="date" max={manilaToday()} className={inputClass} value={value.paidOn} onChange={(e) => set('paidOn', e.target.value)} />
    </Field>
    {extra > 0 && <p className="text-sm text-muted-foreground sm:col-span-2">
      {formatBillPesos(extra)} more than they owe. The extra is kept as credit and pays their next SOA.</p>}
    <Field id="pay-method" label="How they paid">
      <select id="pay-method" className={inputClass} value={value.method} onChange={(e) => set('method', e.target.value as PaymentMethod)}>
        {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{METHOD[m]}</option>)}
      </select>
    </Field>
    <Field id="pay-reference" label="Reference no." hint="optional">
      <input id="pay-reference" className={inputClass} value={value.reference} maxLength={80} onChange={(e) => set('reference', e.target.value)} />
    </Field>
    {duplicate && <p role="status" className="rounded-md bg-amber-500/15 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 sm:col-span-2">
      This reference no. was already used on a {formatBillPesos(duplicate.amountCentavos)} payment from {nameOf(duplicate.tenancyId)} on{' '}
      {format(parseISO(duplicate.paidOn), 'MMM d')}. Check it isn’t the same payment.</p>}
    {children}
    <Field id="pay-notes" label="Notes" hint="optional" className="sm:col-span-2">
      <textarea id="pay-notes" rows={2} maxLength={500} className={`${inputClass} h-auto py-2`} value={value.notes} onChange={(e) => set('notes', e.target.value)} />
    </Field>
    <div className="space-y-2 sm:col-span-2">
      <Field id="pay-proofs" label="Proof of payment" hint="screenshots, optional">
        <input id="pay-proofs" type="file" multiple accept="image/jpeg,image/png"
          className="block w-full text-sm file:mr-3 file:h-10 file:rounded-lg file:border file:bg-background file:px-3 file:text-sm file:font-medium"
          onChange={(e) => { const chosen = [...(e.target.files ?? [])]; set('proofs', [...value.proofs, ...chosen]); e.target.value = ''; }} />
      </Field>
      {value.proofs.length > 0 && <ul className="space-y-1 text-sm">{value.proofs.map((f, i) => <li key={i} className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate">{f.name}</span>
        <Button type="button" variant="ghost" size="icon" className="size-11 sm:size-8" aria-label={`Remove ${f.name}`}
          onClick={() => set('proofs', value.proofs.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
      </li>)}</ul>}
    </div>
  </>;
}
