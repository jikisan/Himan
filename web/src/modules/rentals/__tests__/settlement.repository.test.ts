import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SettlementRepository } from '@himan/shared/rentals';

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('@himan/shared/config', () => ({ getSupabase: () => mock }));

function result(data: unknown, error: unknown = null) {
  const value = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), insert: vi.fn(() => chain), update: vi.fn(() => chain),
    delete: vi.fn(() => chain), order: vi.fn(() => chain), single: vi.fn(async () => value),
    then: (resolve: (response: typeof value) => unknown) => Promise.resolve(value).then(resolve),
  };
  return chain;
}
const proofRow = { id: 'f', settlement_id: 's', property_id: 'p', name: 'refund.png', mime_type: 'image/png', size: 10,
  storage_path: 'p/settlements/s/f', ready: false };
const settlementRow = { id: 's', property_id: 'p', tenancy_id: 't', deposit_centavos: 1000000, unpaid_bills_centavos: 200000,
  lines: [{ label: 'Cleaning', amount: 50000 }], forfeit: false, refund_centavos: 750000, owed_centavos: 0, refunded_on: '2027-04-02',
  refund_method: 'gcash', refund_reference: 'REF', notes: '', status: 'settled', created_at: '', settled_at: '2027-04-02T00:00:00Z',
  settled_by: 'u', proofs: [{ ...proofRow, ready: true }] };
const input = { lines: [{ label: ' Cleaning ', amount: 50000 }], forfeit: false, refundedOn: '2027-04-02', refundMethod: 'gcash' as const,
  refundReference: ' REF ', notes: '' };
const storageError = () => Object.assign(new Error('new row violates row-level security policy'), { __isStorageError: true, statusCode: '403' });

beforeEach(() => { vi.clearAllMocks(); mock.from.mockReset(); mock.rpc.mockReset(); mock.storage.from.mockReset(); });

describe('SettlementRepository', () => {
  it('loads settlements with their proofs', async () => {
    const query = result([settlementRow]);
    mock.from.mockReturnValue(query);
    const [s] = await new SettlementRepository().findAll();
    expect(mock.from).toHaveBeenCalledWith('rental_settlements');
    expect(query.select).toHaveBeenCalledWith('*, proofs:rental_settlement_proofs(*)');
    expect(s).toEqual({ id: 's', propertyId: 'p', tenancyId: 't', depositCentavos: 1000000, unpaidBillsCentavos: 200000,
      lines: [{ label: 'Cleaning', amount: 50000 }], forfeit: false, refundCentavos: 750000, owedCentavos: 0, refundedOn: '2027-04-02',
      refundMethod: 'gcash', refundReference: 'REF', notes: '', status: 'settled', settledAt: '2027-04-02T00:00:00Z',
      proofs: [{ id: 'f', settlementId: 's', propertyId: 'p', name: 'refund.png', mimeType: 'image/png', size: 10,
        storagePath: 'p/settlements/s/f', ready: true }] });
  });
  it('settles through the RPC with the contract arguments', async () => {
    mock.rpc.mockResolvedValue({ data: 's', error: null });
    await expect(new SettlementRepository().settle('t', input)).resolves.toBe('s');
    expect(mock.rpc).toHaveBeenCalledWith('rental_settle_deposit', { p_tenancy_id: 't', p_lines: [{ label: 'Cleaning', amount: 50000 }],
      p_forfeit: false, p_refunded_on: '2027-04-02', p_refund_method: 'gcash', p_refund_reference: 'REF', p_notes: '' });
  });
  it('refuses an invalid settlement before calling the database', async () => {
    await expect(new SettlementRepository().settle('t', { ...input, lines: [{ label: '', amount: 0 }] })).rejects.toThrow();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('passes the database’s messages through and hides technical ones', async () => {
    for (const message of ['No deposit to settle', 'This deposit is already settled', 'Only managers can settle deposits']) {
      mock.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message } });
      await expect(new SettlementRepository().settle('t', input)).rejects.toThrow(message);
    }
    mock.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
    await expect(new SettlementRepository().settle('t', input)).rejects.toThrow('Could not settle the deposit');
    mock.from.mockReturnValueOnce(result(null, { code: 'PGRST116', message: 'raw' }));
    await expect(new SettlementRepository().findAll()).rejects.toThrow('Could not load settlements');
  });
  it('removes a failed proof upload’s object before its reserved metadata', async () => {
    const reserve = result(proofRow);
    const cleanup = result({ id: 'f' });
    mock.from.mockReturnValueOnce(reserve).mockReturnValueOnce(result(proofRow)).mockReturnValueOnce(cleanup);
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload: vi.fn(async () => ({ error: new Error('Upload failed') })), remove });
    await expect(new SettlementRepository().uploadProof('s', 'p', { name: 'refund.png', mimeType: 'image/png', bytes: new ArrayBuffer(10) }))
      .rejects.toThrow('Upload failed');
    expect(mock.from).toHaveBeenCalledWith('rental_settlement_proofs');
    expect(reserve.insert).toHaveBeenCalledWith({ settlement_id: 's', property_id: 'p', name: 'refund.png', mime_type: 'image/png', size: 10 });
    expect(mock.storage.from).toHaveBeenCalledWith('rental-files');
    expect(remove).toHaveBeenCalledWith(['p/settlements/s/f']);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(cleanup.delete.mock.invocationCallOrder[0]);
  });
  it('marks an uploaded proof ready', async () => {
    const ready = result({ id: 'f' });
    mock.from.mockReturnValueOnce(result(proofRow)).mockReturnValueOnce(ready);
    const upload = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload });
    await new SettlementRepository().uploadProof('s', 'p', { name: 'refund.png', mimeType: 'image/png', bytes: new ArrayBuffer(10) });
    expect(upload).toHaveBeenCalledWith('p/settlements/s/f', expect.any(ArrayBuffer), { contentType: 'image/png', upsert: false, cacheControl: '0' });
    expect(ready.update).toHaveBeenCalledWith({ ready: true });
  });
  it('creates only 60-second signed URLs for ready proofs, and never shows raw Storage errors', async () => {
    const lookup = result({ ...proofRow, ready: true });
    mock.from.mockReturnValue(lookup);
    const signed = vi.fn(async () => ({ data: { signedUrl: 'https://x/signed' }, error: null }));
    mock.storage.from.mockReturnValue({ createSignedUrl: signed });
    await expect(new SettlementRepository().proofUrl('f', true)).resolves.toBe('https://x/signed');
    expect(lookup.eq).toHaveBeenCalledWith('ready', true);
    expect(signed).toHaveBeenCalledWith('p/settlements/s/f', 60, { download: 'refund.png' });
    mock.storage.from.mockReturnValue({ createSignedUrl: vi.fn(async () => ({ data: null, error: storageError() })),
      remove: vi.fn(async () => ({ error: storageError() })) });
    await expect(new SettlementRepository().proofUrl('f')).rejects.toThrow('Could not open the proof');
    await expect(new SettlementRepository().removeProof('f')).rejects.toThrow('Could not remove the proof');
  });
});
