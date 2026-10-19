import { centavosToInput, manilaToday, parsePesos, paymentSchema, validateRentalFile } from '@himan/shared/rentals';
import type { PaymentInput, PaymentMethod } from '@himan/shared/rentals';

/** The payment form as typed (Record payment and the move-in flow's Pay step). */
export interface PaymentDraft { amount: string; paidOn: string; method: PaymentMethod; reference: string; notes: string; proofs: File[] }
export type Proof = { name: string; mimeType: string; bytes: ArrayBuffer };

export const paymentDraft = (amountCentavos: number): PaymentDraft =>
  ({ amount: centavosToInput(amountCentavos), paidOn: manilaToday(), method: 'gcash', reference: '', notes: '', proofs: [] });

/** Checks the draft and reads the proof files; throws an Error with a plain message. `billId` (null = oldest first) is left out when not given. */
export async function readPayment(d: PaymentDraft, billId?: string | null): Promise<{ input: PaymentInput; proofs: Proof[] }> {
  const result = paymentSchema.safeParse({ amountCentavos: d.amount.trim() ? parsePesos(d.amount) : 0, paidOn: d.paidOn, method: d.method,
    reference: d.reference, notes: d.notes, ...(billId !== undefined && { billId }) });
  if (!result.success) throw new Error(result.error.issues[0].message);
  if (result.data.paidOn > manilaToday()) throw new Error('The payment date can’t be in the future');
  for (const f of d.proofs) validateRentalFile(f.name, f.type, f.size);
  return { input: result.data, proofs: await Promise.all(d.proofs.map(async (f) => ({ name: f.name, mimeType: f.type, bytes: await f.arrayBuffer() }))) };
}
