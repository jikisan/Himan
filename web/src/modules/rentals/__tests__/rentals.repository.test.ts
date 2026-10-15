import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyRepository, RenterRepository, TenancyRepository } from '@himan/shared/rentals';

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
const propertyRow = { id: 'p', created_by: 'owner', name: 'House', address: '', owner_name: '', owner_address: '',
  lessor_name: 'Owner', lessor_civil_status: '', lessor_address: '', lessor_capacity: 'owner', signing_city: 'Cebu',
  invoice_prefix: 'INV', archived_at: null, created_at: '', updated_at: '',
  units: [{ id: 'u', property_id: 'p', name: 'Room A', kind: 'bedspace', capacity: 2, electric_mode: 'submeter',
    electric_amount_centavos: 1250, water_mode: 'none', water_amount_centavos: 0 }],
  members: [{ role: 'manager' }] };
const fileRow = { id: 'f', renter_id: 'r', property_id: 'p', name: 'id.png', mime_type: 'image/png', size: 10,
  storage_path: 'p/renters/r/f', ready: false };

beforeEach(() => { vi.clearAllMocks(); mock.from.mockReset(); mock.rpc.mockReset(); mock.storage.from.mockReset(); });

describe('PropertyRepository', () => {
  it('maps the caller’s own role and units, filtering membership by the signed-in user', async () => {
    const query = result([propertyRow]);
    mock.from.mockReturnValue(query);
    const [property] = await new PropertyRepository().findAll('me');
    expect(query.eq).toHaveBeenCalledWith('members.user_id', 'me');
    expect(property.role).toBe('manager');
    expect(property.units[0]).toMatchObject({ propertyId: 'p', electricMode: 'submeter', electricAmountCentavos: 1250 });
  });
  it('turns a tenancy-history foreign key error into an archive hint', async () => {
    mock.from.mockReturnValue(result(null, { code: '23503', message: 'fk' }));
    await expect(new PropertyRepository().remove('p')).rejects.toThrow('Archive it instead');
  });
  it('passes database rule messages through unchanged', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'You can only share with friends' } });
    await expect(new PropertyRepository().addMember('p', 'x', 'viewer')).rejects.toThrow('You can only share with friends');
  });
});

describe('TenancyRepository', () => {
  it('starts a tenancy and its contract in one RPC with centavo amounts', async () => {
    mock.rpc.mockResolvedValue({ data: 't', error: null });
    const id = await new TenancyRepository().start({ unitId: '00000000-0000-0000-0000-000000000001',
      renterId: '00000000-0000-0000-0000-000000000002', moveIn: '2026-10-01', startDate: '2026-10-01',
      endDate: '2027-10-01', monthlyRentCentavos: 1000000, dueDay: 30, advanceMonths: 1, depositCentavos: 1000000 });
    expect(id).toBe('t');
    expect(mock.rpc).toHaveBeenCalledWith('rental_start_tenancy', expect.objectContaining({ p_rent: 1000000, p_due_day: 30 }));
  });
});

describe('RenterRepository files', () => {
  it('removes a failed upload’s object before its reserved metadata', async () => {
    const cleanup = result({ id: 'f' });
    mock.from.mockReturnValueOnce(result(fileRow)).mockReturnValueOnce(result(fileRow)).mockReturnValueOnce(cleanup);
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ upload: vi.fn(async () => ({ error: new Error('Upload failed') })), remove });
    await expect(new RenterRepository().upload('r', 'p', { name: 'id.png', mimeType: 'image/png', bytes: new ArrayBuffer(10) }))
      .rejects.toThrow('Upload failed');
    expect(remove).toHaveBeenCalledWith(['p/renters/r/f']);
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(cleanup.delete.mock.invocationCallOrder[0]);
  });
  it('creates only 60-second signed URLs for ready files', async () => {
    const lookup = result({ ...fileRow, ready: true });
    mock.from.mockReturnValue(lookup);
    const signed = vi.fn(async () => ({ data: { signedUrl: 'https://x/signed' }, error: null }));
    mock.storage.from.mockReturnValue({ createSignedUrl: signed });
    await expect(new RenterRepository().fileUrl('f', true)).resolves.toBe('https://x/signed');
    expect(lookup.eq).toHaveBeenCalledWith('ready', true);
    expect(signed).toHaveBeenCalledWith('p/renters/r/f', 60, { download: 'id.png' });
  });
});
