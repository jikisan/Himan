import { describe, expect, it } from 'vitest';
import { receiptDocument } from '@himan/shared/rentals';
import type { RentalBill, RentalPayment } from '@himan/shared/rentals';

const bill = (id: string, number: string, amount: number, extra: Partial<RentalBill> = {}): RentalBill => ({ id, propertyId: 'p', tenancyId: 't',
  kind: 'monthly', period: '2026-11', number, issuedOn: '2026-11-01', dueOn: '2026-11-15', status: 'issued', voidReason: '',
  lines: [{ kind: 'rent', label: 'Rent', amount }], ...extra });
const pay = (id: string, amount: number, allocs: [string, number][], extra: Partial<RentalPayment> = {}): RentalPayment => ({
  id, propertyId: 'p', tenancyId: 't', amountCentavos: amount, paidOn: '2026-11-05', method: 'gcash', reference: 'GC-123', notes: '',
  status: 'active', voidReason: '', createdAt: '2026-11-05T01:00:00Z', proofs: [{ id: 'f', paymentId: id, propertyId: 'p', name: 'proof.png',
    mimeType: 'image/png', size: 1, storagePath: 'secret/proof.png', ready: true }],
  allocations: allocs.map(([billId, amountCentavos], i) => ({ id: `${id}-a${i}`, paymentId: id, billId, amountCentavos, pinned: false })), ...extra });
const bills = [bill('mi', 'LU-2026-0001', 700000, { kind: 'move_in', period: '2026-10' }), bill('b2', 'LU-2026-0002', 350000)];
const party = { propertyName: 'Lahug Units', ownerName: 'Maria Santos', ownerAddress: 'Lahug, Cebu City', renterName: 'Juan Dela Cruz', roomName: 'Room 1' };

describe('receiptDocument', () => {
  const earlier = pay('0a1b2c3d-0000-0000-0000-000000000001', 500000, [['mi', 500000]], { createdAt: '2026-10-15T01:00:00Z' });
  const later = pay('ffeeddcc-0000-0000-0000-000000000003', 100000, [['b2', 100000]], { createdAt: '2026-11-20T01:00:00Z' });
  const p = pay('9f8e7d6c-5b4a-0000-0000-000000000002', 600050, [['mi', 200000], ['b2', 200000]]);

  it('numbers, dates and words the receipt', () => {
    const doc = receiptDocument(p, { ...party, bills, payments: [earlier, p, later] });
    expect(doc).toMatchObject({ number: 'R-9F8E7D6C', date: 'Nov 5, 2026', receivedFrom: 'Juan Dela Cruz', room: 'Room 1',
      amount: '₱6,000.50', amountInWords: 'Six Thousand Pesos And Fifty Centavos Only', method: 'GCash', reference: 'GC-123',
      from: { name: 'Maria Santos', address: 'Lahug, Cebu City' }, receivedBy: 'Maria Santos', voided: null });
  });

  it('lists the bills it paid, then what is left on them after this payment (later payments not counted)', () => {
    const doc = receiptDocument(p, { ...party, bills, payments: [earlier, p, later] });
    expect(doc.appliedTo).toEqual([{ bill: 'LU-2026-0001 · Move-in SOA', amount: '₱2,000' }, { bill: 'LU-2026-0002 · November 2026 SOA', amount: '₱2,000' }]);
    expect(doc.balance).toBe('₱1,500');
    expect(doc.credit).toBe('₱2,000.50');
  });

  it('says when nothing is left and no credit was kept', () => {
    const exact = pay('11111111-0000', 350000, [['b2', 350000]]);
    expect(receiptDocument(exact, { ...party, bills, payments: [exact] })).toMatchObject({ balance: 'Fully paid', credit: null });
  });

  it('marks a voided payment with its reason', () => {
    const v = pay('22222222-0000', 100, [], { status: 'void', voidReason: 'Transfer bounced', method: 'bank', reference: '' });
    expect(receiptDocument(v, { ...party, ownerName: '', bills, payments: [v] })).toMatchObject({ voided: 'VOID — Transfer bounced',
      appliedTo: [], balance: null, credit: null, method: 'Bank transfer', reference: '', amountInWords: 'One Peso Only', receivedBy: 'Lahug Units' });
  });

  it('never carries proof images', () => {
    expect(JSON.stringify(receiptDocument(p, { ...party, bills, payments: [p] }))).not.toContain('proof');
  });
});
