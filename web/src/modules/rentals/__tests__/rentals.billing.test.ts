import { describe, expect, it } from 'vitest';
import { billPrefix, billTotal, dueOn, finalBillLines, firstDueOn, formatBillPesos, isOverdue, meterSegments, pendingBill,
  proratedRent, readingInputSchema, rentSpan, statementText, tenancyChargeSchema } from '@himan/shared/rentals';
import type { BillingContext, MeterReading, RentalBill, RentalProperty, RentalTenancy, RentalUnit } from '@himan/shared/rentals';

const unit = (id: string, kind: RentalUnit['kind'], capacity: number, extra: Partial<RentalUnit> = {}): RentalUnit => ({
  id, propertyId: 'p', name: id, kind, capacity, electricMode: 'none', electricAmountCentavos: 0, waterMode: 'none',
  waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0, ...extra });
const property = (units: RentalUnit[]): RentalProperty => ({
  id: 'p', createdBy: 'o', name: 'Lahug Units', address: '', ownerName: 'Maria Santos', ownerAddress: 'Lahug, Cebu City',
  lessorName: '', lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'LU',
  lateFeeCentavos: 0, rentDueDay: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner', units });
const stay = (id: string, unitId: string, moveIn: string, o: { dueDay?: number; advance?: number; rent?: number; moveOut?: string } = {}): RentalTenancy => ({
  id, propertyId: 'p', unitId, renterId: `r-${id}`, moveIn, moveOut: o.moveOut ?? null, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: moveIn, endDate: '2030-01-01', monthlyRentCentavos: o.rent ?? 350000,
    dueDay: o.dueDay ?? Number(moveIn.slice(8)), advanceMonths: o.advance ?? 1, depositCentavos: 0, status: 'active' }] });
const reading = (id: string, unitId: string, readOn: string, value: number, isReset = false, kind: MeterReading['kind'] = 'electric'): MeterReading =>
  ({ id, propertyId: 'p', unitId, kind, readOn, value, isReset });
const bill = (tenancyId: string, period: string, extra: Partial<RentalBill> = {}): RentalBill => ({
  id: `b-${tenancyId}-${period}`, propertyId: 'p', tenancyId, kind: 'monthly', period, number: 'LU-2026-0002', issuedOn: '2026-11-01',
  dueOn: `${period}-15`, lines: [{ kind: 'rent', label: 'Rent', amount: 350000 }], status: 'issued', voidReason: '', ...extra });
const ctx = (units: RentalUnit[], tenancies: RentalTenancy[], readings: MeterReading[] = [], bills: RentalBill[] = []): BillingContext =>
  ({ property: property(units), tenancies, readings, bills });

describe('dates', () => {
  it('clamps the due day to the end of the month', () => {
    expect(dueOn('2027-02', 31)).toBe('2027-02-28');
    expect(dueOn('2028-02', 31)).toBe('2028-02-29');
    expect(dueOn('2026-11', 15)).toBe('2026-11-15');
  });
  it('gives each bill a full month of rent from the due day', () => {
    expect(rentSpan('2026-11', 15)).toEqual({ from: '2026-11-15', to: '2026-12-14' });
    expect(rentSpan('2027-01', 31)).toEqual({ from: '2027-01-31', to: '2027-02-27' });
  });
  it('finds the first due date on or after move-in and prorates the days before it', () => {
    expect(firstDueOn('2026-10-15', 5)).toBe('2026-11-05');
    expect(firstDueOn('2026-10-05', 5)).toBe('2026-10-05');
    expect(firstDueOn('2027-02-10', 31)).toBe('2027-02-28');
    expect(proratedRent(350000, '2026-10-15', 5)).toEqual({ days: 21, amount: 245000, from: '2026-10-15', to: '2026-11-04' });
    expect(proratedRent(300000, '2027-02-10', 31)).toEqual({ days: 18, amount: 180000, from: '2027-02-10', to: '2027-02-27' });
    expect(proratedRent(350000, '2026-10-05', 5)).toBeNull();
  });
});

