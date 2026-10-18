import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { accountTitle, billName, billTotal, formatBillPesos, manilaToday, METHOD_LABEL } from '@himan/shared/rentals';
import type { PaymentAccount, PublicLink, ReceiptContext, RentalBill, RentalPayment, StatementInfo } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';
import { PaymentAccountRepository } from '../../infrastructure';
import { PdfButton } from '../components/PdfButton';

const qrUrl = (path: string) => new PaymentAccountRepository().qrUrl(path);
const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
type LinkBill = PublicLink['bills'][number];

// billState's rules on the totals the link returns (it has no allocations): paid, else overdue, else partial or unpaid.
const STATES = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', overdue: 'Overdue' } as const;
const stateOf = (b: LinkBill, today: string): keyof typeof STATES =>
  b.balance === 0 ? 'paid' : b.dueOn < today ? 'overdue' : b.paid > 0 ? 'partial' : 'unpaid';
const STATE_STYLE = { paid: 'bg-emerald-500/10 text-emerald-700', partial: 'bg-amber-500/15 text-amber-800', unpaid: 'bg-muted text-muted-foreground',
  overdue: 'bg-destructive/10 text-destructive' } as const;

// The link's rows in the shapes the Step B PDF builders take; ids the link doesn't return are blank.
const asBill = (b: LinkBill): RentalBill => ({ id: b.id, propertyId: '', tenancyId: '', kind: b.kind ?? 'monthly', period: b.period, number: b.number,
  issuedOn: b.issuedOn, dueOn: b.dueOn, lines: b.lines, status: 'issued', voidReason: '' });
const asPayment = (p: PublicLink['payments'][number]): RentalPayment => ({ id: p.id, propertyId: '', tenancyId: '', amountCentavos: p.amount,
  paidOn: p.paidOn, method: p.method, reference: p.reference, notes: '', status: 'active', voidReason: '', createdAt: p.createdAt,
  proofs: [], allocations: [], receipt: p.receipt ?? {} });
const asAccount = (a: PublicLink['accounts'][number], position: number): PaymentAccount => ({ ...a, propertyId: '', position });

