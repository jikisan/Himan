import { z } from 'zod';
import { depositHeld, PAYMENT_METHODS } from './payments.js';
import type { PaymentMethod, RentalPayment } from './payments.js';
import type { RentalBill, RentalTenancy } from './types.js';

export interface SettlementLine { label: string; amount: number }
export interface SettlementProof { id: string; settlementId: string; propertyId: string; name: string; mimeType: string; size: number; storagePath: string; ready: boolean }
export interface RentalSettlement {
  id: string; propertyId: string; tenancyId: string; depositCentavos: number; unpaidBillsCentavos: number; lines: SettlementLine[];
  forfeit: boolean; refundCentavos: number; owedCentavos: number; refundedOn: string | null; refundMethod: PaymentMethod | null;
  refundReference: string; notes: string; status: 'draft' | 'settled'; settledAt: string | null; proofs: SettlementProof[];
}

const LINE = 'Add a label and an amount for each deduction';
export const settlementSchema = z.object({
  lines: z.array(z.object({
    label: z.string(LINE).trim().min(1, LINE).max(80, 'Keep each label under 80 characters').regex(/[^\s​-‍﻿]/, LINE),
    amount: z.number(LINE).int(LINE).min(1, LINE).max(2_000_000_000, 'That amount is too high'),
  })).max(30, 'Use at most 30 deductions'),
  forfeit: z.boolean(),
  // Required by the form only when a refund is expected; the database checks it too.
  refundedOn: z.iso.date('Choose the refund date').nullable(),
  refundMethod: z.enum(PAYMENT_METHODS, 'Pick how the refund was paid').nullable(),
  refundReference: z.string().trim().max(80, 'Keep the reference under 80 characters'),
  notes: z.string().trim().max(500, 'Keep the note under 500 characters'),
});
export type SettlementInput = z.infer<typeof settlementSchema>;

/** Forfeit keeps the whole deposit; otherwise unpaid bills and each line come off it, and any excess is still owed. */
export function settlementPreview(input: { depositCentavos: number; unpaidBillsCentavos: number; lines: SettlementLine[]; forfeit: boolean }):
  { deductionsCentavos: number; refundCentavos: number; owedByTenantCentavos: number } {
  const { depositCentavos, unpaidBillsCentavos, lines, forfeit } = input;
  if (forfeit) return { deductionsCentavos: depositCentavos, refundCentavos: 0, owedByTenantCentavos: 0 };
  const deductionsCentavos = unpaidBillsCentavos + lines.reduce((a, l) => a + l.amount, 0);
  return { deductionsCentavos, refundCentavos: Math.max(depositCentavos - deductionsCentavos, 0),
    owedByTenantCentavos: Math.max(deductionsCentavos - depositCentavos, 0) };
}

/** A held deposit after move-out waits to be settled; once settled it is no longer held. */
export function depositToReturn(tenancy: RentalTenancy, bills: RentalBill[], payments: RentalPayment[], settlement?: RentalSettlement):
  { state: 'none' | 'to_settle' | 'settled'; depositCentavos: number } {
  if (settlement?.tenancyId === tenancy.id) return { state: 'settled', depositCentavos: settlement.depositCentavos };
  const held = depositHeld(tenancy, bills, payments);
  return tenancy.moveOut && held.state === 'held' ? { state: 'to_settle', depositCentavos: held.amountCentavos } : { state: 'none', depositCentavos: 0 };
}
