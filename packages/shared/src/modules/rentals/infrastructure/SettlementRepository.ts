import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { settlementSchema, validateRentalFile } from '../domain/index.js';
import type { RentalSettlement, SettlementInput } from '../domain/index.js';
import { rentalError, settlementProofRow, settlementRow } from './rows.js';

const BUCKET = 'rental-files';
const PROOFS = 'rental_settlement_proofs';

export class SettlementRepository {
  async findAll(): Promise<RentalSettlement[]> {
    const { data, error } = await getSupabase().from('rental_settlements')
      .select('*, proofs:rental_settlement_proofs(*)').order('settled_at', { ascending: false });
    if (error) throw rentalError(error, 'Could not load settlements');
    return z.array(settlementRow).parse(data);
  }

  /** Settles the tenancy's deposit in one RPC (the database recomputes the deposit and unpaid bills); returns its id. */
  async settle(tenancyId: string, input: SettlementInput): Promise<string> {
    const v = settlementSchema.parse(input);
    const { data, error } = await getSupabase().rpc('rental_settle_deposit', { p_tenancy_id: tenancyId, p_lines: v.lines,
      p_forfeit: v.forfeit, p_refunded_on: v.refundedOn, p_refund_method: v.refundMethod, p_refund_reference: v.refundReference,
      p_notes: v.notes });
    if (error) throw rentalError(error, 'Could not settle the deposit');
    return z.string().parse(data);
  }

  async uploadProof(settlementId: string, propertyId: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void> {
    const mimeType = validateRentalFile(file.name, file.mimeType, file.bytes.byteLength);
    // Reserve metadata first so interrupted uploads stay visible and removable.
    const { data: reserved, error: reserveError } = await getSupabase().from(PROOFS).insert({
      settlement_id: settlementId, property_id: propertyId, name: file.name, mime_type: mimeType, size: file.bytes.byteLength,
    }).select('*').single();
    if (reserveError) throw rentalError(reserveError, 'Could not attach the proof');
    const { id, storagePath } = settlementProofRow.parse(reserved);
    try {
      const { error } = await getSupabase().storage.from(BUCKET).upload(storagePath, file.bytes,
        { contentType: mimeType, upsert: false, cacheControl: '0' });
      if (error) throw error;
      const { error: readyError } = await getSupabase().from(PROOFS).update({ ready: true }).eq('id', id).select('id').single();
      if (readyError) throw readyError;
    } catch (error) {
      try { await this.removeProof(id); }
      catch { throw new Error('Upload incomplete. Remove the incomplete proof before retrying.'); }
      throw rentalError(error, 'Could not attach the proof');
    }
  }

  async removeProof(id: string): Promise<void> {
    const { data, error } = await getSupabase().from(PROOFS).select('*').eq('id', id).single();
    if (error) throw rentalError(error, 'Could not remove the proof');
    const proof = settlementProofRow.parse(data);
    const { error: storageError } = await getSupabase().storage.from(BUCKET).remove([proof.storagePath]);
    if (storageError) throw rentalError(storageError, 'Could not remove the proof');
    const { error: rowError } = await getSupabase().from(PROOFS).delete().eq('id', id).select('id').single();
    if (rowError) throw rentalError(rowError, 'Could not remove the proof');
  }

  async proofUrl(id: string, download = false): Promise<string> {
    const { data, error } = await getSupabase().from(PROOFS).select('*').eq('id', id).eq('ready', true).single();
    if (error) throw rentalError(error, 'Could not open the proof');
    const proof = settlementProofRow.parse(data);
    const { data: signed, error: signError } = await getSupabase().storage.from(BUCKET)
      .createSignedUrl(proof.storagePath, 60, download ? { download: proof.name } : undefined);
    if (signError) throw rentalError(signError, 'Could not open the proof');
    return signed.signedUrl;
  }
}
