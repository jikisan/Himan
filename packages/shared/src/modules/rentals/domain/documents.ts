import { format, parseISO } from 'date-fns';
import { accountTitle, amountDueNow, billTotal, formatBillPesos, lineTitle, periodLabel } from './billing.js';
import type { PaymentAccount } from './payments.js';
import type { RentalBill } from './types.js';

// What goes on each PDF, already worded and formatted; the web renders it as is.

export interface StatementInfo {
  propertyName: string; ownerName: string; ownerAddress: string; renterName: string; roomName: string; lateFeeCentavos: number;
  accounts?: PaymentAccount[]; previousBalanceCentavos?: number; paidCentavos?: number;
}
export interface BillDocument {
  from: { name: string; address: string }; month: string; fields: [string, string][]; cancelled: boolean;
  charges: { label: string; amount: string }[];
  /** Meter lines carry both readings as [Previous|Current, date, value]; fixed and monthly ones have none. */
  utilities: { title: string; readings: [string, string, string][]; label: string; amount: string; note?: string }[];
  total: string; summary: [string, string][]; due: string;
  accounts: { id: string; name: string; detail: string; qrPath: string | null }[];
  lateFee: string | null;
}

const long = (date: string) => format(parseISO(date), 'MMM d, yyyy');
const num = (n: number) => n.toLocaleString('en-PH', { maximumFractionDigits: 2 });
const UNIT_OF = { electric: 'kWh', water: 'm³' } as const;

/** The Statement of Account, laid out like the one on screen (`Statement`). */
export function billDocument(bill: Pick<RentalBill, 'period' | 'dueOn' | 'lines'> & Partial<Pick<RentalBill, 'number' | 'issuedOn' | 'status'>>,
  info: StatementInfo): BillDocument {
  const isUtility = (kind: string): kind is 'water' | 'electric' => kind === 'water' || kind === 'electric';
  const total = billTotal(bill.lines);
  const due = amountDueNow(total, info);
  return {
    from: { name: info.ownerName || info.propertyName, address: info.ownerAddress },
    month: periodLabel(bill.period),
    fields: [['Tenant', info.renterName], ['Room', info.roomName], ['Bill No.', bill.number ?? '—'], ['Date', bill.issuedOn ? long(bill.issuedOn) : '—']],
    cancelled: bill.status === 'void',
    charges: bill.lines.filter((l) => !isUtility(l.kind)).map((l) => ({ label: lineTitle(l), amount: formatBillPesos(l.amount) })),
    utilities: bill.lines.filter((l) => isUtility(l.kind)).sort((a, b) => Number(a.kind !== 'water') - Number(b.kind !== 'water')).map((l) => {
      const m = l.meter;
      if (!m || !isUtility(l.kind)) {
        return { title: l.label, readings: [], label: l.billMonth ? `${periodLabel(l.billMonth)} bill` : 'Fixed monthly amount', amount: formatBillPesos(l.amount) };
      }
      return { title: l.label, readings: [['Previous', long(m.fromDate), num(m.fromValue)], ['Current', long(m.toDate), num(m.toValue)]],
        label: `${num(m.usage)} ${UNIT_OF[l.kind]} × ${formatBillPesos(m.rate)}`, amount: formatBillPesos(l.amount),
        ...(m.sharedWith > 1 ? { note: `Your 1/${m.sharedWith} share of the room’s meter` } : {}) };
    }),
    total: formatBillPesos(total),
    summary: [
      ...(info.previousBalanceCentavos ? [['Previous balance', formatBillPesos(info.previousBalanceCentavos)] as [string, string]] : []),
      ...(info.paidCentavos ? [['Paid', formatBillPesos(info.paidCentavos)] as [string, string]] : []),
      ...(info.previousBalanceCentavos || info.paidCentavos
        ? [(due > 0 ? ['Amount due now', formatBillPesos(due)] : ['Paid in full', '']) as [string, string]] : []),
    ],
    due: long(bill.dueOn),
    accounts: (info.accounts ?? []).map((a) => ({ id: a.id, name: accountTitle(a),
      detail: [a.accountName, a.accountNumber].filter(Boolean).join(' '), qrPath: a.qrPath })),
    lateFee: info.lateFeeCentavos > 0 ? `Late payment will have a penalty of ${formatBillPesos(info.lateFeeCentavos)}.` : null,
  };
}
