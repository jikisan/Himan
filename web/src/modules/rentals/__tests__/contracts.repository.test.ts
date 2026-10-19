import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractRepository, DEFAULT_CLAUSES, LinkRepository } from '@himan/shared/rentals';

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('@himan/shared/config', () => ({ getSupabase: () => mock }));

function result(data: unknown, error: unknown = null) {
  const value = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), insert: vi.fn(() => chain), update: vi.fn(() => chain),
    upsert: vi.fn(() => chain), delete: vi.fn(() => chain), order: vi.fn(() => chain),
    single: vi.fn(async () => value), maybeSingle: vi.fn(async () => value),
    then: (resolve: (response: typeof value) => unknown) => Promise.resolve(value).then(resolve),
  };
  return chain;
}
const textRow = { id: 'c1', property_id: 'p', contract_id: 'k', body: ['1. That'], special_terms: '', status: 'signed',
  sign_mode: 'esign', content_hash: 'ab', tenant_name: 'Ben', tenant_signature: 'data:image/png;base64,AA',
  tenant_signed_at: '2026-10-18T00:00:00Z', tenant_user_agent: 'x', lessor_signed_by: null, lessor_signed_at: null,
  lessor_signature: null, notarized_scan_path: null, created_at: '', updated_at: '' };
const details = { fullName: 'Ben Cruz', phone: '0917', address: 'Purok 2', emergencyName: 'Ana', emergencyPhone: '0918',
  facebook: '', email: '', occupants: 1, idPaths: ['tok/a.png'] };
const linkRow = { tenancy_id: 't', property_id: 'p', token: 'tok', kind: 'new', status: 'submitted', submitted_details: details,
  submitted_at: '2026-10-18T00:00:00Z', accepted_at: null, revoked_at: null, created_at: '' };
const png = 'data:image/png;base64,iVBORw0KGgo=';
const HASH = 'a'.repeat(64);
const INVALID = 'This link isn\'t valid anymore';

beforeEach(() => { mock.from.mockReset(); mock.rpc.mockReset(); mock.storage.from.mockReset(); });

describe('ContractRepository', () => {
  it('maps contract texts', async () => {
    mock.from.mockReturnValue(result([textRow]));
    const [text] = await new ContractRepository().findTexts();
    expect(mock.from).toHaveBeenCalledWith('rental_contract_texts');
    expect(text).toMatchObject({ id: 'c1', contractId: 'k', body: ['1. That'], status: 'signed', signMode: 'esign', tenantSignedAt: '2026-10-18T00:00:00Z' });
  });
  it('falls back to the default template when the property has none', async () => {
    mock.from.mockReturnValue(result(null));
    expect(await new ContractRepository().getTemplate('p')).toEqual(DEFAULT_CLAUSES);
    mock.from.mockReturnValue(result({ clauses: [{ id: 'a', text: 'A' }] }));
    expect(await new ContractRepository().getTemplate('p')).toEqual([{ id: 'a', text: 'A' }]);
  });
  it('saves a template and refuses an empty one', async () => {
    const query = result({ property_id: 'p' });
    mock.from.mockReturnValue(query);
    await new ContractRepository().saveTemplate('p', [{ id: 'a', text: 'A' }]);
    expect(query.upsert).toHaveBeenCalledWith({ property_id: 'p', clauses: [{ id: 'a', text: 'A' }] });
    await expect(new ContractRepository().saveTemplate('p', [])).rejects.toThrow('at least one clause');
  });
  it('creates a draft text and returns its id', async () => {
    const query = result({ id: 'c1' });
    mock.from.mockReturnValue(query);
    expect(await new ContractRepository().createText('k', 'p', ['a'], ' no pets ', 'esign')).toBe('c1');
    expect(query.insert).toHaveBeenCalledWith({ contract_id: 'k', property_id: 'p', body: ['a'], special_terms: 'no pets', sign_mode: 'esign' });
  });
  it('updates only the given fields', async () => {
    const query = result({ id: 'c1' });
    mock.from.mockReturnValue(query);
    await new ContractRepository().updateText('c1', { specialTerms: 'x' });
    expect(query.update).toHaveBeenCalledWith({ special_terms: 'x' });
  });
  it('sends and countersigns through RPCs, passing database messages through', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null });
    await new ContractRepository().send('c1');
    await new ContractRepository().countersign('c1');
    expect(mock.rpc).toHaveBeenNthCalledWith(1, 'rental_send_contract', { p_contract_text_id: 'c1' });
    expect(mock.rpc).toHaveBeenNthCalledWith(2, 'rental_countersign', { p_contract_text_id: 'c1', p_signature: null });
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'The tenant hasn’t signed yet' } });
    await expect(new ContractRepository().countersign('c1', png)).rejects.toThrow('The tenant hasn’t signed yet');
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'internal relation rental_x' } });
    await expect(new ContractRepository().send('c1')).rejects.toThrow('Could not send the contract');
  });
  it('uploads the notarized scan under the property’s contract folder, then records it', async () => {
    mock.from.mockReturnValue(result({ property_id: 'p' }));
    const upload = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload });
    mock.rpc.mockResolvedValue({ data: null, error: null });
    await new ContractRepository().setNotarizedScan('c1', { name: 'scan.pdf', mimeType: 'application/pdf', bytes: new ArrayBuffer(4) });
    expect(mock.storage.from).toHaveBeenCalledWith('rental-files');
    const path = (upload.mock.calls[0] as unknown[])[0] as string;
    expect(path).toMatch(/^p\/contracts\/c1\/[0-9a-f]{32}\.pdf$/);
    expect(mock.rpc).toHaveBeenCalledWith('rental_set_notarized_scan', { p_contract_text_id: 'c1', p_path: path });
  });
  it('saves the lessor signature only as a small PNG data URL', async () => {
    const query = result({ id: 'p' });
    mock.from.mockReturnValue(query);
    await new ContractRepository().saveLessorSignature('p', png);
    expect(query.update).toHaveBeenCalledWith({ lessor_signature: png });
    await expect(new ContractRepository().saveLessorSignature('p', 'data:image/jpeg;base64,AA')).rejects.toThrow('signature');
    await expect(new ContractRepository().saveLessorSignature('p', png + 'A'.repeat(150_000))).rejects.toThrow('signature');
  });
});

