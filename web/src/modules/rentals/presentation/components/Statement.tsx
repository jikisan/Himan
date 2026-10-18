import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { amountDueNow, billTotal, formatBillPesos, lineTitle, periodLabel } from '@himan/shared/rentals';
import type { PaymentAccount, RentalBill, StatementInfo } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';

export type { StatementInfo } from '@himan/shared/rentals';
export type StatementBill = Pick<RentalBill, 'period' | 'dueOn' | 'lines'> & Partial<Pick<RentalBill, 'number' | 'issuedOn' | 'status'>>;

const long = (date: string) => format(parseISO(date), 'MMM d, yyyy');
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 2 });
const UNIT_OF = { electric: 'kWh', water: 'm³' } as const;
const ACCOUNT: Partial<Record<PaymentAccount['kind'], string>> = { gcash: 'GCash', maya: 'Maya' };
const heading = 'text-xs font-bold uppercase tracking-wider text-muted-foreground';

/** The bill laid out like a paper Statement of Account. */
export function Statement({ bill, info }: { bill: StatementBill; info: StatementInfo }) {
  const charges = bill.lines.filter((l) => l.kind !== 'electric' && l.kind !== 'water');
  const utilities = bill.lines.filter((l) => l.kind === 'electric' || l.kind === 'water')
    .sort((a, b) => (a.kind === 'water' ? -1 : 1) - (b.kind === 'water' ? -1 : 1));
  const cancelled = bill.status === 'void';
  return <article aria-label="Statement of Account" className={cn('relative space-y-5 rounded-xl border bg-background p-4 text-sm sm:p-5', cancelled && 'opacity-70')}>
    {cancelled && <span className="absolute right-4 top-4 rotate-6 rounded border-2 border-destructive px-2 py-0.5 text-xs font-bold uppercase text-destructive">Cancelled</span>}
    <header className="space-y-3">
      <div>
        <p className="font-semibold">{info.ownerName || info.propertyName}</p>
        {info.ownerAddress && <p className="text-muted-foreground">{info.ownerAddress}</p>}
      </div>
      <div className="text-center">
        <h4 className="text-base font-bold uppercase tracking-wide">Statement of Account</h4>
        <p className="text-muted-foreground">Month: {periodLabel(bill.period)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Item label="Tenant">{info.renterName}</Item>
        <Item label="Room">{info.roomName}</Item>
        <Item label="Bill No.">{bill.number ?? <span className="text-muted-foreground">Not generated yet</span>}</Item>
        <Item label="Date">{bill.issuedOn ? long(bill.issuedOn) : '—'}</Item>
      </dl>
    </header>

    {charges.length > 0 && <section className="space-y-1.5">
      <h5 className={heading}>Rent and charges</h5>
      {charges.map((l, i) => <Row key={i} label={lineTitle(l)} amount={l.amount} />)}
    </section>}

    {utilities.map((l, i) => <section key={i} className="space-y-1.5">
      <h5 className={heading}>{l.label}</h5>
      {l.meter && (l.kind === 'electric' || l.kind === 'water') ? <>
        <dl className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-0.5 tabular-nums text-muted-foreground">
          <dt>Previous</dt><dd>{long(l.meter.fromDate)}</dd><dd className="text-right">{num(l.meter.fromValue)}</dd>
          <dt>Current</dt><dd>{long(l.meter.toDate)}</dd><dd className="text-right">{num(l.meter.toValue)}</dd>
        </dl>
        <Row label={`${num(l.meter.usage)} ${UNIT_OF[l.kind]} × ${formatBillPesos(l.meter.rate)}`} amount={l.amount}
          note={l.meter.sharedWith > 1 ? `Your 1/${l.meter.sharedWith} share of the room’s meter` : undefined} />
      </> : <Row label={l.billMonth ? `${periodLabel(l.billMonth)} bill` : 'Fixed monthly amount'} amount={l.amount} />}
    </section>)}

    <div className="space-y-1 border-t pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold uppercase tracking-wide">Total amount payable</span>
        <span className="text-xl font-bold tabular-nums">{formatBillPesos(billTotal(bill.lines))}</span>
      </div>
      {!!info.previousBalanceCentavos && <Total label="Previous balance" amount={info.previousBalanceCentavos} />}
      {!!info.paidCentavos && <Total label="Paid" amount={info.paidCentavos} />}
      {!!(info.previousBalanceCentavos || info.paidCentavos) && (amountDueNow(billTotal(bill.lines), info) > 0 ? <Total label="Amount due now" amount={amountDueNow(billTotal(bill.lines), info)} />
        : <p className="font-semibold text-emerald-700 dark:text-emerald-400">Paid in full</p>)}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground">Due date</span><span className="font-semibold">{long(bill.dueOn)}</span>
      </div>
    </div>

    {!!info.accounts?.length && <section className="space-y-1">
      <h5 className={heading}>Pay to</h5>
      <ul>{info.accounts.map((a) => <li key={a.id}>
        <span className="font-medium">{ACCOUNT[a.kind] ?? a.label}</span> — {[a.accountName, a.accountNumber].filter(Boolean).join(' ')}</li>)}</ul>
    </section>}

    <footer className="space-y-3 text-xs text-muted-foreground">
      {info.lateFeeCentavos > 0 && <p>Late payment will have a penalty of {formatBillPesos(info.lateFeeCentavos)}.</p>}
      <p>Received by: <span className="inline-block w-40 border-b border-muted-foreground/40" /></p>
    </footer>
  </article>;
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex gap-2"><dt className="text-muted-foreground">{label}:</dt><dd className="min-w-0 truncate font-medium">{children}</dd></div>;
}

function Total({ label, amount }: { label: string; amount: number }) {
  return <div className="flex items-baseline justify-between gap-3">
    <span className="text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{formatBillPesos(amount)}</span>
  </div>;
}

function Row({ label, amount, note }: { label: string; amount: number; note?: string }) {
  return <div>
    <div className="flex items-baseline gap-2">
      <span>{label}</span>
      <span aria-hidden className="min-w-4 flex-1 border-b border-dotted border-muted-foreground/40" />
      <span className="tabular-nums">{formatBillPesos(amount)}</span>
    </div>
    {note && <p className="text-xs text-muted-foreground">{note}</p>}
  </div>;
}

