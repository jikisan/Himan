import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { paymentSchema, validateRentalFile } from '../domain/index.js';
import type { PaymentInput, RentalPayment } from '../domain/index.js';
import { paymentProofRow, paymentRow, rentalError } from './rows.js';

const BUCKET = 'rental-files';
const PROOFS = 'rental_payment_proofs';

export class PaymentRepository {
  // Viewers get proofs: [] because RLS hides rental_payment_proofs from them.
  async findAll(): Promise<RentalPayment[]> {
    const { data, error } = await getSupabase().from('rental_payments')
      .select('*, proofs:rental_payment_proofs(*), allocations:rental_payment_allocations(*)')
      .order('paid_on', { ascending: false }).order('created_at', { ascending: false });
    if (error) throw rentalError(error, 'Could not load payments');
    return z.array(paymentRow).parse(data);
  }

  /** Records the payment and allocates it in one RPC; returns its id. */
  async record(input: PaymentInput & { tenancyId: string }): Promise<string> {
    const v = paymentSchema.parse(input);
    const { data, error } = await getSupabase().rpc('rental_record_payment', { p_tenancy_id: input.tenancyId, p_amount: v.amountCentavos,
      p_paid_on: v.paidOn, p_method: v.method, p_reference: v.reference, p_notes: v.notes, p_bill_id: v.billId ?? null });
    if (error) throw rentalError(error, 'Could not record the payment');
    return z.string().parse(data);
  }

  async void(id: string, reason: string): Promise<void> {
    const { error } = await getSupabase().rpc('rental_void_payment', { p_payment_id: id, p_reason: reason.trim() });
    if (error) throw rentalError(error, 'Could not void the payment');
  }

  async uploadProof(paymentId: string, propertyId: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void> {
    const mimeType = validateRentalFile(file.name, file.mimeType, file.bytes.byteLength);
    // Reserve metadata first so interrupted uploads stay visible and removable.
    const { data: reserved, error: reserveError } = await getSupabase().from(PROOFS).insert({
      payment_id: paymentId, property_id: propertyId, name: file.name, mime_type: mimeType, size: file.bytes.byteLength,
    }).select('*').single();
    if (reserveError) throw rentalError(reserveError, 'Could not attach the proof');
    const { id, storagePath } = paymentProofRow.parse(reserved);
    try {
      const { error } = await getSupabase().storage.from(BUCKET).upload(storagePath, file.bytes,
        { contentType: mimeType, upsert: false, cacheControl: '0' });
      if (error) throw error;
      const { error: readyError } = await getSupabase().from(PROOFS).update({ ready: true }).eq('id', id).select('id').single();
      if (readyError) throw readyError;
    } catch (error) {
      try { await this.removeProof(id); }
      catch { throw new Error('Upload incomplete. Remove the incomplete proof before retrying.'); }
      throw error;
    }
  }

  async removeProof(id: string): Promise<void> {
    const { data, error } = await getSupabase().from(PROOFS).select('*').eq('id', id).single();
    if (error) throw rentalError(error, 'Could not remove the proof');
    const proof = paymentProofRow.parse(data);
    const { error: storageError } = await getSupabase().storage.from(BUCKET).remove([proof.storagePath]);
    if (storageError) throw storageError;
    const { error: rowError } = await getSupabase().from(PROOFS).delete().eq('id', id).select('id').single();
    if (rowError) throw rentalError(rowError, 'Could not remove the proof');
  }

  async proofUrl(id: string, download = false): Promise<string> {
    const { data, error } = await getSupabase().from(PROOFS).select('*').eq('id', id).eq('ready', true).single();
    if (error) throw rentalError(error, 'Could not open the proof');
    const proof = paymentProofRow.parse(data);
    const { data: signed, error: signError } = await getSupabase().storage.from(BUCKET)
      .createSignedUrl(proof.storagePath, 60, download ? { download: proof.name } : undefined);
    if (signError) throw signError;
    return signed.signedUrl;
  }
}