/** Read-only: the tenant's bills, balance, payments and where to pay, with a PDF of each bill and receipt. No proofs, no IDs. */
export function BillsTab({ data }: { data: PublicLink }) {
  const today = manilaToday();
  const { bills, payments, property } = data;
  const accounts = data.accounts.map(asAccount);
  const party = { propertyName: property.name, ownerName: property.ownerName, ownerAddress: property.ownerAddress,
    renterName: data.tenantName, roomName: data.roomName ?? '' };
  const balance = sum(bills.map((b) => b.balance));
  // ponytail: credit = money received minus what reached issued bills; counts any allocation left on a voided bill as credit.
  const credit = Math.max(0, sum(payments.map((p) => p.amount)) - sum(bills.map((b) => b.paid)));
  const info = (b: LinkBill): StatementInfo => ({ ...party, lateFeeCentavos: property.lateFeeCentavos, accounts, paidCentavos: b.paid,
    // Like previousBalance: what is still owed on bills due earlier (same day: the lower number first).
    previousBalanceCentavos: sum(bills.filter((o) => o !== b && (o.dueOn < b.dueOn || (o.dueOn === b.dueOn && o.number < b.number))).map((o) => o.balance)) });
  const receiptContext: ReceiptContext = { ...party, bills: bills.map(asBill), payments: payments.map(asPayment) };

  return <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-3">
      <Total label="Total balance" value={formatBillPesos(balance)} strong={balance > 0} />
      <Total label="Credit" value={formatBillPesos(credit)} />
    </dl>

    <section aria-labelledby="bills-title" className="space-y-2">
      <h2 id="bills-title" className="text-lg font-semibold">Bills</h2>
      {!bills.length ? <p className="text-base text-muted-foreground">No bills yet.</p>
        : <ul className="space-y-3">{[...bills].reverse().map((b) => {
          const state = stateOf(b, today);
          return <li key={b.id || b.number} aria-label={`${b.number} ${billName({ kind: b.kind ?? 'monthly', period: b.period })}`}
            className="space-y-2 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-base font-semibold">{billName({ kind: b.kind ?? 'monthly', period: b.period })}</p>
                <p className="text-sm text-muted-foreground">{b.number} · Due {day(b.dueOn)}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-sm font-semibold', STATE_STYLE[state])}>{STATES[state]}</span>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div><dt className="text-muted-foreground">Amount</dt><dd className="tabular-nums">{formatBillPesos(billTotal(b.lines))}</dd></div>
              <div><dt className="text-muted-foreground">Paid</dt><dd className="tabular-nums">{formatBillPesos(b.paid)}</dd></div>
              <div><dt className="text-muted-foreground">Balance</dt><dd className="font-semibold tabular-nums">{formatBillPesos(b.balance)}</dd></div>
            </dl>
            <PdfButton className="h-12 w-full text-base" aria-label={`Download PDF of ${b.number}`}
              make={async () => (await import('../pdf/download')).downloadBillPdf(asBill(b), info(b), qrUrl)}>Download PDF</PdfButton>
          </li>;
        })}</ul>}
    </section>

    <section aria-labelledby="payments-title" className="space-y-2">
      <h2 id="payments-title" className="text-lg font-semibold">Payments</h2>
      {!payments.length ? <p className="text-base text-muted-foreground">No payments yet.</p>
        : <ul className="divide-y rounded-xl border bg-card">{[...payments].reverse().map((p, i) => <li key={p.id || i} className="space-y-1 p-4">
          <p className="text-base"><span className="font-semibold tabular-nums">{formatBillPesos(p.amount)}</span>
            <span className="text-muted-foreground"> · {METHOD_LABEL[p.method]} · {day(p.paidOn)}</span></p>
          {(p.reference || !!p.billNumbers.length) && <p className="text-sm text-muted-foreground break-words">
            {[p.reference && `Ref ${p.reference}`, p.billNumbers.length && `For ${p.billNumbers.join(', ')}`].filter(Boolean).join(' · ')}</p>}
          {/* Receipts print from the snapshot taken when the payment was recorded; older payments have none. */}
          {p.receipt?.applied && <PdfButton className="h-12 w-full text-base" aria-label={`Receipt PDF for ${formatBillPesos(p.amount)} on ${day(p.paidOn)}`}
            make={async () => (await import('../pdf/download')).downloadReceiptPdf(asPayment(p), receiptContext)}>Receipt PDF</PdfButton>}
        </li>)}</ul>}
    </section>

    {!!accounts.length && <section aria-labelledby="accounts-title" className="space-y-2">
      <h2 id="accounts-title" className="text-lg font-semibold">Where to pay</h2>
      <ul className="space-y-3">{accounts.map((a, i) => <Account key={a.id || i} account={a} />)}</ul>
    </section>}
  </div>;
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="rounded-xl border bg-card p-4">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className={cn('text-xl tabular-nums', strong && 'font-semibold')}>{value}</dd>
  </div>;
}

function Account({ account: a }: { account: PaymentAccount }) {
  const [broken, setBroken] = useState(false);
  const title = accountTitle(a);
  return <li className="space-y-2 rounded-xl border bg-card p-4">
    <p className="text-base font-semibold">{title}</p>
    <p className="text-base break-words">{[a.accountName, a.accountNumber].filter(Boolean).join(' · ')}</p>
    {a.qrPath && !broken && <img src={qrUrl(a.qrPath)} alt={`QR code for ${title}`} referrerPolicy="no-referrer" loading="lazy"
      className="mx-auto aspect-square w-full max-w-60 rounded-lg border bg-white object-contain" onError={() => setBroken(true)} />}
  </li>;
}
