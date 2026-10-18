import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentAccountRepository, PaymentRepository } from '@himan/shared/rentals';

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
const proofRow = { id: 'f', payment_id: 'pay', property_id: 'p', name: 'gcash.png', mime_type: 'image/png', size: 10,
  storage_path: 'p/payments/pay/f', ready: false };
const paymentRow = { id: 'pay', property_id: 'p', tenancy_id: 't', amount_centavos: 350000, paid_on: '2026-11-01', method: 'gcash',
  reference: 'ABC', notes: '', status: 'active', void_reason: '', created_by: 'u', created_at: '2026-11-01T00:00:00Z',
  proofs: [{ ...proofRow, ready: true }], allocations: [{ id: 'a', payment_id: 'pay', bill_id: 'b', property_id: 'p', amount_centavos: 350000, pinned: true }] };
const accountRow = { id: 'acc', property_id: 'p', kind: 'gcash', label: 'GCash', account_name: 'Maria', account_number: '0917',
  qr_path: 'p/acc-1.png', position: 0, created_at: '' };
const BILL = '00000000-0000-0000-0000-000000000001';

/** What Supabase Storage throws, e.g. on an RLS refusal. */
const storageError = () => Object.assign(new Error('new row violates row-level security policy'), { __isStorageError: true, statusCode: '403' });

beforeEach(() => { vi.clearAllMocks(); mock.from.mockReset(); mock.rpc.mockReset(); mock.storage.from.mockReset(); });

describe('PaymentRepository', () => {
  it('loads payments with proofs and allocations, newest first', async () => {
    const query = result([paymentRow]);
    mock.from.mockReturnValue(query);
    const [p] = await new PaymentRepository().findAll();
    expect(query.select).toHaveBeenCalledWith('*, proofs:rental_payment_proofs(*), allocations:rental_payment_allocations(*)');
    expect(query.order).toHaveBeenCalledWith('paid_on', { ascending: false });
    expect(p).toMatchObject({ tenancyId: 't', amountCentavos: 350000, paidOn: '2026-11-01', voidReason: '',
      proofs: [{ paymentId: 'pay', storagePath: 'p/payments/pay/f', ready: true }],
      allocations: [{ id: 'a', paymentId: 'pay', billId: 'b', amountCentavos: 350000, pinned: true }] });
  });
  it('records through the RPC with the contract arguments', async () => {
    mock.rpc.mockResolvedValue({ data: 'pay', error: null });
    await expect(new PaymentRepository().record({ tenancyId: 't', amountCentavos: 350000, paidOn: '2026-11-01', method: 'gcash',
      reference: ' ABC ', notes: '', billId: BILL })).resolves.toBe('pay');
    expect(mock.rpc).toHaveBeenCalledWith('rental_record_payment', { p_tenancy_id: 't', p_amount: 350000, p_paid_on: '2026-11-01',
      p_method: 'gcash', p_reference: 'ABC', p_notes: '', p_bill_id: BILL });
  });
  it('sends no bill when none was picked, and refuses zero before calling the database', async () => {
    mock.rpc.mockResolvedValue({ data: 'pay', error: null });
    await new PaymentRepository().record({ tenancyId: 't', amountCentavos: 1, paidOn: '2026-11-01', method: 'cash', reference: '', notes: '' });
    expect(mock.rpc).toHaveBeenCalledWith('rental_record_payment', expect.objectContaining({ p_bill_id: null }));
    mock.rpc.mockClear();
    await expect(new PaymentRepository().record({ tenancyId: 't', amountCentavos: 0, paidOn: '2026-11-01', method: 'cash',
      reference: '', notes: '' })).rejects.toThrow();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('voids through the RPC and passes its message through', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null });
    await new PaymentRepository().void('pay', ' Wrong tenant ');
    expect(mock.rpc).toHaveBeenCalledWith('rental_void_payment', { p_payment_id: 'pay', p_reason: 'Wrong tenant' });
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Payment not found or already voided' } });
    await expect(new PaymentRepository().void('pay', 'x')).rejects.toThrow('Payment not found or already voided');
  });
  it('removes a failed proof upload’s object before its reserved metadata', async () => {
    const reserve = result(proofRow);
    const cleanup = result({ id: 'f' });
    mock.from.mockReturnValueOnce(reserve).mockReturnValueOnce(result(proofRow)).mockReturnValueOnce(cleanup);
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload: vi.fn(async () => ({ error: new Error('Upload failed') })), remove });
    await expect(new PaymentRepository().uploadProof('pay', 'p', { name: 'gcash.png', mimeType: 'image/png', bytes: new ArrayBuffer(10) }))
      .rejects.toThrow('Upload failed');
    expect(mock.from).toHaveBeenCalledWith('rental_payment_proofs');
    expect(reserve.insert).toHaveBeenCalledWith({ payment_id: 'pay', property_id: 'p', name: 'gcash.png', mime_type: 'image/png', size: 10 });
    expect(mock.storage.from).toHaveBeenCalledWith('rental-files');
    expect(remove).toHaveBeenCalledWith(['p/payments/pay/f']);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(cleanup.delete.mock.invocationCallOrder[0]);
  });
  it('marks bills from before payment tracking as paid through the RPC', async () => {
    mock.rpc.mockResolvedValue({ data: 2, error: null });
    await expect(new PaymentRepository().markEarlierPaid('p')).resolves.toBe(2);
    expect(mock.rpc).toHaveBeenCalledWith('rental_mark_earlier_paid', { p_property_id: 'p' });
  });
  it('never shows raw Storage or PostgREST errors', async () => {
    mock.from.mockReturnValueOnce(result({ ...proofRow, ready: true }));
    mock.storage.from.mockReturnValue({ createSignedUrl: vi.fn(async () => ({ data: null, error: storageError() })),
      remove: vi.fn(async () => ({ error: storageError() })) });
    await expect(new PaymentRepository().proofUrl('f')).rejects.toThrow('Could not open the proof');
    mock.from.mockReturnValueOnce(result(proofRow));
    await expect(new PaymentRepository().removeProof('f')).rejects.toThrow('Could not remove the proof');
    mock.from.mockReturnValueOnce(result(null, Object.assign(new Error('JSON object requested, multiple (or no) rows returned'),
      { code: 'PGRST116' })));
    await expect(new PaymentRepository().findAll()).rejects.toThrow('Could not load payments');
  });
  it('creates only 60-second signed URLs for ready proofs', async () => {
    const lookup = result({ ...proofRow, ready: true });
    mock.from.mockReturnValue(lookup);
    const signed = vi.fn(async () => ({ data: { signedUrl: 'https://x/signed' }, error: null }));
    mock.storage.from.mockReturnValue({ createSignedUrl: signed });
    await expect(new PaymentRepository().proofUrl('f')).resolves.toBe('https://x/signed');
    expect(lookup.eq).toHaveBeenCalledWith('ready', true);
    expect(signed).toHaveBeenCalledWith('p/payments/pay/f', 60, undefined);
  });
});

