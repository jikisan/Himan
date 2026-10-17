import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BillRepository, PropertyRepository, RenterRepository, TenancyRepository } from '@himan/shared/rentals';

const mock = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), storage: { from: vi.fn() } }));
vi.mock('@himan/shared/config', () => ({ getSupabase: () => mock }));

function result(data: unknown, error: unknown = null) {
  const value = { data, error };
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain), insert: vi.fn(() => chain), update: vi.fn(() => chain),
    delete: vi.fn(() => chain), order: vi.fn(() => chain), limit: vi.fn(() => chain), single: vi.fn(async () => value),
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

describe('TenancyRepository duplicates', () => {
  it('explains a second active tenancy for the same renter in the same unit', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    await expect(new TenancyRepository().start({ unitId: '00000000-0000-0000-0000-000000000001',
      renterId: '00000000-0000-0000-0000-000000000002', moveIn: '2026-10-01', startDate: '2026-10-01',
      endDate: '2027-10-01', monthlyRentCentavos: 1000000, dueDay: 30, advanceMonths: 1, depositCentavos: 1000000 }))
      .rejects.toThrow('This tenant already lives in this room');
  });
});

describe('RenterRepository remove', () => {
  it('refuses a renter with tenancy history before touching their ID files', async () => {
    const history = result([{ id: 't1' }]);
    mock.from.mockReturnValueOnce(history);
    const remove = vi.fn(async () => ({ error: null }));
    mock.storage.from.mockReturnValue({ remove });
    await expect(new RenterRepository().remove('r')).rejects.toThrow('rented here before');
    expect(mock.from).toHaveBeenCalledWith('rental_tenancies');
    expect(history.eq).toHaveBeenCalledWith('renter_id', 'r');
    expect(remove).not.toHaveBeenCalled();
    expect(mock.from).toHaveBeenCalledTimes(1);
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

describe('PropertyRepository usual rent', () => {
  it('maps the room’s usual rent and treats a missing value as not set', async () => {
    mock.from.mockReturnValue(result([{ ...propertyRow, units: [{ ...propertyRow.units[0], default_rent_centavos: 800000, extra_person_rent_centavos: 50000 },
      { ...propertyRow.units[0], id: 'u2' }] }]));
    const [property] = await new PropertyRepository().findAll('me');
    expect(property.units.map((u) => u.defaultRentCentavos)).toEqual([800000, 0]);
    expect(property.units.map((u) => u.extraPersonRentCentavos)).toEqual([50000, 0]);
  });
  it('saves the usual rent in centavos', async () => {
    const query = result({ id: 'u' });
    mock.from.mockReturnValue(query);
    await new PropertyRepository().saveUnit('p', null, { name: 'Room A', kind: 'room', capacity: 1, electricMode: 'none',
      electricAmountCentavos: 0, waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 800000, extraPersonRentCentavos: 50000 });
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ default_rent_centavos: 800000, extra_person_rent_centavos: 50000 }));
  });
});

describe('TenancyRepository terms', () => {
  it('updates rent and due day on the active contract only', async () => {
    const query = result({ id: 'c' });
    mock.from.mockReturnValue(query);
    await new TenancyRepository().updateTerms('c', { monthlyRentCentavos: 900000, dueDay: 15, advanceMonths: 2, depositCentavos: 1800000 });
    expect(query.update).toHaveBeenCalledWith({ monthly_rent_centavos: 900000, due_day: 15, advance_months: 2, deposit_centavos: 1800000 });
    expect(query.eq).toHaveBeenCalledWith('status', 'active');
  });
});

describe('TenancyRepository plain errors', () => {
  it('says the room is full in plain words', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'This unit is full' } });
    await expect(new TenancyRepository().start({ unitId: '00000000-0000-0000-0000-000000000001',
      renterId: '00000000-0000-0000-0000-000000000002', moveIn: '2026-10-01', startDate: '2026-10-01',
      endDate: '2027-10-01', monthlyRentCentavos: 1, dueDay: 1, advanceMonths: 1, depositCentavos: 0 }))
      .rejects.toThrow('This room is full. Move someone out first, or add a bed.');
  });
});

const billRow = { id: 'b', property_id: 'p', tenancy_id: 't', kind: 'monthly', period: '2026-11', number: 'LU-2026-0002',
  issued_on: '2026-11-01', due_on: '2026-11-15', lines: [{ kind: 'rent', label: 'Rent', amount: 350000 }], status: 'issued', void_reason: '' };
const rentLine = { kind: 'rent' as const, label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } };

