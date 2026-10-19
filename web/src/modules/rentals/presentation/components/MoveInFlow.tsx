import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DEFAULT_CLAUSES, formatBillPesos, formatPesos, proratedRent, receiptDocument } from '@himan/shared/rentals';
import type { ReceiptContext, RentalPayment, RentalProperty, RentalUnit, Renter } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';
import type { RentalsState } from '../pages/RentalsPage';
import { errorMessage } from '../utils/errorMessage';
import { paymentDraft, readPayment } from '../utils/payment';
import { AddTenantForm } from './AddTenantForm';
import type { MoveInDraft } from './AddTenantForm';
import { ContractPanel } from './ContractPanel';
import { PaperDialog } from './PaperDialog';
import { PaymentFields } from './PaymentFields';
import { ReceiptPaper } from './ReceiptPaper';

const STEPS = ['Add tenant', 'Pay', 'Contract'];
type Saved = { renterId: string; tenancyId: string; paymentId: string | null };

/** The move-in bill `rental_start_tenancy` issues: rent for the days before the first due date, advance × rent, deposit. */
function moveInLines({ moveIn, terms: t }: MoveInDraft): [string, number][] {
  const days = proratedRent(t.monthlyRentCentavos, moveIn, t.dueDay);
  return [
    ...(days && days.amount > 0 ? [[`Rent for ${days.days} day${days.days === 1 ? '' : 's'}`, days.amount] as [string, number]] : []),
    ...(t.advanceMonths > 0 ? [[`Advance · ${t.advanceMonths} month${t.advanceMonths === 1 ? '' : 's'}`, t.monthlyRentCentavos * t.advanceMonths] as [string, number]] : []),
    ...(t.depositCentavos > 0 ? [['Deposit', t.depositCentavos] as [string, number]] : []),
  ];
}

/**
 * Add tenant → Pay → Contract in one dialog. Step 1 only checks the input; step 2 saves the person, the move-in, its bill and the payment
 * in one go (or without a payment); step 3 is the contract, which can wait. Closing before anything is saved asks first.
 */
