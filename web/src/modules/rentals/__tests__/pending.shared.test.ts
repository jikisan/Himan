import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContractRepository, LinkRepository, PropertyRepository, TenancyRepository, addTenant, roomSpots } from '@himan/shared/rentals';
import type { PropertyInput, RentalTenancy } from '@himan/shared/rentals';

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('@himan/shared/config', () => ({ getSupabase: () => mock }));

function result(data: unknown, error: unknown = null) {
  const value = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), insert: vi.fn(() => chain), update: vi.fn(() => chain),
    order: vi.fn(() => chain), single: vi.fn(async () => value),
    then: (resolve: (response: typeof value) => unknown) => Promise.resolve(value).then(resolve),
  };
  return chain;
}
const propertyRow = { id: 'p', created_by: 'o', name: 'House', address: '', owner_name: '', owner_address: '', lessor_name: '',
  lessor_civil_status: '', lessor_address: '', lessor_capacity: 'owner', signing_city: '', invoice_prefix: 'INV', archived_at: null,
  created_at: '', updated_at: '', units: [], members: [{ role: 'owner' }] };
const input: PropertyInput = { name: 'House', address: '', ownerName: '', ownerAddress: '', lessorName: '', lessorCivilStatus: '',
  lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null };
const start = { unitId: '00000000-0000-0000-0000-000000000001', renterId: '00000000-0000-0000-0000-000000000002', moveIn: '2026-10-01',
  startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 1000000, dueDay: 30, advanceMonths: 1, depositCentavos: 1000000 };
const tenancyRow = { id: 't', property_id: 'p', unit_id: 'u', renter_id: 'r', move_in: '2026-10-01', move_out: null, contracts: [], charges: [] };

beforeEach(() => { mock.from.mockReset(); mock.rpc.mockReset(); });

describe('Require a signed contract before move-in', () => {
  it('reads the property setting, off when the column is missing', async () => {
    mock.from.mockReturnValue(result([{ ...propertyRow, require_contract: true }, { ...propertyRow, id: 'q' }]));
    const [on, off] = await new PropertyRepository().findAll('o');
    expect(on.requireContract).toBe(true);
    expect(off.requireContract).toBe(false);
    const query = mock.from.mock.results[0].value as ReturnType<typeof result>;
    expect(String((query.select.mock.calls as unknown[][])[0][0])).toContain('require_contract');
  });
  it('saves the setting only when the form sends it (the owner’s form)', async () => {
    const query = result({ id: 'p' });
    mock.from.mockReturnValue(query);
    await new PropertyRepository().save('p', { ...input, requireContract: true });
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ require_contract: true }));
    await new PropertyRepository().save('p', input);
    expect((query.update.mock.calls as unknown[][])[1][0]).not.toHaveProperty('require_contract');
  });
});

describe('Pending tenancies', () => {
  it('reads pending, false for older rows', async () => {
    mock.from.mockReturnValue(result([{ ...tenancyRow, pending: true }, { ...tenancyRow, id: 't2' }]));
    const [pending, active] = await new TenancyRepository().findAll();
    expect(pending.pending).toBe(true);
    expect(active.pending).toBe(false);
  });
  it('starts a tenancy as pending only when asked', async () => {
    mock.rpc.mockResolvedValue({ data: 't', error: null });
    await new TenancyRepository().start(start);
    expect(mock.rpc).toHaveBeenLastCalledWith('rental_start_tenancy', expect.objectContaining({ p_pending: false }));
    await new TenancyRepository().start(start, true);
    expect(mock.rpc).toHaveBeenLastCalledWith('rental_start_tenancy', expect.objectContaining({ p_pending: true }));
  });
  it('activates a pending tenancy, passing the database’s plain message through', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null });
    await new TenancyRepository().activate('t');
    expect(mock.rpc).toHaveBeenCalledWith('rental_activate_tenancy', { p_tenancy_id: 't' });
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'The contract isn\'t signed by both of you yet' } });
    await expect(new TenancyRepository().activate('t')).rejects.toThrow('The contract isn\'t signed by both of you yet');
  });
  it('adds a tenant as pending', async () => {
    const repos = { renters: { save: vi.fn(async () => 'r'), remove: vi.fn() }, tenancies: { start: vi.fn(async () => 't') } };
    const { moveIn, unitId, renterId, ...terms } = start;
    await addTenant(repos, { propertyId: 'p', unitId, renterId, renter: null, moveIn, terms, pending: true });
    expect(repos.tenancies.start).toHaveBeenCalledWith({ unitId, renterId, moveIn, ...terms }, true);
  });
  it('counts a pending tenant as holding a bed, so the board can label it', () => {
    const t = (id: string, pending: boolean): RentalTenancy => ({ id, propertyId: 'p', unitId: 'u', renterId: id, moveIn: '2026-10-01',
      moveOut: null, pending, contracts: [], charges: [] });
    const spots = roomSpots({ id: 'u', capacity: 3 }, [t('a', false), t('b', true)]);
    expect(spots.map((s) => s && { id: s.id, pending: s.pending })).toEqual([{ id: 'a', pending: false }, { id: 'b', pending: true }, null]);
  });
  it('reads pending from the tenant’s link, false when missing', async () => {
    const link = { kind: 'existing', status: 'open', tenantName: 'Ben', contract: null,
      property: { name: 'H', address: '', lessorName: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV' } };
    mock.rpc.mockResolvedValue({ data: { ...link, pending: true }, error: null });
    expect((await new LinkRepository().getPublic('tok')).pending).toBe(true);
    mock.rpc.mockResolvedValue({ data: link, error: null });
    expect((await new LinkRepository().getPublic('tok')).pending).toBe(false);
  });
});

describe('Owner-chosen sign mode', () => {
  it('saves the sign mode with a new contract and on edits', async () => {
    const query = result({ id: 'c1' });
    mock.from.mockReturnValue(query);
    await new ContractRepository().createText('k', 'p', ['a'], '', 'notarize');
    expect(query.insert).toHaveBeenCalledWith({ contract_id: 'k', property_id: 'p', body: ['a'], special_terms: '', sign_mode: 'notarize' });
    await new ContractRepository().updateText('c1', { signMode: 'esign' });
    expect(query.update).toHaveBeenCalledWith({ sign_mode: 'esign' });
  });
  it('passes the send refusal through when no mode is chosen', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Choose how the contract is signed' } });
    await expect(new ContractRepository().send('c1')).rejects.toThrow('Choose how the contract is signed');
  });
});
