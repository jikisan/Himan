import { describe, expect, it } from 'vitest';
import { billBalance, billPaid, billState, depositHeld, earlierUnpaid, findDuplicateReference, paymentAccountSchema, paymentSchema,
  previousBalance, statementText, tenancyCredit, tenancyOwed } from '@himan/shared/rentals';
import type { PaymentAccount, RentalBill, RentalPayment, RentalProperty, RentalTenancy } from '@himan/shared/rentals';

const bill = (id: string, dueOn: string, amount: number, extra: Partial<RentalBill> = {}): RentalBill => ({
  id, propertyId: 'p', tenancyId: 't', kind: 'monthly', period: dueOn.slice(0, 7), number: `LU-${id}`, issuedOn: dueOn,
  dueOn, lines: [{ kind: 'rent', label: 'Rent', amount }], status: 'issued', voidReason: '', ...extra });
const payment = (id: string, amount: number, allocations: [string, number][], extra: Partial<RentalPayment> = {}): RentalPayment => ({
  id, propertyId: 'p', tenancyId: 't', amountCentavos: amount, paidOn: '2026-11-01', method: 'gcash', reference: '', notes: '',
  status: 'active', voidReason: '', createdAt: '', proofs: [],
  allocations: allocations.map(([billId, amountCentavos], i) => ({ id: `${id}-a${i}`, paymentId: id, billId, amountCentavos, pinned: false })),
  ...extra });
const tenancy: RentalTenancy = { id: 't', propertyId: 'p', unitId: 'u', renterId: 'r', moveIn: '2026-10-01', moveOut: null, charges: [],
  contracts: [] };

describe('bill state', () => {
  const b = bill('b1', '2026-11-15', 350000);
  it('is unpaid, partial, then paid as allocations come in', () => {
    expect(billState(b, [], '2026-11-01')).toBe('unpaid');
    const partial = [payment('x', 100000, [['b1', 100000]])];
    expect(billPaid('b1', partial)).toBe(100000);
    expect(billBalance(b, partial)).toBe(250000);
    expect(billState(b, partial, '2026-11-01')).toBe('partial');
    expect(billState(b, [payment('x', 350000, [['b1', 350000]])], '2026-12-01')).toBe('paid');
  });
  it('is overdue when partly paid past the due date', () => {
    expect(billState(b, [payment('x', 100000, [['b1', 100000]])], '2026-11-16')).toBe('overdue');
    expect(billState(b, [], '2026-11-15')).toBe('unpaid');
  });
  it('ignores void payments and reports void bills', () => {
    const voided = [payment('x', 350000, [['b1', 350000]], { status: 'void' })];
    expect(billPaid('b1', voided)).toBe(0);
    expect(billState(b, voided, '2026-11-16')).toBe('overdue');
    expect(billState({ ...b, status: 'void' }, [], '2026-12-01')).toBe('void');
    expect(billBalance({ ...b, status: 'void' }, [])).toBe(0);
  });
});

describe('tenancy totals', () => {
  const bills = [bill('b1', '2026-10-15', 300000), bill('b2', '2026-11-15', 300000), bill('v', '2026-09-15', 999, { status: 'void' }),
    bill('o', '2026-11-15', 500000, { tenancyId: 'other' })];
  it('owes the balances of issued bills only', () => {
    expect(tenancyOwed('t', bills, [payment('x', 400000, [['b1', 300000], ['b2', 100000]])])).toBe(200000);
  });
  it('keeps what no bill took as credit, and drops it when voided', () => {
    const big = payment('x', 700000, [['b1', 300000], ['b2', 300000]]);
    expect(tenancyCredit('t', [big])).toBe(100000);
    expect(tenancyOwed('t', bills, [big])).toBe(0);
    expect(tenancyCredit('t', [{ ...big, status: 'void' }])).toBe(0);
    expect(tenancyCredit('other', [big])).toBe(0);
  });
  it('sums the other bills due before this one', () => {
    const paid = [payment('x', 100000, [['b1', 100000]])];
    expect(previousBalance('t', bills[1], bills, paid)).toBe(200000);
    expect(previousBalance('t', bills[0], bills, paid)).toBe(0);
  });
  it('breaks a same-day tie by bill number', () => {
    const a = bill('a', '2026-11-15', 100000, { number: 'LU-2026-0001' });
    const b = bill('b', '2026-11-15', 200000, { number: 'LU-2026-0002' });
    expect(previousBalance('t', b, [a, b], [])).toBe(100000);
    expect(previousBalance('t', a, [a, b], [])).toBe(0);
  });
});

