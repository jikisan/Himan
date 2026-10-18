import { format, parseISO } from 'date-fns';
import { accountTitle, amountDueNow, billTotal, formatBillPesos, lineTitle, periodLabel } from './billing.js';
import { billBalance } from './payments.js';
import type { PaymentAccount, PaymentMethod, RentalPayment } from './payments.js';
import type { RentalBill } from './types.js';
import { pesosInWords } from './words.js';

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

export const METHOD_LABEL: Record<PaymentMethod, string> = { gcash: 'GCash', maya: 'Maya', bank: 'Bank transfer', cash: 'Cash', other: 'Other' };
/** A bill's plain name: "November 2026 SOA", "Move-in SOA", "Final SOA". */
export const billName = (b: Pick<RentalBill, 'kind' | 'period'>) =>
  b.kind === 'move_in' ? 'Move-in SOA' : b.kind === 'final' ? 'Final SOA' : `${periodLabel(b.period)} SOA`;

export interface ReceiptParty { propertyName: string; ownerName: string; ownerAddress: string; renterName: string; roomName: string }
export interface ReceiptDocument {
  number: string; date: string; from: { name: string; address: string }; receivedFrom: string; room: string;
  amount: string; amountInWords: string; method: string; reference: string;
  appliedTo: { bill: string; amount: string }[];
  /** Left on the bills it paid right after this payment ("Fully paid" when nothing); null when it paid no bill. */
  balance: string | null; credit: string | null; receivedBy: string; voided: string | null;
}

/** The acknowledgment receipt for one payment. Proof images are never part of it. */
export function receiptDocument(payment: RentalPayment, ctx: ReceiptParty & { bills: RentalBill[]; payments: RentalPayment[] }): ReceiptDocument {
  const paid = payment.allocations.flatMap((a) => {
    const bill = ctx.bills.find((b) => b.id === a.billId);
    return bill ? [{ bill, amount: a.amountCentavos }] : [];
  });
  // Allocations go to payments in created order, so the ones up to this payment are what it saw.
  const upToThis = ctx.payments.filter((p) => p.createdAt <= payment.createdAt);
  const left = paid.reduce((sum, { bill }) => sum + billBalance(bill, upToThis), 0);
  const credit = payment.amountCentavos - payment.allocations.reduce((sum, a) => sum + a.amountCentavos, 0);
  const active = payment.status === 'active';
  return {
    // ponytail: the payment id's first 8 characters, not a sequence; add real receipt numbering if a tenant needs one.
    number: `R-${payment.id.slice(0, 8).toUpperCase()}`,
    date: long(payment.paidOn), from: { name: ctx.ownerName || ctx.propertyName, address: ctx.ownerAddress },
    receivedFrom: ctx.renterName, room: ctx.roomName,
    amount: formatBillPesos(payment.amountCentavos), amountInWords: pesosInWords(payment.amountCentavos),
    method: METHOD_LABEL[payment.method], reference: payment.reference,
    appliedTo: paid.map(({ bill, amount }) => ({ bill: `${bill.number} · ${billName(bill)}`, amount: formatBillPesos(amount) })),
    balance: active && paid.length ? (left > 0 ? formatBillPesos(left) : 'Fully paid') : null,
    credit: active && credit > 0 ? formatBillPesos(credit) : null,
    receivedBy: ctx.ownerName || ctx.propertyName,
    voided: active ? null : `VOID — ${payment.voidReason}`,
  };
}
