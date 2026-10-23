import { getSupabase } from '../../../config/index.js';
import { z } from 'zod';
import { receiptSchema, validateReceiptPhoto } from '../domain/index.js';
import type { Receipt, ReceiptInput } from '../domain/index.js';

const BUCKET = 'receipts';
const receiptRow = z.object({
  id: z.string(), user_id: z.string(), merchant: z.string(), amount: z.coerce.number(), purchased_on: z.string(),
  note: z.string(), tags: z.array(z.string()), warranty_ends_on: z.string().nullable(), expires_on: z.string().nullable(),
  photo_path: z.string(), created_at: z.string(), updated_at: z.string(),
}).transform((row): Receipt => ({
  id: row.id, userId: row.user_id, merchant: row.merchant, amount: row.amount, purchasedOn: row.purchased_on,
  note: row.note, tags: row.tags, warrantyEndsOn: row.warranty_ends_on, expiresOn: row.expires_on,
  photoPath: row.photo_path, createdAt: row.created_at, updatedAt: row.updated_at,
}));

export class ReceiptRepository {
  async findAll(userId: string): Promise<Receipt[]> {
    const receipts: Receipt[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await getSupabase().from('receipts').select('*').eq('user_id', userId)
        .order('purchased_on', { ascending: false }).order('id').range(offset, offset + 999);
      if (error) throw error;
      const page = z.array(receiptRow).parse(data);
      receipts.push(...page);
      if (page.length < 1000) return receipts;
    }
  }

  /** Creates or updates a receipt. A new receipt needs a photo; an edit may keep its current one. */
  async save(userId: string, id: string | null, input: ReceiptInput, photo?: ArrayBuffer): Promise<Receipt> {
    const value = receiptSchema.parse(input);
    if (!id && !photo) throw new Error('Add a photo of the receipt');
    if (photo) validateReceiptPhoto(photo.byteLength);
    const row = { merchant: value.merchant, amount: value.amount, purchased_on: value.purchasedOn, note: value.note,
      tags: value.tags, warranty_ends_on: value.warrantyEndsOn, expires_on: value.expiresOn };
    const query = id
      ? getSupabase().from('receipts').update(row).eq('id', id).eq('user_id', userId)
      : getSupabase().from('receipts').insert({ ...row, user_id: userId });
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    const receipt = receiptRow.parse(data);
    if (!photo) return receipt;
    const { error: uploadError } = await getSupabase().storage.from(BUCKET).upload(receipt.photoPath, photo, {
      contentType: 'image/jpeg', upsert: true, cacheControl: '0',
    });
    if (uploadError) {
      // Do not leave a new receipt without its photo; an edit keeps its old photo.
      if (!id) await getSupabase().from('receipts').delete().eq('id', receipt.id).eq('user_id', userId);
      throw uploadError;
    }
    return receipt;
  }

  async remove(userId: string, receipt: Pick<Receipt, 'id' | 'photoPath'>): Promise<void> {
    const { error: fileError } = await getSupabase().storage.from(BUCKET).remove([receipt.photoPath]);
    if (fileError) throw fileError;
    const { error } = await getSupabase().from('receipts').delete().eq('id', receipt.id).eq('user_id', userId).select('id').single();
    if (error) throw error;
  }

  /** One-hour links for the photos, keyed by photo path. */
  async photoUrls(paths: string[]): Promise<Record<string, string>> {
    if (!paths.length) return {};
    const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrls(paths, 3600);
    if (error) throw error;
    const urls: Record<string, string> = {};
    for (const item of data) if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
    return urls;
  }
}
