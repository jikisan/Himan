import { describe, expect, it } from 'vitest';
import { billDocument } from '@himan/shared/rentals';
import type { BillLine, PaymentAccount, RentalBill } from '@himan/shared/rentals';

const lines: BillLine[] = [
  { kind: 'electric', label: 'Electricity', amount: 80000, meter: { readings: ['r2'], fromDate: '2026-10-15', fromValue: 1200,
    toDate: '2026-11-10', toValue: 1350, usage: 150, rate: 1600, sharedWith: 3 } },
  { kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } },
  { kind: 'water', label: 'Water', amount: 20000 },
  { kind: 'charge', label: 'Parking', amount: 50050 },
];
const bill: RentalBill = { id: 'b', propertyId: 'p', tenancyId: 't', kind: 'monthly', period: '2026-11', number: 'LU-2026-0002',
  issuedOn: '2026-11-01', dueOn: '2026-11-15', status: 'issued', voidReason: '', lines };
const gcash: PaymentAccount = { id: 'a1', propertyId: 'p', kind: 'gcash', label: 'GCash', accountName: 'Maria Santos',
  accountNumber: '0917 555 1234', qrPath: 'p/a1.png', position: 0 };
const bpi: PaymentAccount = { ...gcash, id: 'a2', kind: 'bank', label: 'BPI', accountNumber: '1234-5678', qrPath: null };
const info = { propertyName: 'Lahug Units', ownerName: 'Maria Santos', ownerAddress: 'Lahug, Cebu City', renterName: 'Juan Dela Cruz',
  roomName: 'Room 1', lateFeeCentavos: 0 };

describe('billDocument', () => {
  it('has the Statement of Account header', () => {
    const doc = billDocument(bill, info);
    expect(doc.from).toEqual({ name: 'Maria Santos', address: 'Lahug, Cebu City' });
    expect(doc.month).toBe('November 2026');
    expect(doc.fields).toEqual([['Tenant', 'Juan Dela Cruz'], ['Room', 'Room 1'], ['Bill No.', 'LU-2026-0002'], ['Date', 'Nov 1, 2026']]);
    expect(doc.cancelled).toBe(false);
    expect(billDocument({ ...bill, status: 'void' }, { ...info, ownerName: '' })).toMatchObject({ cancelled: true, from: { name: 'Lahug Units' } });
  });

  it('lists rent and charges in order, then water before electricity', () => {
    const doc = billDocument(bill, info);
    expect(doc.charges).toEqual([{ label: 'Rent (Nov 15 – Dec 14)', amount: '₱3,500' }, { label: 'Parking', amount: '₱500.50' }]);
    expect(doc.utilities.map((u) => u.title)).toEqual(['Water', 'Electricity']);
    expect(doc.utilities[0]).toEqual({ title: 'Water', readings: [], label: 'Fixed monthly amount', amount: '₱200' });
  });

  it('shows both meter readings, usage, rate, amount and the share', () => {
    expect(billDocument(bill, info).utilities[1]).toEqual({ title: 'Electricity',
      readings: [['Previous', 'Oct 15, 2026', '1,200'], ['Current', 'Nov 10, 2026', '1,350']],
      label: '150 kWh × ₱16', amount: '₱800', note: 'Your 1/3 share of the room’s meter' });
    const monthly = billDocument({ ...bill, lines: [{ kind: 'water', label: 'Water', amount: 30000, billMonth: '2026-10' }] }, info);
    expect(monthly.utilities[0]).toMatchObject({ label: 'October 2026 bill', readings: [] });
  });

  it('totals, then previous balance, paid and what is left', () => {
    expect(billDocument(bill, info)).toMatchObject({ total: '₱5,000.50', summary: [], due: 'Nov 15, 2026' });
    expect(billDocument(bill, { ...info, previousBalanceCentavos: 100000, paidCentavos: 200000 }).summary)
      .toEqual([['Previous balance', '₱1,000'], ['Paid', '₱2,000'], ['Amount due now', '₱4,000.50']]);
    expect(billDocument(bill, { ...info, paidCentavos: 500050 }).summary).toEqual([['Paid', '₱5,000.50'], ['Paid in full', '']]);
  });

  it('lists payment accounts with their QR path', () => {
    expect(billDocument(bill, { ...info, accounts: [gcash, bpi] }).accounts).toEqual([
      { id: 'a1', name: 'GCash', detail: 'Maria Santos 0917 555 1234', qrPath: 'p/a1.png' },
      { id: 'a2', name: 'BPI', detail: 'Maria Santos 1234-5678', qrPath: null }]);
    expect(billDocument(bill, info).accounts).toEqual([]);
  });

  it('states the late fee only when the property has one', () => {
    expect(billDocument(bill, info).lateFee).toBeNull();
    expect(billDocument(bill, { ...info, lateFeeCentavos: 50000 }).lateFee).toBe('Late payment will have a penalty of ₱500.');
  });
});
