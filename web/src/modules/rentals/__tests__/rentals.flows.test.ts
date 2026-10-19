import { describe, expect, it, vi } from 'vitest';
import { addTenant, issueBills, moveOut, setupProperty } from '@himan/shared/rentals';
import type { BillingContext, PropertyInput, RentalTenancy, RenterInput, UnitInput } from '@himan/shared/rentals';

const person: RenterInput = { fullName: 'Juan', phone: '0917', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
const terms = { startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 500000, dueDay: 1,
  advanceMonths: 1, depositCentavos: 500000 };
const repos = () => ({
  renters: { save: vi.fn(async () => 'new-renter'), remove: vi.fn(async () => undefined) },
  tenancies: { start: vi.fn(async () => 't') },
  properties: { save: vi.fn(async () => 'p'), saveUnit: vi.fn(async () => undefined) },
});
const billRepos = () => ({
  ...repos(),
  tenancies: { start: vi.fn(async () => 't'), end: vi.fn(async () => undefined), setCharges: vi.fn(async () => undefined) },
  bills: {
    issue: vi.fn(async () => 'b'),
    saveReadings: vi.fn(async (propertyId: string, inputs: { unitId: string; kind: 'electric' | 'water'; readOn: string; value: number; isReset: boolean }[]) =>
      inputs.map((r, i) => ({ id: `new-${i}`, propertyId, ...r }))),
  },
});

describe('addTenant', () => {
  it('creates the person, then moves them in', async () => {
    const r = repos();
    const result = await addTenant(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms });
    expect(result).toEqual({ renterId: 'new-renter', tenancyId: 't', warnings: [] });
    // Not pending unless asked: a plain move-in.
    expect(r.tenancies.start).toHaveBeenCalledWith({ unitId: 'u', renterId: 'new-renter', moveIn: '2026-10-01', ...terms }, false);
  });
  it('removes the new person again when the move-in fails, and keeps the original error', async () => {
    const r = repos();
    r.tenancies.start.mockRejectedValueOnce(new Error('This unit is full'));
    await expect(addTenant(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms }))
      .rejects.toThrow('This unit is full');
    expect(r.renters.remove).toHaveBeenCalledWith('new-renter');
  });
  it('never creates or removes an existing tenant', async () => {
    const r = repos();
    r.tenancies.start.mockRejectedValueOnce(new Error('full'));
    await expect(addTenant(r, { propertyId: 'p', unitId: 'u', renterId: 'old', renter: null, moveIn: '2026-10-01', terms })).rejects.toThrow();
    expect(r.renters.save).not.toHaveBeenCalled();
    expect(r.renters.remove).not.toHaveBeenCalled();
  });
});

describe('setupProperty', () => {
  const room = (name: string): UnitInput => ({ name, kind: 'room', capacity: 1, electricMode: 'none', electricAmountCentavos: 0,
    waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0 });
  it('saves every room and reports the ones that failed by name', async () => {
    const r = repos();
    r.properties.saveUnit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(undefined);
    const result = await setupProperty(r, { input: { name: 'House' } as PropertyInput, rooms: [room('A'), room('B'), room('C')] });
    expect(result).toEqual({ propertyId: 'p', failed: ['B'] });
    expect(r.properties.saveUnit).toHaveBeenCalledTimes(3);
  });
});

describe('addTenant extras', () => {
  it('saves starting readings dated move-in and extra charges after moving in', async () => {
    const r = billRepos();
    await addTenant(r, { propertyId: 'p', unitId: 'u', renterId: 'old', renter: null, moveIn: '2026-10-01', terms,
      readings: [{ kind: 'electric', value: 1200 }], charges: [{ label: 'Parking', amount: 100000 }] });
    expect(r.bills.saveReadings).toHaveBeenCalledWith('p', [{ unitId: 'u', kind: 'electric', readOn: '2026-10-01', value: 1200, isReset: false }]);
    expect(r.tenancies.setCharges).toHaveBeenCalledWith('t', [{ label: 'Parking', amount: 100000 }]);
    expect(r.bills.saveReadings.mock.invocationCallOrder[0]).toBeGreaterThan(r.tenancies.start.mock.invocationCallOrder[0]);
  });
  it('keeps the move-in and warns when the extras fail', async () => {
    const r = billRepos();
    r.bills.saveReadings.mockRejectedValueOnce(new Error('x'));
    r.tenancies.setCharges.mockRejectedValueOnce(new Error('y'));
    const result = await addTenant(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms,
      readings: [{ kind: 'electric', value: 1200 }], charges: [{ label: 'Parking', amount: 100000 }] });
    expect(result.warnings).toEqual(['Moved in, but the starting readings weren’t saved', 'Moved in, but the extra charges weren’t saved']);
    expect(r.renters.remove).not.toHaveBeenCalled();
  });
});

