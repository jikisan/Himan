import { z } from 'zod';
import { billTotal } from './billing.js';
import type { RentalBill, RentalProperty, RentalTenancy } from './types.js';
import type { RentalSettlement } from './settlement.js';

export const PAYMENT_METHODS = ['gcash', 'maya', 'bank', 'cash', 'other'] as const;
export const ACCOUNT_KINDS = ['gcash', 'maya', 'bank', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentProof { id: string; paymentId: string; propertyId: string; name: string; mimeType: string; size: number; storagePath: string; ready: boolean }
export interface PaymentAllocation { id: string; paymentId: string; billId: string; amountCentavos: number; pinned: boolean }
export interface RentalPayment {
  id: string; propertyId: string; tenancyId: string; amountCentavos: number; paidOn: string; method: PaymentMethod;
  reference: string; notes: string; status: 'active' | 'void'; voidReason: string; createdAt: string;
  proofs: PaymentProof[]; allocations: PaymentAllocation[];
  /** What the receipt says, stored when the payment was recorded; `{}` for payments recorded before snapshots. */
  receipt?: ReceiptSnapshot;
}
export interface ReceiptSnapshot {
  applied?: { billId: string; number: string; amount: number }[];
  /** Left unallocated by this payment, and the tenant's total still owed on issued bills, right after it. */
  creditCentavos?: number; balanceCentavos?: number;
}
export interface PaymentAccount {
  id: string; propertyId: string; kind: (typeof ACCOUNT_KINDS)[number]; label: string; accountName: string;
  accountNumber: string; qrPath: string | null; position: number;
}

export const paymentSchema = z.object({
  amountCentavos: z.number('Enter the amount').int().min(1, 'Amount must be more than zero').max(2_000_000_000, 'That amount is too high'),
  paidOn: z.iso.date('Choose the payment date'),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(80),
  notes: z.string().trim().max(500),
  billId: z.guid().nullable().optional(),
});
export type PaymentInput = z.infer<typeof paymentSchema>;

export const paymentAccountSchema = z.object({
  kind: z.enum(ACCOUNT_KINDS),
  label: z.string().trim().min(1, 'Enter a label').max(60),
  accountName: z.string().trim().max(120),
  accountNumber: z.string().trim().max(60),
  position: z.number().int().min(0).default(0),
});
export type PaymentAccountInput = z.infer<typeof paymentAccountSchema>;

export type BillState = 'paid' | 'partial' | 'unpaid' | 'overdue' | 'void';

const active = (payments: RentalPayment[]) => payments.filter((p) => p.status === 'active');
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

export function billPaid(billId: string, payments: RentalPayment[]): number {
  return sum(active(payments).flatMap((p) => p.allocations.filter((a) => a.billId === billId).map((a) => a.amountCentavos)));
}

export function billBalance(bill: RentalBill, payments: RentalPayment[]): number {
  return bill.status === 'void' ? 0 : Math.max(billTotal(bill.lines) - billPaid(bill.id, payments), 0);
}

export function billState(bill: RentalBill, payments: RentalPayment[], today: string): BillState {
  if (bill.status === 'void') return 'void';
  if (billBalance(bill, payments) === 0) return 'paid';
  if (bill.dueOn < today) return 'overdue';
  return billPaid(bill.id, payments) > 0 ? 'partial' : 'unpaid';
}

export function tenancyOwed(tenancyId: string, bills: RentalBill[], payments: RentalPayment[]): number {
  return sum(bills.filter((b) => b.tenancyId === tenancyId).map((b) => billBalance(b, payments)));
}

export function tenancyCredit(tenancyId: string, payments: RentalPayment[]): number {
  return sum(active(payments).filter((p) => p.tenancyId === tenancyId)
    .map((p) => p.amountCentavos - sum(p.allocations.map((a) => a.amountCentavos))));
}

/** The deposit on the issued move-in bill; it counts as held only once that bill is fully paid, and no longer once settled. */
export function depositHeld(tenancy: RentalTenancy, bills: RentalBill[], payments: RentalPayment[], settlement?: RentalSettlement):
  { state: 'none' | 'pending' | 'held'; amountCentavos: number } {
  if (settlement?.tenancyId === tenancy.id && settlement.status === 'settled') return { state: 'none', amountCentavos: 0 };
  const bill = bills.find((b) => b.tenancyId === tenancy.id && b.kind === 'move_in' && b.status === 'issued');
  const amountCentavos = bill ? sum(bill.lines.filter((l) => l.kind === 'deposit').map((l) => l.amount)) : 0;
  if (!bill || amountCentavos <= 0) return { state: 'none', amountCentavos: 0 };
  return { state: billBalance(bill, payments) === 0 ? 'held' : 'pending', amountCentavos };
}

export function findDuplicateReference(payments: RentalPayment[], propertyId: string, reference: string): RentalPayment | undefined {
  const key = reference.trim().toLowerCase();
  return key ? active(payments).find((p) => p.propertyId === propertyId && p.reference.trim().toLowerCase() === key) : undefined;
}

/** What the tenant still owes on their other bills due before this one (same due date: the lower bill number first). */
export function previousBalance(tenancyId: string, bill: RentalBill, bills: RentalBill[], payments: RentalPayment[]): number {
  return tenancyOwed(tenancyId, bills.filter((b) => b.id !== bill.id
    && (b.dueOn < bill.dueOn || (b.dueOn === bill.dueOn && b.number < bill.number))), payments);
}

/** Unpaid bills issued before the property started tracking payments: who owes on them and how much in all. */
export function earlierUnpaid(property: Pick<RentalProperty, 'id' | 'paymentsTrackedFrom'>, bills: RentalBill[], payments: RentalPayment[]):
  { tenancyIds: string[]; totalCentavos: number } {
  const from = property.paymentsTrackedFrom;
  const owing = from ? bills.filter((b) => b.propertyId === property.id && isEarlier(b, from) && billBalance(b, payments) > 0) : [];
  return { tenancyIds: [...new Set(owing.map((b) => b.tenancyId))], totalCentavos: sum(owing.map((b) => billBalance(b, payments))) };
}

/** Issued before payment tracking started; such bills live in the Home banner, not the Overdue list. */
export const isEarlier = (bill: RentalBill, trackedFrom: string | null): boolean =>
  !!trackedFrom && bill.status === 'issued' && bill.issuedOn < trackedFrom;
