import { describe, expect, it } from 'vitest';
import { monthFigures, needsAttention, todoCounts } from '@himan/shared/rentals';
import type { RentalBill, RentalPayment, RentalProperty, RentalTenancy, RentalUnit } from '@himan/shared/rentals';

const unit = (id: string, capacity = 1): RentalUnit => ({
  id, propertyId: 'p', name: id, kind: capacity > 1 ? 'bedspace' : 'room', capacity, electricMode: 'none', electricAmountCentavos: 0, waterMode: 'none',
  waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0 });
const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Lahug Units', address: '', ownerName: '', ownerAddress: '', lessorName: '', lessorCivilStatus: '',
  lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'LU', lateFeeCentavos: 0, rentDueDay: null,
  paymentsTrackedFrom: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner', units: [unit('u1'), unit('u2', 3)],
};
const stay = (id: string, unitId: string, dueDay: number, moveOut: string | null = null): RentalTenancy => ({
  id, propertyId: 'p', unitId, renterId: `r-${id}`, moveIn: '2026-01-01', moveOut, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: '2026-01-01', endDate: '2027-12-31', monthlyRentCentavos: 500000, dueDay,
    advanceMonths: 1, depositCentavos: 500000, status: moveOut ? 'ended' : 'active' }] });
const bill = (id: string, tenancyId: string, dueOn: string, amount = 500000, extra: Partial<RentalBill> = {}): RentalBill => ({
  id, propertyId: 'p', tenancyId, kind: 'monthly', period: dueOn.slice(0, 7), number: `LU-2026-${id}`, issuedOn: dueOn, dueOn, status: 'issued',
  voidReason: '', lines: [{ kind: 'rent', label: 'Rent', amount }], ...extra });
const pay = (tenancyId: string, billId: string, amount: number, paidOn: string): RentalPayment => ({
  id: `pay-${billId}`, propertyId: 'p', tenancyId, amountCentavos: amount, paidOn, method: 'cash', reference: '', notes: '', status: 'active',
  voidReason: '', createdAt: paidOn, proofs: [], allocations: [{ id: `al-${billId}`, paymentId: `pay-${billId}`, billId, amountCentavos: amount, pinned: false }] });
const ctx = (tenancies: RentalTenancy[], bills: RentalBill[], payments: RentalPayment[] = []) =>
  ({ property, tenancies, bills, payments, readings: [], utilityBills: [] });

describe('needsAttention', () => {
  it('puts late bills first (oldest first), then unpaid ones not due yet, then rent due within a week', () => {
    const items = needsAttention(ctx([stay('a', 'u1', 30), stay('b', 'u2', 2), stay('c', 'u2', 28)],
      [bill('1', 'a', '2026-10-20'), bill('2', 'b', '2026-09-30'), bill('3', 'c', '2026-10-28')]), '2026-10-26');
    expect(items.map((i) => [i.kind, i.tenancyId])).toEqual([['overdue', 'b'], ['overdue', 'a'], ['unpaid', 'c'], ['due_soon', 'a'], ['due_soon', 'b']]);
    expect(items[0].inDays).toBe(-26);
  });
  it('leaves out paid bills, and rent whose unpaid bill already says it', () => {
    const items = needsAttention(ctx([stay('a', 'u1', 28)], [bill('1', 'a', '2026-10-28'), bill('2', 'a', '2026-09-28')],
      [pay('a', '2', 500000, '2026-09-28')]), '2026-10-26');
    expect(items.map((i) => i.key)).toEqual(['bill-1']);
  });
  it('skips bills from before payment tracking', () => {
    const items = needsAttention({ ...ctx([stay('a', 'u1', 15)], [bill('1', 'a', '2026-05-15')]), property: { ...property, paymentsTrackedFrom: '2026-06-01' } },
      '2026-10-26');
    expect(items).toEqual([]);
  });
});

describe('todoCounts', () => {
  it('counts the tenant tasks and their urgent items per tenant', () => {
    const { total, byRenter } = todoCounts(ctx([stay('a', 'u1', 30), stay('b', 'u2', 15)], [bill('1', 'a', '2026-10-20')]), '2026-10-26',
      { canManage: true, canEdit: true });
    // a: contract to create, overdue bill, rent due on the 30th. b: contract to create, October SOA to generate.
    expect(byRenter.get('r-a')).toBe(3);
    expect(byRenter.get('r-b')).toBe(2);
    // Two contracts, one "Generate SOA" task and one overdue bill.
    expect(total).toBe(4);
  });
  it('shows a viewer only the overdue bills', () => {
    expect(todoCounts(ctx([stay('a', 'u1', 30)], [bill('1', 'a', '2026-10-20')]), '2026-10-26', { canManage: false, canEdit: false }).total).toBe(1);
  });
});

describe('monthFigures', () => {
  it('adds up the month and the six months before it', () => {
    const f = monthFigures(ctx([stay('a', 'u1', 15), stay('b', 'u2', 15), stay('old', 'u2', 15, '2026-03-01')],
      [bill('1', 'a', '2026-10-15'), bill('2', 'b', '2026-10-15', 300000), bill('3', 'a', '2026-08-15'), bill('4', 'b', '2026-10-15', 900000, { status: 'void' })],
      [pay('a', '1', 500000, '2026-10-16'), pay('a', '3', 200000, '2026-08-20')]), '2026-10');
    expect(f).toMatchObject({ billedCentavos: 800000, collectedCentavos: 500000, rentCentavos: 1000000, unpaidCentavos: 600000, bedsTaken: 2, beds: 4 });
    expect(f.trend.map((m) => m.period)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(f.trend[3]).toEqual({ period: '2026-08', billedCentavos: 500000, collectedCentavos: 200000 });
  });
});
