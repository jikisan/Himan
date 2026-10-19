import { useState } from 'react';
import { billDocument } from '@himan/shared/rentals';
import type { BillDocument, RentalBill, StatementInfo } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';

export type { StatementInfo } from '@himan/shared/rentals';
export type StatementBill = Pick<RentalBill, 'period' | 'dueOn' | 'lines'> & Partial<Pick<RentalBill, 'number' | 'issuedOn' | 'status'>>;

const heading = 'text-[11px] font-bold uppercase tracking-wide text-neutral-600';
const muted = 'text-neutral-600';

/**
 * The bill as a white sheet, laid out like the PDF and made from the same `billDocument`, so what is read here
 * is what downloads. It stays white in dark mode, like paper.
 */
export function Statement({ bill, info, qrUrl }: { bill: StatementBill; info: StatementInfo; qrUrl?: (path: string) => string }) {
  const doc = billDocument(bill, info);
  // A cancelled bill asks for nothing (same rule as the PDF).
  const summary = doc.cancelled ? doc.summary.filter(([k]) => k !== 'Amount due now' && k !== 'Paid in full') : doc.summary;
  return <article aria-label="Statement of Account"
    className={cn('relative space-y-1 rounded-md border border-neutral-200 bg-white p-5 text-sm leading-snug text-neutral-900 shadow-sm sm:p-6', doc.cancelled && 'opacity-80')}>
    {doc.cancelled && <span className="absolute right-4 top-4 rounded border-2 border-red-700 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-red-700">Cancelled</span>}
    <p className="font-bold">{doc.from.name}</p>
    {!!doc.from.address && <p className={muted}>{doc.from.address}</p>}
    <div className="py-3 text-center">
      <h4 className="text-base font-bold uppercase tracking-wider">Statement of Account</h4>
      <p className={muted}>Month: {doc.month}</p>
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5">
      {doc.fields.map(([k, v]) => <div key={k} className="flex min-w-0 gap-1">
        <dt className={muted}>{k}:</dt>
        {/* A preview of a bill that isn't issued yet has no number; say so instead of "—". */}
        <dd className="min-w-0 truncate font-bold">{k === 'Bill No.' && !bill.number ? <span className={cn('font-normal', muted)}>Not generated yet</span> : v}</dd></div>)}
    </dl>

    {doc.charges.length > 0 && <h5 className={cn(heading, 'pt-3')}>Rent and charges</h5>}
    {doc.charges.map((c, i) => <Line key={i} label={c.label} amount={c.amount} />)}

    {doc.utilities.map((u, i) => <div key={i}>
      <h5 className={cn(heading, 'pt-3')}>{u.title}</h5>
      {u.readings.map(([k, date, value]) => <div key={k} className={cn('flex justify-between gap-3 tabular-nums', muted)}>
        <span className="w-16">{k}</span><span className="flex-1">{date}</span><span className="w-24 text-right">{value}</span></div>)}
      <Line label={u.label} amount={u.amount} />
      {u.note && <p className={cn('text-xs', muted)}>{u.note}</p>}
    </div>)}

    <div className="mt-3 border-t border-neutral-300 pt-2">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="font-bold uppercase">Total amount payable</span>
        <span className="text-base font-bold tabular-nums">{doc.total}</span>
      </div>
      {summary.map(([k, v]) => <div key={k} className="flex justify-between gap-3">
        <span className={v ? muted : 'font-bold'}>{k}</span><span className="font-bold tabular-nums">{v}</span></div>)}
      <div className="flex justify-between gap-3"><span className={muted}>Due date</span><span className="font-bold">{doc.due}</span></div>
    </div>

    {doc.accounts.length > 0 && <h5 className={cn(heading, 'pt-3')}>Pay to</h5>}
    {doc.accounts.map((a) => <Account key={a.id} account={a} qrUrl={qrUrl} />)}

    <div className="space-y-6 pt-4 text-xs">
      {doc.lateFee && <p className={muted}>{doc.lateFee}</p>}
      <p className={muted}>Received by: <span className="inline-block w-44 border-b border-neutral-400" /></p>
    </div>
  </article>;
}

function Line({ label, amount }: { label: string; amount: string }) {
  return <div className="flex items-baseline justify-between gap-3"><span className="min-w-0 flex-1">{label}</span><span className="w-24 text-right tabular-nums">{amount}</span></div>;
}

function Account({ account, qrUrl }: { account: BillDocument['accounts'][number]; qrUrl?: (path: string) => string }) {
  const [broken, setBroken] = useState(false);
  return <div className="flex items-center justify-between gap-3 py-1">
    <p><span className="font-bold">{account.name}</span> — {account.detail}</p>
    {account.qrPath && qrUrl && !broken && <img src={qrUrl(account.qrPath)} alt={`${account.name} QR code`} width={84} height={84} referrerPolicy="no-referrer"
      onError={() => setBroken(true)} className="size-[84px] shrink-0 object-contain" />}
  </div>;
}