describe('BillRepository', () => {
  it('issues a bill through the numbering RPC with lines as they are', async () => {
    mock.rpc.mockResolvedValue({ data: 'b', error: null });
    await expect(new BillRepository().issue({ tenancyId: 't', kind: 'monthly', period: '2026-11', dueOn: '2026-11-15', lines: [rentLine] }))
      .resolves.toBe('b');
    expect(mock.rpc).toHaveBeenCalledWith('rental_issue_bill', { p_tenancy_id: 't', p_kind: 'monthly', p_period: '2026-11',
      p_due_on: '2026-11-15', p_lines: [rentLine] });
  });
  it('explains a second bill for the same month', async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    await expect(new BillRepository().issue({ tenancyId: 't', kind: 'monthly', period: '2026-11', dueOn: '2026-11-15', lines: [rentLine] }))
      .rejects.toThrow('This tenant already has a bill for that month');
  });
  it('refuses a bill with no lines before calling the database', async () => {
    await expect(new BillRepository().issue({ tenancyId: 't', kind: 'monthly', period: '2026-11', dueOn: '2026-11-15', lines: [] })).rejects.toThrow();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it('maps bills and readings', async () => {
    mock.from.mockReturnValueOnce(result([billRow])).mockReturnValueOnce(result([{ id: 'r', property_id: 'p', unit_id: 'u',
      kind: 'electric', read_on: '2026-11-10', value: 1350.5, is_reset: false }]));
    const repo = new BillRepository();
    expect((await repo.findAll())[0]).toMatchObject({ tenancyId: 't', issuedOn: '2026-11-01', dueOn: '2026-11-15', voidReason: '', lines: billRow.lines });
    expect((await repo.findReadings())[0]).toEqual({ id: 'r', propertyId: 'p', unitId: 'u', kind: 'electric', readOn: '2026-11-10', value: 1350.5, isReset: false });
  });
  it('saves several readings at once', async () => {
    const query = result([{ id: 'r', property_id: 'p', unit_id: '00000000-0000-0000-0000-000000000001', kind: 'electric',
      read_on: '2026-11-10', value: '1350.00', is_reset: false }]);
    mock.from.mockReturnValue(query);
    const [saved] = await new BillRepository().saveReadings('p', [{ unitId: '00000000-0000-0000-0000-000000000001', kind: 'electric',
      readOn: '2026-11-10', value: 1350, isReset: false }]);
    expect(query.insert).toHaveBeenCalledWith([{ property_id: 'p', unit_id: '00000000-0000-0000-0000-000000000001', kind: 'electric',
      read_on: '2026-11-10', value: 1350, is_reset: false }]);
    expect(saved.value).toBe(1350);
  });
  it('explains a second reading on the same day', async () => {
    mock.from.mockReturnValue(result(null, { code: '23505', message: 'dup' }));
    await expect(new BillRepository().saveReadings('p', [{ unitId: '00000000-0000-0000-0000-000000000001', kind: 'electric',
      readOn: '2026-11-10', value: 1, isReset: false }])).rejects.toThrow('There is already a reading for that room on that date');
  });
  it('cancels only an issued bill and edits lines', async () => {
    const cancel = result({ id: 'b' });
    mock.from.mockReturnValueOnce(cancel);
    await new BillRepository().void('b', 'typo');
    expect(cancel.update).toHaveBeenCalledWith({ status: 'void', void_reason: 'typo' });
    expect(cancel.eq).toHaveBeenCalledWith('status', 'issued');
    const edit = result({ id: 'b' });
    mock.from.mockReturnValueOnce(edit);
    await new BillRepository().updateLines('b', [rentLine]);
    expect(edit.update).toHaveBeenCalledWith({ lines: [rentLine] });
  });
});

describe('TenancyRepository bills support', () => {
  it('maps extra charges and saves them', async () => {
    mock.from.mockReturnValueOnce(result([{ id: 't', property_id: 'p', unit_id: 'u', renter_id: 'r', move_in: '2026-10-01',
      move_out: null, charges: [{ label: 'Parking', amount: 100000 }] }]));
    const [t] = await new TenancyRepository().findAll();
    expect(t.charges).toEqual([{ label: 'Parking', amount: 100000 }]);
    const save = result({ id: 't' });
    mock.from.mockReturnValueOnce(save);
    await new TenancyRepository().setCharges('t', [{ label: 'Parking', amount: 100000 }]);
    expect(save.update).toHaveBeenCalledWith({ charges: [{ label: 'Parking', amount: 100000 }] });
  });
  it('changes rent from a date through the renewal RPC', async () => {
    mock.rpc.mockResolvedValue({ data: 'c2', error: null });
    await new TenancyRepository().changeRent('c', '2026-12-01', 400000);
    expect(mock.rpc).toHaveBeenCalledWith('rental_change_rent', { p_contract_id: 'c', p_from: '2026-12-01', p_rent: 400000 });
  });
});

describe('PropertyRepository bill settings', () => {
  it('saves and maps late fee and due day', async () => {
    mock.from.mockReturnValueOnce(result([{ ...propertyRow, late_fee_centavos: 50000, rent_due_day: 5 }]));
    const [property] = await new PropertyRepository().findAll('me');
    expect(property).toMatchObject({ lateFeeCentavos: 50000, rentDueDay: 5 });
    const save = result({ id: 'p' });
    mock.from.mockReturnValueOnce(save);
    await new PropertyRepository().save('p', { ...property, rentDueDay: null });
    expect(save.update).toHaveBeenCalledWith(expect.objectContaining({ late_fee_centavos: 50000, rent_due_day: null }));
  });
});
