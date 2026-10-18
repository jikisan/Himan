import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { DEFAULT_CLAUSES, clausesSchema, signatureSchema, validateRentalFile } from '../domain/index.js';
import type { Clause, ContractText } from '../domain/index.js';
import { contractTextRow, fileName, rentalError } from './rows.js';

const TEXTS = 'rental_contract_texts';

export class ContractRepository {
  async findTexts(): Promise<ContractText[]> {
    const { data, error } = await getSupabase().from(TEXTS).select('*').order('created_at', { ascending: false });
    if (error) throw rentalError(error, 'Could not load contracts');
    return z.array(contractTextRow).parse(data);
  }

  /** The property's clauses, or the default contract when the owner hasn't edited it. */
  async getTemplate(propertyId: string): Promise<Clause[]> {
    const { data, error } = await getSupabase().from('rental_contract_templates').select('clauses')
      .eq('property_id', propertyId).maybeSingle();
    if (error) throw rentalError(error, 'Could not load the contract template');
    return data ? clausesSchema.parse(z.object({ clauses: z.unknown() }).parse(data).clauses) : DEFAULT_CLAUSES;
  }

  async saveTemplate(propertyId: string, clauses: Clause[]): Promise<void> {
    const v = clausesSchema.parse(clauses);
    const { error } = await getSupabase().from('rental_contract_templates').upsert({ property_id: propertyId, clauses: v })
      .select('property_id').single();
    if (error) throw rentalError(error, 'Could not save the contract template');
  }

  /** A draft from already rendered clauses (`renderClauses`); returns its id. */
  async createText(contractId: string, propertyId: string, body: string[], specialTerms: string): Promise<string> {
    const { data, error } = await getSupabase().from(TEXTS)
      .insert({ contract_id: contractId, property_id: propertyId, body, special_terms: specialTerms.trim() }).select('id').single();
    if (error) throw rentalError(error, 'Could not create the contract', 'This contract already has a text');
    return z.object({ id: z.string() }).parse(data).id;
  }

  /** Only while draft or sent; the database refuses once the tenant has signed. */
  async updateText(id: string, changes: { body?: string[]; specialTerms?: string }): Promise<void> {
    const row = { ...(changes.body ? { body: changes.body } : {}),
      ...(changes.specialTerms !== undefined ? { special_terms: changes.specialTerms.trim() } : {}) };
    const { error } = await getSupabase().from(TEXTS).update(row).eq('id', id).select('id').single();
    if (error) throw rentalError(error, 'Could not save the contract');
  }

  async send(id: string): Promise<void> {
    const { error } = await getSupabase().rpc('rental_send_contract', { p_contract_text_id: id });
    if (error) throw rentalError(error, 'Could not send the contract');
  }

  /** Without a signature, the property's saved one is used (owners only; others must draw one). */
  async countersign(id: string, signature?: string): Promise<void> {
    const { error } = await getSupabase().rpc('rental_countersign',
      { p_contract_text_id: id, p_signature: signature === undefined ? null : signatureSchema.parse(signature) });
    if (error) throw rentalError(error, 'Could not sign the contract');
  }

  async setNotarizedScan(id: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void> {
    const mimeType = validateRentalFile(file.name, file.mimeType, file.bytes.byteLength);
    const { data, error } = await getSupabase().from(TEXTS).select('property_id').eq('id', id).single();
    if (error) throw rentalError(error, 'Could not attach the notarized copy');
    const path = `${z.object({ property_id: z.string() }).parse(data).property_id}/contracts/${id}/${fileName(mimeType)}`;
    const bucket = getSupabase().storage.from('rental-files');
    const { error: uploadError } = await bucket.upload(path, file.bytes, { contentType: mimeType, upsert: false, cacheControl: '0' });
    if (uploadError) throw rentalError(uploadError, 'Could not attach the notarized copy');
    const { error: rpcError } = await getSupabase().rpc('rental_set_notarized_scan', { p_contract_text_id: id, p_path: path });
    if (rpcError) {
      await bucket.remove([path]).catch(() => undefined);
      throw rentalError(rpcError, 'Could not attach the notarized copy');
    }
  }

  /** Owner only; members can't read the saved signature. */
  async getLessorSignature(propertyId: string): Promise<string | null> {
    const { data, error } = await getSupabase().rpc('rental_get_lessor_signature', { p_property_id: propertyId });
    if (error) throw rentalError(error, 'Could not load your signature');
    return z.string().nullable().parse(data);
  }

  async saveLessorSignature(propertyId: string, png: string): Promise<void> {
    const { error } = await getSupabase().from('rental_properties').update({ lessor_signature: signatureSchema.parse(png) })
      .eq('id', propertyId).select('id').single();
    if (error) throw rentalError(error, 'Could not save your signature');
  }
}
