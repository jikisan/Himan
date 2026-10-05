import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GOVERNMENT_FILE_LIMIT, filterGovernmentRecords, governmentRecordSchema, maskGovernmentNumber,
  validateGovernmentFile, GovernmentRepository } from '@himan/shared/government';
import type { GovernmentRecord } from '@himan/shared/government';

const mock = vi.hoisted(() => ({ from: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('@himan/shared/config', () => ({ getSupabase: () => mock }));

const input = { agency: 'PhilHealth', label: 'My membership', registeredName: 'Test Person', number: '001-234-567',
  issueDate: null, expiryDate: null, notes: '' };
const document = { id: 'doc', record_id: 'record', user_id: 'owner', name: 'ID.pdf', mime_type: 'application/pdf',
  size: 10, storage_path: 'owner/record/doc', ready: false };

function result(data: unknown, error: unknown = null) {
  const value = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), insert: vi.fn(() => chain),
    update: vi.fn(() => chain), delete: vi.fn(() => chain), limit: vi.fn(() => chain),
    order: vi.fn(() => chain), range: vi.fn(() => chain), single: vi.fn(async () => value),
    then: (resolve: (response: typeof value) => unknown) => Promise.resolve(value).then(resolve),
  };
  return chain;
}

beforeEach(() => { vi.clearAllMocks(); mock.from.mockReset(); mock.storage.from.mockReset(); });

describe('government records', () => {
  it('accepts document-only records and custom types without changing identifier formatting', () => {
    expect(governmentRecordSchema.parse(input).number).toBe('001-234-567');
    expect(governmentRecordSchema.parse({ ...input, agency: 'PRC license', number: '' }).number).toBe('');
    expect(governmentRecordSchema.safeParse({ ...input, registeredName: ' ' }).success).toBe(false);
  });
  it('rejects invalid calendar dates and expiry before issue date', () => {
    expect(governmentRecordSchema.safeParse({ ...input, issueDate: '2026-02-30' }).success).toBe(false);
    expect(governmentRecordSchema.safeParse({ ...input, issueDate: '2026-01-02', expiryDate: '2026-01-01' }).success).toBe(false);
  });
  it('never reveals short identifiers through the masked display', () => {
    expect(maskGovernmentNumber('1234')).toBe('••••');
    expect(maskGovernmentNumber('123')).toBe('••••');
    expect(maskGovernmentNumber(input.number)).toBe('•••• -567');
    expect(maskGovernmentNumber('')).toBe('No number saved');
  });
  it('finds records by attached filename without collapsing multiple records of the same type', () => {
    const record = { ...input, id: 'record', userId: 'owner', deleting: false, createdAt: '', updatedAt: '',
      documents: [{ id: 'doc', name: 'Membership.pdf' }] } as GovernmentRecord;
    expect(filterGovernmentRecords([record, { ...record, id: 'second' }], ' membership.PDF ').length).toBe(2);
  });
  it('enforces the type and size limit before upload', () => {
    expect(validateGovernmentFile('id.PDF', '', GOVERNMENT_FILE_LIMIT)).toBe('application/pdf');
    expect(() => validateGovernmentFile('id.pdf', 'text/html', 10)).toThrow('PDF, JPEG, or PNG');
    expect(() => validateGovernmentFile('id.pdf', 'application/pdf', 0)).toThrow('non-empty');
    expect(() => validateGovernmentFile('id.pdf', 'application/pdf', GOVERNMENT_FILE_LIMIT + 1)).toThrow('10 MB');
  });
});

describe('government file lifecycle', () => {
  const repository = new GovernmentRepository();
  it('removes a failed upload before deleting reserved metadata', async () => {
    const reservation = result(document);
    const lookup = result(document);
    const cleanup = result({ id: 'doc' });
    mock.from.mockReturnValueOnce(reservation).mockReturnValueOnce(lookup).mockReturnValueOnce(cleanup);
    const upload = vi.fn(async () => ({ error: new Error('Upload failed') }));
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload, remove });
    await expect(repository.upload('owner', 'record', { name: 'ID.pdf', mimeType: 'application/pdf', bytes: new ArrayBuffer(10) })).rejects.toThrow('Upload failed');
    expect(remove).toHaveBeenCalledWith(['owner/record/doc']);
    expect(cleanup.delete).toHaveBeenCalledOnce();
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(cleanup.delete.mock.invocationCallOrder[0]);
    expect(lookup.eq).toHaveBeenCalledWith('user_id', 'owner');
  });
  it('keeps cleanup metadata when storage removal fails', async () => {
    mock.from.mockReturnValueOnce(result(document)).mockReturnValueOnce(result(document));
    mock.storage.from.mockReturnValue({ upload: vi.fn(async () => ({ error: new Error('Upload failed') })),
      remove: vi.fn(async () => ({ error: new Error('Storage unavailable') })) });
    await expect(repository.upload('owner', 'record', { name: 'ID.pdf', mimeType: 'application/pdf', bytes: new ArrayBuffer(10) })).rejects.toThrow('Upload incomplete');
    expect(mock.from).toHaveBeenCalledTimes(2);
  });
  it('retains a record for retry if any file cannot be removed', async () => {
    const tombstone = result({ id: 'record' });
    mock.from.mockReturnValueOnce(tombstone).mockReturnValueOnce(result([{ id: 'doc' }])).mockReturnValueOnce(result(document));
    mock.storage.from.mockReturnValue({ remove: vi.fn(async () => ({ error: new Error('Storage unavailable') })) });
    await expect(repository.remove('owner', 'record')).rejects.toThrow('Storage unavailable');
    expect(tombstone.update).toHaveBeenCalledWith({ deleting: true });
    expect(tombstone.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(mock.from).toHaveBeenCalledTimes(3);
  });
  it('creates only short-lived private download URLs for owned, completed documents', async () => {
    const lookup = result({ ...document, ready: true });
    mock.from.mockReturnValue(lookup);
    const signed = vi.fn(async () => ({ data: { signedUrl: 'https://example.com/signed' }, error: null }));
    mock.storage.from.mockReturnValue({ createSignedUrl: signed });
    await expect(repository.documentUrl('owner', 'doc', true)).resolves.toBe('https://example.com/signed');
    expect(lookup.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(lookup.eq).toHaveBeenCalledWith('ready', true);
    expect(signed).toHaveBeenCalledWith('owner/record/doc', 60, { download: 'ID.pdf' });
  });
});
