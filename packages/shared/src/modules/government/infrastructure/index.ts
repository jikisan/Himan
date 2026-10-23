import { getSupabase } from '../../../config/index.js';
import { z } from 'zod';
import { governmentGroupNameSchema, governmentRecordSchema, validateGovernmentFile } from '../domain/index.js';
import type { GovernmentDocument, GovernmentGroup, GovernmentRecord, GovernmentRecordInput } from '../domain/index.js';

const BUCKET = 'government-documents';
const documentRow = z.object({
  id: z.string(), record_id: z.string(), user_id: z.string(), name: z.string(),
  mime_type: z.string(), size: z.number(), storage_path: z.string(), ready: z.boolean(),
}).transform((row): GovernmentDocument => ({
  id: row.id, recordId: row.record_id, userId: row.user_id, name: row.name,
  mimeType: row.mime_type, size: row.size, storagePath: row.storage_path, ready: row.ready,
}));
const groupRow = z.object({
  id: z.string(), user_id: z.string(), name: z.string(),
  kind: z.enum(['personal', 'business', 'custom']), created_at: z.string(),
}).transform((row): GovernmentGroup => ({
  id: row.id, userId: row.user_id, name: row.name, kind: row.kind, createdAt: row.created_at,
}));
const recordRow = z.object({
  id: z.string(), user_id: z.string(), group_id: z.string(), agency: z.string(), label: z.string(), registered_name: z.string(),
  number: z.string(), issue_date: z.string().nullable(), expiry_date: z.string().nullable(),
  notes: z.string(), deleting: z.boolean(), created_at: z.string(), updated_at: z.string(),
  documents: z.array(documentRow).default([]),
}).transform((row): GovernmentRecord => ({
  id: row.id, userId: row.user_id, groupId: row.group_id, agency: row.agency, label: row.label, registeredName: row.registered_name,
  number: row.number, issueDate: row.issue_date, expiryDate: row.expiry_date, notes: row.notes,
  deleting: row.deleting, createdAt: row.created_at, updatedAt: row.updated_at, documents: row.documents,
}));

export class GovernmentRepository {
  async findAll(userId: string): Promise<GovernmentRecord[]> {
    const records: GovernmentRecord[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await getSupabase().from('government_records')
        .select('*, documents:government_documents(*)').eq('user_id', userId)
        .order('created_at', { ascending: false }).order('id').range(offset, offset + 999);
      if (error) throw error;
      const page = z.array(recordRow).parse(data);
      records.push(...page);
      if (page.length < 1000) return records;
    }
  }

  /** Returns the user's groups, creating Personal and Business on first use. */
  async findGroups(userId: string): Promise<GovernmentGroup[]> {
    const read = async () => {
      const { data, error } = await getSupabase().from('government_groups').select('*').eq('user_id', userId);
      if (error) throw error;
      return z.array(groupRow).parse(data);
    };
    const groups = await read();
    if (groups.some((group) => group.kind === 'personal') && groups.some((group) => group.kind === 'business')) return groups;
    const { error } = await getSupabase().rpc('government_ensure_groups');
    if (error) throw error;
    return read();
  }

  async addGroup(userId: string, name: string): Promise<GovernmentGroup> {
    const { data, error } = await getSupabase().from('government_groups')
      .insert({ user_id: userId, name: governmentGroupNameSchema.parse(name) }).select('*').single();
    if (error) throw error;
    return groupRow.parse(data);
  }

  async renameGroup(userId: string, id: string, name: string): Promise<GovernmentGroup> {
    const { data, error } = await getSupabase().from('government_groups')
      .update({ name: governmentGroupNameSchema.parse(name) }).eq('id', id).eq('user_id', userId).select('*').single();
    if (error) throw error;
    return groupRow.parse(data);
  }

  /** Records in the group move to Personal in the same transaction. */
  async removeGroup(id: string): Promise<void> {
    const { error } = await getSupabase().rpc('government_delete_group', { p_group_id: id });
    if (error) throw error;
  }

