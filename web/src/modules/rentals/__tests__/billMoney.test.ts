import { describe, expect, it } from 'vitest';
import type { RentalBill, RentalPayment } from '@himan/shared/rentals';
import { billMoney } from '../presentation/utils/billMoney';

const bill = (extra: Partial<RentalBill> = {}): RentalBill => ({ id: 'b', propertyId: 'p', tenancyId: 't', kind: 'monthly', period: '2026-11',
  number: 'LU-2026-0002', issuedOn: '2026-11-01', dueOn: '2026-11-15', status: 'issued', voidReason: '',
  lines: [{ kind: 'rent', label: 'Rent', amount: 1733333 }] as RentalBill['lines'], ...extra });
const pay = (amount: number): RentalPayment => ({ id: 'x', propertyId: 'p', tenancyId: 't', amountCentavos: amount, paidOn: '2026-11-02', method: 'cash',
  reference: '', notes: '', status: 'active', voidReason: '', createdAt: '', proofs: [],
  allocations: [{ id: 'a', paymentId: 'x', billId: 'b', amountCentavos: amount, pinned: false }] });

describe('billMoney: the row says how much is left and whether it is late, in words', () => {
  it('not due yet: the amount to pay and the due date', () => {
    expect(billMoney(bill(), [], '2026-11-10')).toEqual({ tone: 'due', headline: '₱17,333.33 to pay', detail: 'Due Nov 15' });
  });
  it('part paid, not due: what is left and what was paid', () => {
    expect(billMoney(bill(), [pay(1300000)], '2026-11-10'))
      .toEqual({ tone: 'due', headline: '₱4,333.33 left to pay', detail: '₱13,000 paid of ₱17,333.33. Due Nov 15' });
  });
  it('late: says how many days, singular and plural', () => {
    expect(billMoney(bill({ dueOn: '2026-11-03' }), [], '2026-11-10')).toEqual({ tone: 'late', headline: '₱17,333.33 to pay', detail: '7 days late' });
    expect(billMoney(bill({ dueOn: '2026-11-09' }), [pay(1300000)], '2026-11-10'))
      .toEqual({ tone: 'late', headline: '₱4,333.33 left to pay', detail: '₱13,000 paid of ₱17,333.33. 1 day late' });
  });
  it('paid and cancelled', () => {
    expect(billMoney(bill(), [pay(1733333)], '2026-11-20')).toEqual({ tone: 'paid', headline: 'Paid in full', detail: '₱17,333.33' });
    expect(billMoney(bill({ status: 'void' }), [], '2026-11-20')).toEqual({ tone: 'cancelled', headline: 'Cancelled', detail: '₱17,333.33' });
  });
});