export function MoveInFlow({ property, unit, renters, others, state, receipt, onClose }: {
  property: RentalProperty; unit: RentalUnit; renters: Renter[]; others: { renter: Renter; propertyName: string }[];
  state: RentalsState; receipt(payment: RentalPayment): ReceiptContext; onClose(): void;
}) {
  const { busy, run } = state;
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<MoveInDraft | null>(null);
  const [pay, setPay] = useState(() => paymentDraft(0));
  const [saved, setSaved] = useState<Saved | null>(null);
  const [error, setError] = useState('');
  const [discarding, setDiscarding] = useState(false);
  const close = () => (saved ? onClose() : setDiscarding(true));
  const nameOf = (tenancyId: string) =>
    state.renters.find((r) => r.id === state.tenancies.find((t) => t.id === tenancyId)?.renterId)?.fullName ?? 'Tenant';
  const name = draft?.renter?.fullName ?? state.renters.find((r) => r.id === draft?.renterId)?.fullName ?? '';
  const lines = draft ? moveInLines(draft) : [];
  const total = lines.reduce((sum, [, amount]) => sum + amount, 0);
  const payments = state.payments.filter((p) => p.propertyId === property.id);
  const payment = saved?.paymentId ? payments.find((p) => p.id === saved.paymentId) : undefined;
  const tenancy = saved && state.tenancies.find((t) => t.id === saved.tenancyId);
  const contract = tenancy?.contracts.find((c) => c.status === 'active');
  const renter = saved && state.renters.find((r) => r.id === saved.renterId);

  const save = async (withPayment: boolean) => {
    if (!draft) return;
    setError('');
    try {
      const paid = withPayment ? await readPayment(pay) : null;
      const result = await run({ ...draft, payment: paid?.input ?? null, proofs: paid?.proofs ?? [] }) as Saved & { warnings: string[] };
      result.warnings.forEach((w) => toast.warning(w));
      setSaved(result);
    } catch (e) { setError(errorMessage(e)); }
  };

  return <Dialog open onOpenChange={(open) => !open && close()}>
    <DialogContent className={cn('max-h-[90dvh] overflow-y-auto [scrollbar-width:thin] sm:max-w-xl', step === 1 && 'pb-0')}>
      <DialogHeader>
        <DialogTitle>Add tenant to {unit.name}</DialogTitle>
        <DialogDescription>{unit.kind === 'bedspace' ? 'Shared room' : unit.kind === 'whole' ? 'Whole house' : 'Private room'}
          {unit.defaultRentCentavos > 0 && ` · ${formatPesos(unit.defaultRentCentavos)}`}
          {unit.extraPersonRentCentavos > 0 && unit.defaultRentCentavos > 0 && ` + ${formatPesos(unit.extraPersonRentCentavos)} per extra person`}
        </DialogDescription>
      </DialogHeader>
      <ol aria-label="Move-in steps" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        {STEPS.map((label, i) => {
          const done = step > i + 1;
          return <li key={label} aria-current={step === i + 1 ? 'step' : undefined}
            className={cn('flex items-center gap-2', step === i + 1 ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            <span aria-hidden={done} className={cn('flex size-6 items-center justify-center rounded-full border text-xs tabular-nums',
              step === i + 1 && 'border-primary bg-primary text-primary-foreground', done && 'border-emerald-600 bg-emerald-600 text-white')}>
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>
            {label}{done && <span className="sr-only"> (done)</span>}
          </li>;
        })}
      </ol>

      {step === 1 && <AddTenantForm unit={unit} rentDueDay={property.rentDueDay} renters={renters} others={others} busy={busy} onCancel={close}
        onNext={(next) => { setDraft(next); setPay(paymentDraft(moveInLines(next).reduce((sum, [, amount]) => sum + amount, 0))); setStep(2); }} />}

      {step === 2 && draft && <div className="space-y-5 pb-2">
        <section aria-label="Move-in bill" className="rounded-xl bg-primary/10 px-4 py-3 text-sm">
          <p className="font-semibold">Move-in bill for {name}</p>
          <dl className="mt-2 space-y-1 tabular-nums">
            {lines.map(([label, amount]) => <div key={label} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{label}</dt><dd>{formatPesos(amount)}</dd></div>)}
            <div className="flex items-baseline justify-between gap-3 border-t border-primary/20 pt-2">
              <dt className="font-semibold">Total</dt><dd className="text-2xl font-bold text-primary">{formatPesos(total)}</dd></div>
          </dl>
        </section>
        {saved ? <div className="space-y-3">
          <p role="status" className="rounded-md bg-emerald-500/10 px-3 py-2 font-semibold text-emerald-800 dark:text-emerald-300">Tenant added</p>
          <p className="text-sm text-muted-foreground">{payment ? `${formatBillPesos(payment.amountCentavos)} recorded.` : 'Nothing paid yet: the move-in bill waits in Bills.'}
            {' '}Their bed is taken. Next, the contract.</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {payment && <PaperDialog label="View receipt" title="Receipt" description={`${formatBillPesos(payment.amountCentavos)} from ${name}`}
              className="h-11 sm:h-9" make={async () => (await import('../pdf/download')).downloadReceiptPdf(payment, receipt(payment))}>
              {() => <ReceiptPaper doc={receiptDocument(payment, receipt(payment))} />}</PaperDialog>}
            <Button className="h-11 sm:h-9" onClick={() => setStep(3)}>Next: contract</Button>
          </div>
        </div> : <form noValidate className="space-y-4" onSubmit={(e) => { e.preventDefault(); void save(true); }}>
          <p className="text-sm">Record what {name.split(' ')[0] || 'they'} paid now. A part is fine; the rest stays on the bill.</p>
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <PaymentFields value={pay} onChange={setPay} owed={total} propertyId={property.id} payments={payments} nameOf={nameOf} />
          </fieldset>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={busy} onClick={() => void save(false)}>
              Add without payment (pay later)</Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={busy}>Record payment and add tenant</Button>
          </div>
        </form>}
      </div>}

      {step === 3 && <div className="space-y-4 pb-2">
        {contract && renter ? <ContractPanel contract={contract} renter={renter} canManage busy={busy} run={run} startEditing
          info={{ property, texts: state.contractTexts, template: state.templates[property.id] ?? DEFAULT_CLAUSES, links: state.links }} />
          : <p role="status" className="text-sm text-muted-foreground">Loading…</p>}
        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" className="h-11 sm:h-9" onClick={onClose}>
            {state.contractTexts.some((t) => t.contractId === contract?.id) ? 'Close' : 'Do the contract later'}</Button>
        </div>
      </div>}

      <ConfirmDialog open={discarding} onOpenChange={setDiscarding} title="Discard this move-in?" variant="destructive"
        description="Nothing is saved yet. What you typed will be lost." confirmText="Discard" cancelText="Keep going" onConfirm={onClose} />
    </DialogContent>
  </Dialog>;
}