  async save(userId: string, id: string | null, input: GovernmentRecordInput): Promise<GovernmentRecord> {
    const value = governmentRecordSchema.parse(input);
    const row = { agency: value.agency, label: value.label, registered_name: value.registeredName,
      number: value.number, issue_date: value.issueDate, expiry_date: value.expiryDate, notes: value.notes,
      ...(value.groupId ? { group_id: value.groupId } : {}) };
    const query = id
      ? getSupabase().from('government_records').update(row).eq('id', id).eq('user_id', userId).eq('deleting', false)
      : getSupabase().from('government_records').insert({ ...row, user_id: userId });
    const { data, error } = await query.select('*, documents:government_documents(*)').single();
    if (error) throw error;
    return recordRow.parse(data);
  }

  async upload(userId: string, recordId: string, file: { name: string; mimeType?: string | null; bytes: ArrayBuffer }): Promise<void> {
    const mimeType = validateGovernmentFile(file.name, file.mimeType, file.bytes.byteLength);
    // Reserve metadata first so interrupted uploads remain visible and removable.
    const { data: reserved, error: reservationError } = await getSupabase().from('government_documents').insert({
      record_id: recordId, user_id: userId, name: file.name, mime_type: mimeType,
      size: file.bytes.byteLength,
    }).select('*').single();
    if (reservationError) throw reservationError;
    const { id, storagePath: path } = documentRow.parse(reserved);
    try {
      const { error } = await getSupabase().storage.from(BUCKET).upload(path, file.bytes, {
        contentType: mimeType, upsert: false, cacheControl: '0',
      });
      if (error) throw error;
      const { error: updateError } = await getSupabase().from('government_documents').update({ ready: true })
        .eq('id', id).eq('user_id', userId).select('id').single();
      if (updateError) throw updateError;
    } catch (error) {
      try { await this.removeDocument(userId, id); }
      catch { throw new Error('Upload incomplete. Remove the incomplete attachment before retrying.'); }
      throw error;
    }
  }

  async removeDocument(userId: string, id: string): Promise<void> {
    const { data, error } = await getSupabase().from('government_documents').select('*')
      .eq('id', id).eq('user_id', userId).single();
    if (error) throw error;
    const document = documentRow.parse(data);
    const { error: fileError } = await getSupabase().storage.from(BUCKET).remove([document.storagePath]);
    if (fileError) throw fileError;
    const { error: rowError } = await getSupabase().from('government_documents').delete()
      .eq('id', id).eq('user_id', userId).select('id').single();
    if (rowError) throw rowError;
  }

  async remove(userId: string, id: string): Promise<void> {
    // Stop new attachment reservations before removing files; failed deletion is retryable.
    const { error } = await getSupabase().from('government_records').update({ deleting: true })
      .eq('id', id).eq('user_id', userId).select('id').single();
    if (error) throw error;
    for (;;) {
      const { data, error: documentsError } = await getSupabase().from('government_documents').select('id')
        .eq('record_id', id).eq('user_id', userId).limit(100);
      if (documentsError) throw documentsError;
      const documents = z.array(z.object({ id: z.string() })).parse(data);
      if (!documents.length) break;
      for (const document of documents) await this.removeDocument(userId, document.id);
    }
    const { error: deleteError } = await getSupabase().from('government_records').delete()
      .eq('id', id).eq('user_id', userId).select('id').single();
    if (deleteError) throw deleteError;
  }

  async documentUrl(userId: string, id: string, download = false): Promise<string> {
    const { data, error } = await getSupabase().from('government_documents').select('*')
      .eq('id', id).eq('user_id', userId).eq('ready', true).single();
    if (error) throw error;
    const document = documentRow.parse(data);
    const { data: signed, error: signedError } = await getSupabase().storage.from(BUCKET)
      .createSignedUrl(document.storagePath, 60, download ? { download: document.name } : undefined);
    if (signedError) throw signedError;
    return signed.signedUrl;
  }
}
