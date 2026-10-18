import { describe, expect, it } from 'vitest';
import { depositHeld, depositToReturn, settlementPreview, settlementSchema } from '@himan/shared/rentals';
import type { RentalBill, RentalPayment, RentalSettlement, RentalTenancy } from '@himan/shared/rentals';

const moveIn: RentalBill = { id: 'mi', propertyId: 'p', tenancyId: 't', kind: 'move_in', period: '2026-10', number: 'LU-1',
  issuedOn: '2026-10-01', dueOn: '2026-10-01', status: 'issued', voidReason: '',
  lines: [{ kind: 'rent', label: 'Rent', amount: 500000 }, { kind: 'deposit', label: 'Deposit', amount: 1000000 }] };
const paid = (amount = 1500000): RentalPayment[] => [{ id: 'x', propertyId: 'p', tenancyId: 't', amountCentavos: amount,
  paidOn: '2026-10-01', method: 'cash', reference: '', notes: '', status: 'active', voidReason: '', createdAt: '', proofs: [],
  allocations: [{ id: 'a', paymentId: 'x', billId: 'mi', amountCentavos: amount, pinned: false }] }];
const tenancy: RentalTenancy = { id: 't', propertyId: 'p', unitId: 'u', renterId: 'r', moveIn: '2026-10-01', moveOut: '2027-03-31',
  charges: [], contracts: [] };
const settlement: RentalSettlement = { id: 's', propertyId: 'p', tenancyId: 't', depositCentavos: 1000000, unpaidBillsCentavos: 0,
  lines: [], forfeit: false, refundCentavos: 1000000, owedCentavos: 0, refundedOn: '2027-04-02', refundMethod: 'gcash',
  refundReference: '', notes: '', status: 'settled', settledAt: '2027-04-02T00:00:00Z', proofs: [] };

describe('settlementPreview', () => {
  const base = { depositCentavos: 1000000, unpaidBillsCentavos: 200000, forfeit: false };
  it('subtracts unpaid bills and each line from the deposit', () => {
    expect(settlementPreview({ ...base, lines: [{ label: 'Cleaning', amount: 50000 }, { label: 'Damage', amount: 150000 }] }))
      .toEqual({ deductionsCentavos: 400000, refundCentavos: 600000, owedByTenantCentavos: 0 });
  });
  it('never refunds below zero and shows what the tenant still owes', () => {
    expect(settlementPreview({ ...base, lines: [{ label: 'Damage', amount: 1000000 }] }))
      .toEqual({ deductionsCentavos: 1200000, refundCentavos: 0, owedByTenantCentavos: 200000 });
  });
  it('keeps the whole deposit on forfeit and still shows what the tenant owes, like the database', () => {
    expect(settlementPreview({ ...base, lines: [{ label: 'Damage', amount: 5000000 }], forfeit: true }))
      .toEqual({ deductionsCentavos: 5200000, refundCentavos: 0, owedByTenantCentavos: 4200000 });
    expect(settlementPreview({ ...base, lines: [], forfeit: true }))
      .toEqual({ deductionsCentavos: 200000, refundCentavos: 0, owedByTenantCentavos: 0 });
  });
});

describe('depositToReturn', () => {
  it('is to settle once moved out with the move-in bill fully paid', () => {
    expect(depositToReturn(tenancy, [moveIn], paid())).toEqual({ state: 'to_settle', depositCentavos: 1000000 });
  });
  it('is none before move-out, while the move-in bill is unpaid, or without a deposit', () => {
    expect(depositToReturn({ ...tenancy, moveOut: null }, [moveIn], paid())).toEqual({ state: 'none', depositCentavos: 0 });
    expect(depositToReturn(tenancy, [moveIn], paid(100))).toEqual({ state: 'none', depositCentavos: 0 });
    expect(depositToReturn(tenancy, [{ ...moveIn, lines: [moveIn.lines[0]] }], paid())).toEqual({ state: 'none', depositCentavos: 0 });
    expect(depositToReturn(tenancy, [{ ...moveIn, status: 'void' }], paid())).toEqual({ state: 'none', depositCentavos: 0 });
  });
  it('is settled once a settlement exists', () => {
    expect(depositToReturn(tenancy, [moveIn], paid(), settlement)).toEqual({ state: 'settled', depositCentavos: 1000000 });
  });
});

describe('depositHeld after settlement', () => {
  it('drops to none once settled and stays held otherwise', () => {
    expect(depositHeld(tenancy, [moveIn], paid())).toEqual({ state: 'held', amountCentavos: 1000000 });
    expect(depositHeld(tenancy, [moveIn], paid(), settlement)).toEqual({ state: 'none', amountCentavos: 0 });
    expect(depositHeld(tenancy, [moveIn], paid(), { ...settlement, tenancyId: 'other' })).toEqual({ state: 'held', amountCentavos: 1000000 });
  });
});

describe('settlementSchema', () => {
  const valid = { lines: [{ label: ' Cleaning ', amount: 50000 }], forfeit: false, refundedOn: '2027-04-02', refundMethod: 'gcash',
    refundReference: ' REF ', notes: '' };
  const message = (input: unknown) => settlementSchema.safeParse(input).error?.issues[0]?.message;
  it('accepts a settlement and trims text', () => {
    expect(settlementSchema.parse(valid)).toEqual({ ...valid, lines: [{ label: 'Cleaning', amount: 50000 }], refundReference: 'REF' });
    expect(settlementSchema.parse({ ...valid, lines: [], forfeit: true, refundedOn: null, refundMethod: null }).refundedOn).toBeNull();
  });
  it('refuses bad lines with plain messages', () => {
    expect(message({ ...valid, lines: [{ label: '   ', amount: 100 }] })).toBe('Add a label and an amount for each deduction');
    expect(message({ ...valid, lines: [{ label: 'x'.repeat(81), amount: 100 }] })).toBe('Keep each label under 80 characters');
    expect(message({ ...valid, lines: [{ label: 'Damage', amount: 0 }] })).toBe('Add a label and an amount for each deduction');
    expect(message({ ...valid, lines: [{ label: 'Damage', amount: 1.5 }] })).toBe('Add a label and an amount for each deduction');
    expect(message({ ...valid, lines: [{ label: 'Damage', amount: 2_000_000_001 }] })).toBe('That amount is too high');
    expect(message({ ...valid, lines: Array.from({ length: 31 }, () => ({ label: 'x', amount: 1 })) })).toBe('Use at most 30 deductions');
  });
  it('checks method, date, reference and notes', () => {
    expect(message({ ...valid, refundMethod: 'cheque' })).toBe('Pick how the refund was paid');
    expect(message({ ...valid, refundedOn: '2027-13-01' })).toBe('Choose the refund date');
    expect(message({ ...valid, refundReference: 'x'.repeat(81) })).toBe('Keep the reference under 80 characters');
    expect(message({ ...valid, notes: 'x'.repeat(501) })).toBe('Keep the note under 500 characters');
  });
});
