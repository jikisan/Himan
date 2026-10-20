import { centavosToInput, manilaToday, parsePesos, paymentSchema, validateRentalFile } from '@himan/shared/rentals';
import type { PaymentInput, PaymentMethod } from '@himan/shared/rentals';
import type { useFieldErrors } from '@core/presentation/hooks';
import { errorMessage } from './errorMessage';

/** The payment form as typed (Record payment and the move-in flow's Pay step). */
export interface PaymentDraft { amount: string; paidOn: string; method: PaymentMethod; reference: string; notes: string; proofs: File[] }
export type Proof = { name: string; mimeType: string; bytes: ArrayBuffer };

export const paymentDraft = (amountCentavos: number): PaymentDraft =>
  ({ amount: centavosToInput(amountCentavos), paidOn: manilaToday(), method: 'gcash', reference: '', notes: '', proofs: [] });

/** A problem with one field of the payment form; `field` is that input's id (see PaymentFields). */
export class PaymentFieldError extends Error {
  field: string;
  constructor(message: string, field: string) { super(message); this.field = field; }
}

const FIELD: Record<string, string> = { amountCentavos: 'pay-amount', paidOn: 'pay-date', method: 'pay-method', reference: 'pay-reference',
  notes: 'pay-notes', billId: 'pay-bill' };

/** Checks the draft and reads the proof files; a bad field throws a PaymentFieldError naming it. `billId` (null = oldest first) is left out when not given. */
export async function readPayment(d: PaymentDraft, billId?: string | null): Promise<{ input: PaymentInput; proofs: Proof[] }> {
  let amountCentavos = 0;
  try { amountCentavos = d.amount.trim() ? parsePesos(d.amount) : 0; } catch (e) { throw new PaymentFieldError((e as Error).message, 'pay-amount'); }
  const result = paymentSchema.safeParse({ amountCentavos, paidOn: d.paidOn, method: d.method,
    reference: d.reference, notes: d.notes, ...(billId !== undefined && { billId }) });
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new PaymentFieldError(issue.message, FIELD[String(issue.path[0])] ?? 'pay-amount');
  }
  if (result.data.paidOn > manilaToday()) throw new PaymentFieldError('The payment date can’t be in the future', 'pay-date');
  try { for (const f of d.proofs) validateRentalFile(f.name, f.type, f.size); } catch (e) { throw new PaymentFieldError((e as Error).message, 'pay-proofs'); }
  return { input: result.data, proofs: await Promise.all(d.proofs.map(async (f) => ({ name: f.name, mimeType: f.type, bytes: await f.arrayBuffer() }))) };
}

/** Shows a readPayment/save failure: under its field, or (a server refusal) in the form's banner. */
export function showPaymentError(fe: Pick<ReturnType<typeof useFieldErrors>, 'fail' | 'setFormError'>, error: unknown) {
  if (error instanceof PaymentFieldError) fe.fail(error.field, error.message);
  else fe.setFormError(errorMessage(error));
}
