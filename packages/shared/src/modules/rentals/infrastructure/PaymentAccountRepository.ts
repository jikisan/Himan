import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { paymentAccountSchema } from '../domain/index.js';
import type { PaymentAccount, PaymentAccountInput } from '../domain/index.js';
import { paymentAccountRow, rentalError } from './rows.js';

const BUCKET = 'rental-qr';
const QR_LIMIT = 2 * 1024 * 1024;
const QR_TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };
const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const table = () => getSupabase().from('rental_payment_accounts');

export class PaymentAccountRepository {
  async findAll(): Promise<PaymentAccount[]> {
    const { data, error } = await table().select('*').order('position').order('created_at');
    if (error) throw rentalError(error, 'Could not load payment accounts');
    return z.array(paymentAccountRow).parse(data);
  }

  async save(propertyId: string, id: string | null, input: PaymentAccountInput): Promise<string> {
    const v = paymentAccountSchema.parse(input);
    const row = { kind: v.kind, label: v.label, account_name: v.accountName, account_number: v.accountNumber, position: v.position };
    const query = id ? table().update(row).eq('id', id) : table().insert({ property_id: propertyId, ...row });
    const { data, error } = await query.select('id').single();
    if (error) throw rentalError(error, 'Could not save the payment account');
    return z.object({ id: z.string() }).parse(data).id;
  }

  async remove(id: string): Promise<void> {
    const { data, error } = await table().select('*').eq('id', id).single();
    if (error) throw rentalError(error, 'Could not delete the payment account');
    const { qrPath } = paymentAccountRow.parse(data);
    if (qrPath) {
      const { error: storageError } = await getSupabase().storage.from(BUCKET).remove([qrPath]);
      if (storageError) throw storageError;
    }
    const { error: rowError } = await table().delete().eq('id', id).select('id').single();
    if (rowError) throw rentalError(rowError, 'Could not delete the payment account');
  }

  async uploadQr(propertyId: string, accountId: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void> {
    const mimeType = file.mimeType || QR_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''];
    if (!mimeType || !EXT[mimeType]) throw new Error('Choose a PNG, JPEG, or WebP image');
    const size = file.bytes.byteLength;
    if (size <= 0 || size > QR_LIMIT) throw new Error('Choose a non-empty image up to 2 MB');
    const { data, error } = await table().select('qr_path').eq('id', accountId).single();
    if (error) throw rentalError(error, 'Could not upload the QR code');
    const old = z.object({ qr_path: z.string().nullable() }).parse(data).qr_path;
    // A new name each time, so the public URL never serves a cached old QR.
    const path = `${propertyId}/${accountId}-${Date.now()}.${EXT[mimeType]}`;
    const storage = getSupabase().storage.from(BUCKET);
    const { error: uploadError } = await storage.upload(path, file.bytes, { contentType: mimeType, upsert: false });
    if (uploadError) throw uploadError;
    const { error: saveError } = await table().update({ qr_path: path }).eq('id', accountId).select('id').single();
    if (saveError) {
      await storage.remove([path]);
      throw rentalError(saveError, 'Could not upload the QR code');
    }
    // ponytail: a failed delete leaves an orphaned public object; nothing points at it.
    if (old) await storage.remove([old]);
  }

  qrUrl(path: string): string {
    return getSupabase().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }
}
