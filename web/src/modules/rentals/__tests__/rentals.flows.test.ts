import { describe, expect, it, vi } from 'vitest';
import { issueBills, moveIn, moveOut, setupProperty } from '@himan/shared/rentals';
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

const moved = { renterId: 'new-renter', tenancyId: 't', billId: 'b', paymentId: 'pay' };
const moveInRepos = () => ({
  tenancies: { moveIn: vi.fn(async () => moved), setCharges: vi.fn(async () => undefined) },
  bills: billRepos().bills,
  payments: { uploadProof: vi.fn(async () => undefined) },
});
const payment = { amountCentavos: 500000, paidOn: '2026-10-01', method: 'cash' as const, reference: '', notes: '' };
const proof = { name: 'gcash.png', mimeType: 'image/png', bytes: new ArrayBuffer(3) };

describe('moveIn', () => {
  it('creates the person, the move-in and the payment in one call', async () => {
    const r = moveInRepos();
    const result = await moveIn(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms, payment });
    expect(result).toEqual({ ...moved, warnings: [] });
    expect(r.tenancies.moveIn).toHaveBeenCalledWith({ unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', ...terms, payment });
  });
  it('moves in without a payment (pay later)', async () => {
    const r = moveInRepos();
    r.tenancies.moveIn.mockResolvedValueOnce({ ...moved, renterId: 'old', paymentId: null } as never);
    const result = await moveIn(r, { propertyId: 'p', unitId: 'u', renterId: 'old', renter: null, moveIn: '2026-10-01', terms, payment: null,
      proofs: [proof] });
    expect(result.paymentId).toBeNull();
    expect(r.tenancies.moveIn).toHaveBeenCalledWith(expect.objectContaining({ renterId: 'old', renter: null, payment: null }));
    expect(r.payments.uploadProof).not.toHaveBeenCalled();
  });
  it('passes a failed move-in through and saves nothing else', async () => {
    const r = moveInRepos();
    r.tenancies.moveIn.mockRejectedValueOnce(new Error('This room is full. Move someone out first, or add a bed.'));
    await expect(moveIn(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms, payment,
      readings: [{ kind: 'electric', value: 1 }] })).rejects.toThrow('This room is full');
    expect(r.bills.saveReadings).not.toHaveBeenCalled();
  });
  it('saves starting readings dated move-in, extra charges and proofs after moving in', async () => {
    const r = moveInRepos();
    await moveIn(r, { propertyId: 'p', unitId: 'u', renterId: 'old', renter: null, moveIn: '2026-10-01', terms, payment,
      readings: [{ kind: 'electric', value: 1200 }], charges: [{ label: 'Parking', amount: 100000 }], proofs: [proof] });
    expect(r.bills.saveReadings).toHaveBeenCalledWith('p', [{ unitId: 'u', kind: 'electric', readOn: '2026-10-01', value: 1200, isReset: false }]);
    expect(r.tenancies.setCharges).toHaveBeenCalledWith('t', [{ label: 'Parking', amount: 100000 }]);
    expect(r.payments.uploadProof).toHaveBeenCalledWith('pay', 'p', proof);
    expect(r.bills.saveReadings.mock.invocationCallOrder[0]).toBeGreaterThan(r.tenancies.moveIn.mock.invocationCallOrder[0]);
  });
  it('keeps the move-in and warns when the extras fail', async () => {
    const r = moveInRepos();
    r.bills.saveReadings.mockRejectedValueOnce(new Error('x'));
    r.tenancies.setCharges.mockRejectedValueOnce(new Error('y'));
    r.payments.uploadProof.mockRejectedValueOnce(new Error('z'));
    const result = await moveIn(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms, payment,
      readings: [{ kind: 'electric', value: 1200 }], charges: [{ label: 'Parking', amount: 100000 }], proofs: [proof] });
    expect(result.warnings).toEqual(['Moved in, but the starting readings weren’t saved', 'Moved in, but the extra charges weren’t saved',
      'Couldn’t attach gcash.png. Add it again from the payment.']);
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
