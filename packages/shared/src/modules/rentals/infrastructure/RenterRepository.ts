import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { renterSchema, validateRentalFile } from '../domain/index.js';
import type { Renter, RenterInput } from '../domain/index.js';
import { fileRow, renterRow, rentalError } from './rows.js';

const BUCKET = 'rental-files';

export class RenterRepository {
  // Viewers get files: [] because RLS hides rental_renter_files from them.
  async findAll(): Promise<Renter[]> {
    const { data, error } = await getSupabase().from('rental_renters')
      .select('*, files:rental_renter_files(*)').order('full_name').order('id');
    if (error) throw rentalError(error, 'Could not load renters');
    return z.array(renterRow).parse(data);
  }

  async save(propertyId: string, id: string | null, input: RenterInput): Promise<string> {
    const v = renterSchema.parse(input);
    const row = { full_name: v.fullName, phone: v.phone, facebook: v.facebook, email: v.email, address: v.address,
      emergency_name: v.emergencyName, emergency_phone: v.emergencyPhone, occupants: v.occupants, notes: v.notes };
    const query = id ? getSupabase().from('rental_renters').update(row).eq('id', id)
      : getSupabase().from('rental_renters').insert({ ...row, property_id: propertyId });
    const { data, error } = await query.select('id').single();
    if (error) throw rentalError(error, 'Could not save renter');
    return z.object({ id: z.string() }).parse(data).id;
  }

  async remove(id: string): Promise<void> {
    // Check history first: files are deleted before the row, so a later FK failure
    // would otherwise leave the renter without their ID.
    const { data: history, error: historyError } = await getSupabase().from('rental_tenancies')
      .select('id').eq('renter_id', id).limit(1);
    if (historyError) throw rentalError(historyError, 'Could not remove renter');
    if (z.array(z.unknown()).parse(history).length) throw new Error('This renter has tenancy history and can’t be deleted');
    const { data, error } = await getSupabase().from('rental_renter_files').select('id').eq('renter_id', id);
    if (error) throw rentalError(error, 'Could not remove renter');
    for (const file of z.array(z.object({ id: z.string() })).parse(data)) await this.removeFile(file.id);
    const { error: deleteError } = await getSupabase().from('rental_renters').delete().eq('id', id).select('id').single();
    if (deleteError) throw rentalError(deleteError, 'This renter has tenancy history and can’t be deleted');
  }

  async upload(renterId: string, propertyId: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void> {
    const mimeType = validateRentalFile(file.name, file.mimeType, file.bytes.byteLength);
    // Reserve metadata first so interrupted uploads stay visible and removable.
    const { data: reserved, error: reserveError } = await getSupabase().from('rental_renter_files').insert({
      renter_id: renterId, property_id: propertyId, name: file.name, mime_type: mimeType, size: file.bytes.byteLength,
    }).select('*').single();
    if (reserveError) throw rentalError(reserveError, 'Could not attach file');
    const { id, storagePath } = fileRow.parse(reserved);
    try {
      const { error } = await getSupabase().storage.from(BUCKET).upload(storagePath, file.bytes,
        { contentType: mimeType, upsert: false, cacheControl: '0' });
      if (error) throw error;
      const { error: readyError } = await getSupabase().from('rental_renter_files').update({ ready: true })
        .eq('id', id).select('id').single();
      if (readyError) throw readyError;
    } catch (error) {
      try { await this.removeFile(id); }
      catch { throw new Error('Upload incomplete. Remove the incomplete attachment before retrying.'); }
      throw error;
    }
  }

  async removeFile(id: string): Promise<void> {
    const { data, error } = await getSupabase().from('rental_renter_files').select('*').eq('id', id).single();
    if (error) throw rentalError(error, 'Could not remove file');
    const file = fileRow.parse(data);
    const { error: storageError } = await getSupabase().storage.from(BUCKET).remove([file.storagePath]);
    if (storageError) throw storageError;
    const { error: rowError } = await getSupabase().from('rental_renter_files').delete().eq('id', id).select('id').single();
    if (rowError) throw rentalError(rowError, 'Could not remove file');
  }

  async fileUrl(id: string, download = false): Promise<string> {
    const { data, error } = await getSupabase().from('rental_renter_files').select('*')
      .eq('id', id).eq('ready', true).single();
    if (error) throw rentalError(error, 'Could not open file');
    const file = fileRow.parse(data);
    const { data: signed, error: signError } = await getSupabase().storage.from(BUCKET)
      .createSignedUrl(file.storagePath, 60, download ? { download: file.name } : undefined);
    if (signError) throw signError;
    return signed.signedUrl;
  }
}