describe('bills from before payment tracking', () => {
  const property = { id: 'p', paymentsTrackedFrom: '2026-10-18' } as RentalProperty;
  const bills = [bill('old1', '2026-09-15', 300000, { issuedOn: '2026-09-01' }),
    bill('old2', '2026-10-15', 300000, { issuedOn: '2026-10-01', tenancyId: 't2' }),
    bill('void', '2026-08-15', 300000, { issuedOn: '2026-08-01', status: 'void' }),
    bill('new', '2026-11-15', 300000, { issuedOn: '2026-11-01' }),
    bill('elsewhere', '2026-09-15', 300000, { issuedOn: '2026-09-01', propertyId: 'q' })];
  it('lists the tenants and the total still unpaid on bills issued before tracking started', () => {
    expect(earlierUnpaid(property, bills, [payment('x', 100000, [['old1', 100000]])]))
      .toEqual({ tenancyIds: ['t', 't2'], totalCentavos: 500000 });
    expect(earlierUnpaid(property, bills, [payment('x', 300000, [['old1', 300000]])])).toEqual({ tenancyIds: ['t2'], totalCentavos: 300000 });
  });
  it('is empty when the property tracked payments from the start', () => {
    expect(earlierUnpaid({ ...property, paymentsTrackedFrom: null }, bills, [])).toEqual({ tenancyIds: [], totalCentavos: 0 });
  });
});

describe('deposit', () => {
  const moveIn = bill('m', '2026-10-01', 350000, { kind: 'move_in', lines: [{ kind: 'advance', label: 'Advance', amount: 350000 },
    { kind: 'deposit', label: 'Deposit', amount: 700000 }] });
  it('is pending until the move-in bill is paid, then held', () => {
    expect(depositHeld(tenancy, [moveIn], [payment('x', 500000, [['m', 500000]])])).toEqual({ state: 'pending', amountCentavos: 700000 });
    expect(depositHeld(tenancy, [moveIn], [payment('x', 1050000, [['m', 1050000]])])).toEqual({ state: 'held', amountCentavos: 700000 });
  });
  it('is none without a deposit or an issued move-in bill', () => {
    expect(depositHeld(tenancy, [], [])).toEqual({ state: 'none', amountCentavos: 0 });
    expect(depositHeld(tenancy, [{ ...moveIn, status: 'void' }], [])).toEqual({ state: 'none', amountCentavos: 0 });
    expect(depositHeld(tenancy, [{ ...moveIn, lines: [moveIn.lines[0]] }], [])).toEqual({ state: 'none', amountCentavos: 0 });
  });
});

describe('duplicate reference', () => {
  const payments = [payment('a', 1, [], { reference: ' ABC123 ' }), payment('v', 1, [], { reference: 'zzz', status: 'void' }),
    payment('o', 1, [], { reference: 'other', propertyId: 'q' })];
  it('matches ignoring case and spaces, only active payments in the same property', () => {
    expect(findDuplicateReference(payments, 'p', 'abc123')?.id).toBe('a');
    expect(findDuplicateReference(payments, 'p', 'zzz')).toBeUndefined();
    expect(findDuplicateReference(payments, 'p', 'other')).toBeUndefined();
    expect(findDuplicateReference([payment('e', 1, [])], 'p', '  ')).toBeUndefined();
  });
});

describe('schemas', () => {
  const ok = { amountCentavos: 100, paidOn: '2026-11-01', method: 'gcash', reference: ' x ', notes: '' };
  it('rejects zero or negative amounts and bad dates', () => {
    expect(paymentSchema.parse(ok).reference).toBe('x');
    expect(paymentSchema.safeParse({ ...ok, amountCentavos: 0 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...ok, amountCentavos: -5 }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...ok, paidOn: '2026-13-01' }).success).toBe(false);
    expect(paymentSchema.safeParse({ ...ok, method: 'card' }).success).toBe(false);
  });
  it('needs an account label', () => {
    const account = { kind: 'gcash', label: 'GCash', accountName: 'Maria', accountNumber: '0917', position: 0 };
    expect(paymentAccountSchema.safeParse(account).success).toBe(true);
    expect(paymentAccountSchema.safeParse({ ...account, label: ' ' }).success).toBe(false);
  });
});

describe('statement with payments', () => {
  const info = { propertyName: 'Lahug Units', ownerName: '', ownerAddress: '', renterName: 'Juan', roomName: 'Room 1', lateFeeCentavos: 0 };
  const account: PaymentAccount = { id: 'a', propertyId: 'p', kind: 'gcash', label: 'Main', accountName: 'Maria Santos',
    accountNumber: '0917 123 4567', qrPath: null, position: 0 };
  it('adds accounts, previous balance and paid amount only when given', () => {
    const b = bill('b', '2026-11-15', 350000);
    const plain = statementText(b, info);
    expect(plain).not.toContain('Pay to');
    expect(plain).not.toContain('Previous balance');
    const text = statementText(b, { ...info, accounts: [account, { ...account, kind: 'bank', label: 'BPI', accountNumber: '1234' }],
      previousBalanceCentavos: 50000, paidCentavos: 100000 });
    for (const part of ['Pay to:', 'GCash — Maria Santos 0917 123 4567', 'BPI — Maria Santos 1234', 'Previous balance ₱500',
      'Paid ₱1,000']) expect(text).toContain(part);
  });
  it('ends with what is due now: total plus previous balance minus paid', () => {
    const b = bill('b', '2026-11-15', 350000);
    expect(statementText(b, { ...info, previousBalanceCentavos: 50000, paidCentavos: 100000 })).toContain('Amount due now ₱3,000');
    const overpaid = statementText(b, { ...info, paidCentavos: 400000 });
    expect(overpaid).toContain('Paid in full');
    expect(overpaid).not.toContain('Amount due now');
    expect(statementText(b, info)).not.toContain('Amount due now');
  });
});