describe('moveOut', () => {
  const unitId = '00000000-0000-0000-0000-000000000001';
  const stay = (id: string, moveIn: string): RentalTenancy => ({ id, propertyId: 'p', unitId, renterId: `r-${id}`, moveIn, moveOut: null,
    charges: [], contracts: [{ id: `c-${id}`, tenancyId: id, startDate: moveIn, endDate: '2030-01-01', monthlyRentCentavos: 1, dueDay: 1,
      advanceMonths: 0, depositCentavos: 0, status: 'active' }] });
  const ctx = (electricMode: 'submeter' | 'none'): BillingContext => ({
    property: { id: 'p', units: [{ id: unitId, propertyId: 'p', name: 'Room A', kind: 'bedspace', capacity: 2, electricMode,
      electricAmountCentavos: electricMode === 'none' ? 0 : 1000, waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 0,
      extraPersonRentCentavos: 0 }] } as BillingContext['property'],
    tenancies: [stay('t1', '2026-01-01'), stay('t2', '2026-02-01')],
    readings: [{ id: 'r0', propertyId: 'p', unitId, kind: 'electric', readOn: '2026-10-01', value: 0, isReset: false }], bills: [] });
  it('saves the final reading, moves out, then issues a final bill with their share', async () => {
    const r = billRepos();
    const result = await moveOut(r, { ctx: ctx('submeter'), tenancyId: 't2', moveOut: '2026-10-20', readings: [{ kind: 'electric', value: 30 }] });
    expect(r.bills.saveReadings).toHaveBeenCalledWith('p', [{ unitId, kind: 'electric', readOn: '2026-10-20', value: 30, isReset: false }]);
    expect(r.tenancies.end).toHaveBeenCalledWith('t2', '2026-10-20');
    expect(r.bills.issue).toHaveBeenCalledWith({ tenancyId: 't2', kind: 'final', period: '2026-10', dueOn: '2026-10-20',
      lines: [expect.objectContaining({ kind: 'electric', amount: 15000 })] });
    expect(result).toEqual({ warnings: [], finalBillId: 'b' });
  });
  it('issues no final bill when nothing is metered', async () => {
    const r = billRepos();
    await expect(moveOut(r, { ctx: ctx('none'), tenancyId: 't2', moveOut: '2026-10-20', readings: [] })).resolves.toEqual({ warnings: [], finalBillId: null });
    expect(r.bills.issue).not.toHaveBeenCalled();
  });
  it('keeps the move-out and warns when the final bill fails', async () => {
    const r = billRepos();
    r.bills.issue.mockRejectedValueOnce(new Error('x'));
    const result = await moveOut(r, { ctx: ctx('submeter'), tenancyId: 't2', moveOut: '2026-10-20', readings: [{ kind: 'electric', value: 30 }] });
    expect(result.warnings).toEqual(['Moved out, but the final bill wasn’t made. Make it from Bills.']);
  });
});

describe('issueBills', () => {
  it('issues each bill and names the ones that failed', async () => {
    const r = billRepos();
    r.bills.issue.mockResolvedValueOnce('b1').mockRejectedValueOnce(new Error('dup'));
    const line = { kind: 'rent' as const, label: 'Rent', amount: 1 };
    await expect(issueBills(r, [{ tenancyId: 't1', kind: 'monthly', period: '2026-11', dueOn: '2026-11-01', lines: [line] },
      { tenancyId: 't2', kind: 'monthly', period: '2026-11', dueOn: '2026-11-01', lines: [line] }])).resolves.toEqual({ issued: 1, failed: ['t2'] });
  });
});