describe('pendingBill: which months get a bill', () => {
  const room = unit('u1', 'room', 1);
  it('skips the months the advance paid', () => {
    const c = ctx([room], [stay('t', 'u1', '2026-10-15')]);
    expect(pendingBill(c, 't', '2026-10').state).toBe('covered');
    expect(pendingBill(c, 't', '2026-11')).toMatchObject({ state: 'ready', dueOn: '2026-11-15' });
  });
  it('starts at the first due date after a mid-month move-in', () => {
    const c = ctx([room], [stay('t', 'u1', '2026-10-15', { dueDay: 5 })]);
    expect(pendingBill(c, 't', '2026-10').state).toBe('none');
    expect(pendingBill(c, 't', '2026-11').state).toBe('covered');
    expect(pendingBill(c, 't', '2026-12')).toMatchObject({ state: 'ready', dueOn: '2026-12-05' });
  });
  it('bills the first month when there is no advance', () => {
    expect(pendingBill(ctx([room], [stay('t', 'u1', '2026-10-15', { advance: 0 })]), 't', '2026-10').state).toBe('ready');
  });
  it('does not bill a tenant who left before the due date', () => {
    expect(pendingBill(ctx([room], [stay('t', 'u1', '2026-01-15', { moveOut: '2026-11-10' })]), 't', '2026-11').state).toBe('none');
  });
  it('shows an issued bill, but not a cancelled one', () => {
    const t = stay('t', 'u1', '2026-01-15');
    expect(pendingBill(ctx([room], [t], [], [bill('t', '2026-11')]), 't', '2026-11').state).toBe('issued');
    expect(pendingBill(ctx([room], [t], [], [bill('t', '2026-11', { status: 'void' })]), 't', '2026-11').state).toBe('ready');
  });
  it('puts rent with its period first, then extra charges', () => {
    const t = { ...stay('t', 'u1', '2026-01-15'), charges: [{ label: 'Parking', amount: 100000 }] };
    const p = pendingBill(ctx([room], [t]), 't', '2026-11');
    expect(p.state === 'ready' && p.lines).toEqual([
      { kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } },
      { kind: 'charge', label: 'Parking', amount: 100000 }]);
  });
});

describe('utilities', () => {
  const metered = unit('u1', 'room', 1, { electricMode: 'submeter', electricAmountCentavos: 1600 });
  const t = stay('t', 'u1', '2026-01-15');
  it('charges usage times rate and keeps the readings it used', () => {
    const p = pendingBill(ctx([metered], [t], [reading('r0', 'u1', '2026-10-15', 1200), reading('r1', 'u1', '2026-11-10', 1350)]), 't', '2026-11');
    expect(p.state === 'ready' && p.lines[1]).toEqual({ kind: 'electric', label: 'Electricity', amount: 240000, meter: {
      readings: ['r1'], fromDate: '2026-10-15', fromValue: 1200, toDate: '2026-11-10', toValue: 1350, usage: 150, rate: 1600, sharedWith: 1 } });
  });
  it('needs a reading after the starting one, unless utilities are skipped', () => {
    const c = ctx([metered], [t], [reading('r0', 'u1', '2026-10-15', 1200)]);
    expect(pendingBill(c, 't', '2026-11')).toEqual({ state: 'needs-reading', kinds: ['electric'] });
    const skipped = pendingBill(c, 't', '2026-11', { skipUtilities: true });
    expect(skipped.state === 'ready' && skipped.lines.map((l) => l.kind)).toEqual(['rent']);
  });
  it('does not bill a reading twice', () => {
    const readings = [reading('r0', 'u1', '2026-10-15', 1200), reading('r1', 'u1', '2026-11-10', 1350)];
    const billed = bill('t', '2026-11', { lines: [{ kind: 'electric', label: 'Electricity', amount: 240000, meter: { readings: ['r1'],
      fromDate: '2026-10-15', fromValue: 1200, toDate: '2026-11-10', toValue: 1350, usage: 150, rate: 1600, sharedWith: 1 } }] });
    expect(pendingBill(ctx([metered], [t], readings, [billed]), 't', '2026-12').state).toBe('needs-reading');
  });
  it('starts again from a reset reading', () => {
    const segments = meterSegments([reading('a', 'u1', '2026-09-01', 900), reading('b', 'u1', '2026-10-01', 50, true),
      reading('c', 'u1', '2026-11-01', 80)]);
    expect(segments.map((s) => [s.from.id, s.to.id, s.usageHundredths])).toEqual([['b', 'c', 3000]]);
  });
  it('splits a shared room equally, the extra centavo going to the longest-staying tenant', () => {
    const shared = unit('uA', 'bedspace', 3, { electricMode: 'submeter', electricAmountCentavos: 4801 });
    const ts = [stay('t2', 'uA', '2026-02-01'), stay('t1', 'uA', '2026-01-01'), stay('t3', 'uA', '2026-03-01')];
    const c = ctx([shared], ts, [reading('r0', 'uA', '2026-10-01', 0), reading('r1', 'uA', '2026-11-01', 100)]);
    const share = (id: string) => { const p = pendingBill(c, id, '2026-11'); return p.state === 'ready' ? p.lines[1].amount : 0; };
    expect([share('t1'), share('t2'), share('t3')]).toEqual([160034, 160033, 160033]);
  });
  it('gives a leaving housemate only their share up to the final reading', () => {
    const shared = unit('uA', 'bedspace', 3, { electricMode: 'submeter', electricAmountCentavos: 1000 });
    const ts = [stay('t1', 'uA', '2026-01-01'), stay('t2', 'uA', '2026-02-01'), stay('t3', 'uA', '2026-03-01', { moveOut: '2026-10-20' })];
    const readings = [reading('r0', 'uA', '2026-10-01', 0), reading('r1', 'uA', '2026-10-20', 30), reading('r2', 'uA', '2026-11-01', 90)];
    const final = finalBillLines(ctx([shared], ts, readings), 't3', '2026-10-20');
    expect(final.map((l) => l.amount)).toEqual([10000]);
    const finalBill = bill('t3', '2026-10', { kind: 'final', lines: final });
    const c = ctx([shared], ts, readings, [finalBill]);
    const t1 = pendingBill(c, 't1', '2026-11');
    expect(t1.state === 'ready' && t1.lines[1].amount).toBe(40000);
    expect(finalBillLines(c, 't3', '2026-10-20')).toEqual([]);
  });
  it('charges a flat amount to each tenant', () => {
    const shared = unit('uA', 'bedspace', 2, { waterMode: 'fixed', waterAmountCentavos: 30000 });
    const c = ctx([shared], [stay('t1', 'uA', '2026-01-01'), stay('t2', 'uA', '2026-02-01')]);
    for (const id of ['t1', 't2']) {
      const p = pendingBill(c, id, '2026-11');
      expect(p.state === 'ready' && p.lines[1]).toEqual({ kind: 'water', label: 'Water', amount: 30000 });
    }
  });
});