describe('LinkRepository manager side', () => {
  it('reads the saved signature through the owner-only RPC', async () => {
    mock.rpc.mockResolvedValue({ data: png, error: null });
    expect(await new ContractRepository().getLessorSignature('p')).toBe(png);
    expect(mock.rpc).toHaveBeenCalledWith('rental_get_lessor_signature', { p_property_id: 'p' });
    mock.rpc.mockResolvedValue({ data: null, error: null });
    expect(await new ContractRepository().getLessorSignature('p')).toBeNull();
  });
  it('deletes the old ID uploads before reopening, even if the cleanup fails', async () => {
    mock.from.mockReturnValue(result(linkRow));
    const remove = vi.fn(async () => ({ data: null, error: null }));
    mock.storage.from.mockReturnValue({ remove });
    mock.rpc.mockResolvedValue({ data: null, error: null });
    await new LinkRepository().reopen('t');
    expect(mock.storage.from).toHaveBeenCalledWith('rental-link-uploads');
    expect(remove).toHaveBeenCalledWith(['tok/a.png']);
    expect(mock.rpc).toHaveBeenCalledWith('rental_reopen_link', { p_tenancy_id: 't' });
    remove.mockRejectedValueOnce(new Error('offline'));
    await new LinkRepository().reopen('t');
    expect(mock.rpc).toHaveBeenCalledTimes(2);
  });
  it('keeps submitted details without a people count', async () => {
    mock.from.mockReturnValue(result([{ ...linkRow, submitted_details: { ...details, occupants: null } }]));
    const [link] = await new LinkRepository().findAll();
    expect(link.submittedDetails).toMatchObject({ fullName: 'Ben Cruz', occupants: null });
  });
  it('creates, revokes and reopens links through RPCs', async () => {
    mock.from.mockReturnValue(result({ ...linkRow, status: 'open', submitted_details: null }));
    mock.rpc.mockResolvedValue({ data: 'tok', error: null });
    expect(await new LinkRepository().createLink('t', 'new')).toBe('tok');
    await new LinkRepository().revoke('t');
    await new LinkRepository().reopen('t');
    expect(mock.rpc.mock.calls).toEqual([
      ['rental_create_link', { p_tenancy_id: 't', p_kind: 'new' }],
      ['rental_revoke_link', { p_tenancy_id: 't' }],
      ['rental_reopen_link', { p_tenancy_id: 't' }],
    ]);
  });
  it('maps links with their submitted details', async () => {
    mock.from.mockReturnValue(result([linkRow]));
    const [link] = await new LinkRepository().findAll();
    expect(link).toMatchObject({ tenancyId: 't', token: 'tok', kind: 'new', status: 'submitted', submittedDetails: details });
  });
  it('copies the ID files into the tenant’s files, accepts, then clears the uploads', async () => {
    const inserts: ReturnType<typeof vi.fn>[] = [];
    mock.from.mockImplementation((table: string) => {
      if (table === 'rental_tenancy_links') return result(linkRow);
      if (table === 'rental_tenancies') return result({ renter_id: 'r', property_id: 'p' });
      const reserve = result({ id: 'f', renter_id: 'r', property_id: 'p', name: 'ID 1.png', mime_type: 'image/png', size: 3,
        storage_path: 'p/renters/r/f', ready: false });
      inserts.push(reserve.insert);
      return reserve;
    });
    const download = vi.fn(async () => ({ data: new Blob(['abc'], { type: 'image/png' }), error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    const upload = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockImplementation((bucket: string) => (bucket === 'rental-link-uploads' ? { download, remove } : { upload }));
    mock.rpc.mockResolvedValue({ data: { idPaths: ['tok/a.png'] }, error: null });
    await new LinkRepository().acceptDetails('t');
    expect(download).toHaveBeenCalledWith('tok/a.png');
    expect(inserts[0]).toHaveBeenCalledWith(expect.objectContaining({ renter_id: 'r', property_id: 'p', name: 'ID 1.png', mime_type: 'image/png', size: 3 }));
    expect(upload).toHaveBeenCalledWith('p/renters/r/f', expect.any(ArrayBuffer), expect.objectContaining({ contentType: 'image/png' }));
    expect(mock.rpc).toHaveBeenCalledWith('rental_accept_details', { p_tenancy_id: 't' });
    expect(remove).toHaveBeenCalledWith(['tok/a.png']);
  });
  it('refuses submitted ID paths outside the link folder before downloading anything', async () => {
    // 'other/a.png' is a plain file in someone else's folder; the rest are not plain files at all (read as "no details").
    for (const [bad, message] of [['other/a.png', 'These details can’t be accepted'], ['tok/../x/a.png', 'There are no details to review'],
      ['tok/sub/a.png', 'There are no details to review'], ['tok/a.exe', 'There are no details to review'],
      ['../tok/a.png', 'There are no details to review']]) {
      mock.from.mockImplementation((table: string) => result(table === 'rental_tenancy_links'
        ? { ...linkRow, submitted_details: { ...(linkRow.submitted_details as object), idPaths: [bad] } } : { renter_id: 'r', property_id: 'p' }));
      const download = vi.fn();
      mock.storage.from.mockReturnValue({ download, remove: vi.fn() });
      mock.rpc.mockReset();
      await expect(new LinkRepository().acceptDetails('t')).rejects.toThrow(message);
      expect(download).not.toHaveBeenCalled();
      expect(mock.rpc).not.toHaveBeenCalled();
    }
  });
  it('does not accept when an ID file can’t be copied', async () => {
    mock.from.mockImplementation((table: string) => result(table === 'rental_tenancy_links' ? linkRow : { renter_id: 'r', property_id: 'p' }));
    mock.storage.from.mockReturnValue({ download: vi.fn(async () => ({ data: null, error: { __isStorageError: true, message: 'Object not found' } })) });
    await expect(new LinkRepository().acceptDetails('t')).rejects.toThrow('Could not copy the ID files');
    expect(mock.rpc).not.toHaveBeenCalled();
  });
});

describe('LinkRepository public side', () => {
  const publicLink = { kind: 'existing', status: 'open', tenantName: 'Ben',
    property: { name: 'House', address: 'Lot 1', lessorName: 'Ana', lessorCapacity: 'owner', signingCity: 'Cebu', invoicePrefix: 'INV' },
    contract: { id: 'c1', status: 'sent', body: ['a'], specialTerms: '', signMode: null, tenantSignedAt: null, lessorSigned: false, contentHash: null },
    bills: [], payments: [], accounts: [] };
  it('reads the link and passes the uniform invalid-link message through', async () => {
    mock.rpc.mockResolvedValue({ data: publicLink, error: null });
    expect(await new LinkRepository().getPublic('tok')).toMatchObject({ kind: 'existing', contract: { id: 'c1', body: ['a'] } });
    expect(mock.rpc).toHaveBeenCalledWith('rental_link_get', { p_token: 'tok' });
    const receipt = { applied: [{ billId: 'b1', number: 'INV-1', amount: 500 }], creditCentavos: 0, balanceCentavos: 0 };
    mock.rpc.mockResolvedValue({ data: { ...publicLink, roomName: 'Room A',
      contract: { ...publicLink.contract, status: 'signed', tenantName: 'Ben Cruz', tenantSignature: 'data:image/png;base64,AA' },
      payments: [{ id: 'pay1', createdAt: 'x', paidOn: '2026-10-01', amount: 500, method: 'cash', reference: '', billNumbers: ['INV-1'], receipt }] },
      error: null });
    expect(await new LinkRepository().getPublic('tok')).toMatchObject({ roomName: 'Room A',
      contract: { tenantName: 'Ben Cruz', tenantSignature: 'data:image/png;base64,AA' }, payments: [{ id: 'pay1', receipt }] });
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: INVALID } });
    await expect(new LinkRepository().getPublic('old')).rejects.toThrow(INVALID);
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.rental_link_get' } });
    await expect(new LinkRepository().getPublic('old')).rejects.toThrow('Could not open this link');
  });
  it('uploads an ID into the link’s folder and hides storage errors', async () => {
    const upload = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload });
    const path = await new LinkRepository().uploadId('tok', { name: 'id.JPG', mimeType: 'image/jpeg', bytes: new ArrayBuffer(3) });
    expect(mock.storage.from).toHaveBeenCalledWith('rental-link-uploads');
    // The storage policy accepts only a UUID name under the token folder.
    expect(path).toMatch(/^tok\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/);
    expect(upload).toHaveBeenCalledWith(path, expect.any(ArrayBuffer), expect.objectContaining({ contentType: 'image/jpeg', upsert: false }));
    upload.mockResolvedValue({ error: { __isStorageError: true, message: 'new row violates row-level security policy' } } as never);
    await expect(new LinkRepository().uploadId('tok', { name: 'id.png', bytes: new ArrayBuffer(3) })).rejects.toThrow('Could not upload the ID');
    await expect(new LinkRepository().uploadId('tok', { name: 'id.gif', bytes: new ArrayBuffer(3) })).rejects.toThrow('PDF, JPEG, or PNG');
  });
  it('submits trimmed details and requires the ID', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null });
    await new LinkRepository().submitDetails('tok', { ...details, fullName: ' Ben Cruz ' });
    expect(mock.rpc).toHaveBeenCalledWith('rental_link_submit_details', { p_token: 'tok', p_details: details });
    await expect(new LinkRepository().submitDetails('tok', { ...details, idPaths: [] })).rejects.toThrow('photo of a valid ID');
    await expect(new LinkRepository().submitDetails('tok', { ...details, emergencyPhone: '' })).rejects.toThrow('emergency');
  });
  it('signs with a PNG signature and passes refusals through', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null });
    await new LinkRepository().sign('tok', { name: ' Ben Cruz ', signMode: 'notarize', signature: png, userAgent: 'ua', contentHash: HASH });
    expect(mock.rpc).toHaveBeenCalledWith('rental_link_sign', { p_token: 'tok', p_name: 'Ben Cruz', p_sign_mode: 'notarize',
      p_signature: png, p_user_agent: 'ua', p_content_hash: HASH });
    // Without the hash of the text that was read, nothing is sent at all.
    mock.rpc.mockClear();
    await expect(new LinkRepository().sign('tok', { name: 'Ben', signMode: 'esign', signature: png, userAgent: '', contentHash: '' }))
      .rejects.toThrow('reload');
    expect(mock.rpc).not.toHaveBeenCalled();
    await expect(new LinkRepository().sign('tok', { name: 'Ben', signMode: 'esign', signature: 'x', userAgent: '', contentHash: HASH })).rejects.toThrow('signature');
    await expect(new LinkRepository().sign('tok', { name: ' ', signMode: 'esign', signature: png, userAgent: '', contentHash: HASH })).rejects.toThrow('full name');
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'This contract is already signed' } });
    await expect(new LinkRepository().sign('tok', { name: 'Ben', signMode: 'esign', signature: png, userAgent: '', contentHash: HASH }))
      .rejects.toThrow('This contract is already signed');
  });
});
