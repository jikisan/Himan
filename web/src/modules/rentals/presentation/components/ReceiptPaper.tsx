import type { ReceiptDocument } from '@himan/shared/rentals';

const muted = 'text-neutral-600';
const heading = 'pt-3 text-[11px] font-bold uppercase tracking-wide text-neutral-600';

/**
 * The receipt as a white sheet laid out like ReceiptPdf and made from the same `receiptDocument`, so what is read here is what
 * downloads. It stays white in dark mode, like paper. Never shows proof images.
 */
export function ReceiptPaper({ doc }: { doc: ReceiptDocument }) {
  const rows: [string, string][] = [['Method', doc.method], ...(doc.reference ? [['Reference no.', doc.reference] as [string, string]] : [])];
  return <article aria-label="Acknowledgment Receipt"
    className="space-y-1 rounded-md border border-neutral-200 bg-white p-5 text-sm leading-snug break-words text-neutral-900 shadow-sm sm:p-6">
    {doc.voided && <p className="mb-2 rounded border-2 border-red-700 px-2 py-0.5 text-center text-sm font-bold text-red-700">{doc.voided}</p>}
    <p className="font-bold">{doc.from.name}</p>
    {!!doc.from.address && <p className={muted}>{doc.from.address}</p>}
    <h4 className="py-3 text-center text-base font-bold uppercase tracking-wider">Acknowledgment Receipt</h4>
    <div className="flex justify-between gap-3">
      <p><span className={muted}>No. </span><span className="font-bold">{doc.number}</span></p>
      <p><span className={muted}>Date </span><span className="font-bold">{doc.date}</span></p>
    </div>

    <p className="pt-3">Received from <span className="font-bold">{doc.receivedFrom}</span> ({doc.room}) the amount of</p>
    <p className="py-1 text-xl font-bold tabular-nums">{doc.amount}</p>
    <p>{doc.amountInWords}</p>
    <div className="pt-2">{rows.map(([k, v]) => <Row key={k} label={k} value={v} />)}</div>

    {doc.appliedTo.length > 0 && <h5 className={heading}>Applied to</h5>}
    {doc.appliedTo.map((a, i) => <div key={i} className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 flex-1">{a.bill}</span><span className="w-24 text-right tabular-nums">{a.amount}</span></div>)}
    {(doc.balance || doc.credit) && <div className="mt-3 border-t border-neutral-300 pt-2">
      {doc.balance && <Row label={doc.balanceLabel} value={doc.balance} bold />}
      {doc.credit && <Row label="Kept as credit for the next SOA" value={doc.credit} bold />}
    </div>}
    {doc.asOf && <p className={`text-[11px] ${muted}`}>{doc.asOf}</p>}

    <div className="w-44 pt-10">
      <div className="border-b border-neutral-400" />
      <p className={muted}>Received by</p>
      <p className="font-bold">{doc.receivedBy}</p>
    </div>
  </article>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return <div className="flex items-baseline justify-between gap-3">
    <span className={muted}>{label}</span><span className={bold ? 'font-bold tabular-nums' : 'text-right tabular-nums'}>{value}</span></div>;
}