describe('PaymentAccountRepository', () => {
  const png = (size: number) => ({ name: 'qr.png', mimeType: 'image/png', bytes: new ArrayBuffer(size) });
  it('maps accounts and saves them for the property', async () => {
    mock.from.mockReturnValueOnce(result([accountRow]));
    const repo = new PaymentAccountRepository();
    expect((await repo.findAll())[0]).toEqual({ id: 'acc', propertyId: 'p', kind: 'gcash', label: 'GCash', accountName: 'Maria',
      accountNumber: '0917', qrPath: 'p/acc-1.png', position: 0 });
    const save = result({ id: 'acc' });
    mock.from.mockReturnValueOnce(save);
    await expect(repo.save('p', null, { kind: 'bank', label: ' BPI ', accountName: 'Maria', accountNumber: '1234', position: 1 })).resolves.toBe('acc');
    expect(save.insert).toHaveBeenCalledWith({ property_id: 'p', kind: 'bank', label: 'BPI', account_name: 'Maria', account_number: '1234', position: 1 });
  });
  it('rejects a non-image or a QR over 2 MB before any network call', async () => {
    const repo = new PaymentAccountRepository();
    await expect(repo.uploadQr('p', 'acc', { name: 'qr.pdf', mimeType: 'application/pdf', bytes: new ArrayBuffer(10) })).rejects.toThrow();
    await expect(repo.uploadQr('p', 'acc', png(2 * 1024 * 1024 + 1))).rejects.toThrow();
    await expect(repo.uploadQr('p', 'acc', png(0))).rejects.toThrow();
    expect(mock.from).not.toHaveBeenCalled();
    expect(mock.storage.from).not.toHaveBeenCalled();
  });
  it('uploads a QR under the property folder, saves its path and removes the old one', async () => {
    const lookup = result({ qr_path: 'p/acc-1.png' });
    const update = result({ id: 'acc' });
    mock.from.mockReturnValueOnce(lookup).mockReturnValueOnce(update);
    const upload = vi.fn(async () => ({ error: null }));
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload, remove });
    await new PaymentAccountRepository().uploadQr('p', 'acc', { name: 'qr.webp', mimeType: 'image/webp', bytes: new ArrayBuffer(10) });
    expect(mock.storage.from).toHaveBeenCalledWith('rental-qr');
    const path = (upload.mock.calls[0] as unknown[])[0] as string;
    expect(path).toMatch(/^p\/acc-\d+\.webp$/);
    expect(update.update).toHaveBeenCalledWith({ qr_path: path });
    expect(remove).toHaveBeenCalledWith(['p/acc-1.png']);
  });
  it('gives the QR’s public URL without a network call', () => {
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: 'https://x/public/p/acc-1.png' } }));
    mock.storage.from.mockReturnValue({ getPublicUrl });
    expect(new PaymentAccountRepository().qrUrl('p/acc-1.png')).toBe('https://x/public/p/acc-1.png');
    expect(mock.storage.from).toHaveBeenCalledWith('rental-qr');
    expect(getPublicUrl).toHaveBeenCalledWith('p/acc-1.png');
  });
  it('removes an account, then its QR', async () => {
    const del = result({ id: 'acc' });
    mock.from.mockReturnValueOnce(result(accountRow)).mockReturnValueOnce(del);
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ remove });
    await new PaymentAccountRepository().remove('acc');
    expect(remove).toHaveBeenCalledWith(['p/acc-1.png']);
    expect(del.delete.mock.invocationCallOrder[0]).toBeLessThan(remove.mock.invocationCallOrder[0]);
  });
  it('keeps the account when its row can’t be deleted', async () => {
    mock.from.mockReturnValueOnce(result(accountRow)).mockReturnValueOnce(result(null, { code: '42501', message: 'denied' }));
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ remove });
    await expect(new PaymentAccountRepository().remove('acc')).rejects.toThrow();
    expect(remove).not.toHaveBeenCalled();
  });
  it('turns a Storage refusal on QR upload into a plain message', async () => {
    mock.from.mockReturnValueOnce(result({ qr_path: null }));
    mock.storage.from.mockReturnValue({ upload: vi.fn(async () => ({ error: storageError() })) });
    await expect(new PaymentAccountRepository().uploadQr('p', 'acc', png(10))).rejects.toThrow('Could not upload the QR code');
  });
});