describe('bill helpers', () => {
  it('makes a bill prefix from the property name', () => {
    expect(billPrefix('Lahug Units')).toBe('LU');
    expect(billPrefix('  ')).toBe('INV');
    expect(billPrefix('Bahay ni Lola #2')).toBe('BNL2');
  });
  it('hides .00 on whole pesos', () => {
    expect(formatBillPesos(620000)).toBe('₱6,200');
    expect(formatBillPesos(620050)).toBe('₱6,200.50');
  });
  it('totals lines and knows when a bill is overdue', () => {
    const b = bill('t', '2026-11', { lines: [{ kind: 'rent', label: 'Rent', amount: 350000 }, { kind: 'other', label: 'Discount', amount: -50000 }] });
    expect(billTotal(b.lines)).toBe(300000);
    expect(isOverdue(b, '2026-11-16')).toBe(true);
    expect(isOverdue(b, '2026-11-15')).toBe(false);
    expect(isOverdue({ ...b, status: 'void' }, '2026-12-01')).toBe(false);
  });
  it('writes a statement for Messenger', () => {
    const b = bill('t', '2026-11', { dueOn: '2026-11-15', lines: [
      { kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } },
      { kind: 'water', label: 'Water', amount: 30000 },
      { kind: 'electric', label: 'Electricity', amount: 240000, meter: { readings: ['r1'], fromDate: '2026-10-15', fromValue: 1200,
        toDate: '2026-11-10', toValue: 1350, usage: 150, rate: 1600, sharedWith: 1 } }] });
    const info = { propertyName: 'Lahug Units', ownerName: 'Maria Santos', ownerAddress: '', renterName: 'Juan', roomName: 'Room 1', lateFeeCentavos: 0 };
    const text = statementText(b, info);
    for (const part of ['STATEMENT OF ACCOUNT', 'LU-2026-0002', 'November 2026', 'Rent (Nov 15 – Dec 14)', '150 kWh × ₱16',
      'TOTAL ₱6,200', 'Due Nov 15, 2026']) expect(text).toContain(part);
    expect(text).not.toContain('penalty');
    expect(statementText(b, { ...info, lateFeeCentavos: 50000 })).toContain('Late payment will have a penalty of ₱500.');
  });
});

describe('schemas', () => {
  it('rejects a charge without a name or amount', () => {
    expect(tenancyChargeSchema.safeParse({ label: ' ', amount: 100 }).success).toBe(false);
    expect(tenancyChargeSchema.safeParse({ label: 'Parking', amount: 0 }).success).toBe(false);
    expect(tenancyChargeSchema.safeParse({ label: 'Parking', amount: 100000 }).success).toBe(true);
  });
  it('rejects negative readings and more than two decimals', () => {
    const base = { unitId: '00000000-0000-0000-0000-000000000001', kind: 'electric', readOn: '2026-11-10', isReset: false };
    expect(readingInputSchema.safeParse({ ...base, value: -1 }).success).toBe(false);
    expect(readingInputSchema.safeParse({ ...base, value: 1.005 }).success).toBe(false);
    expect(readingInputSchema.safeParse({ ...base, value: 1350.5 }).success).toBe(true);
  });
});
