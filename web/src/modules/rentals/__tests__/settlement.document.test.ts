import { describe, expect, it } from 'vitest';
import { settlementDocument } from '@himan/shared/rentals';
import type { RentalSettlement } from '@himan/shared/rentals';

const settlement: RentalSettlement = { id: 's', propertyId: 'p', tenancyId: 't', depositCentavos: 1000000, unpaidBillsCentavos: 250050,
  lines: [{ label: 'Cleaning', amount: 50000 }, { label: 'Broken door', amount: 150000 }], forfeit: false, refundCentavos: 549950,
  owedCentavos: 0, refundedOn: '2027-04-02', refundMethod: 'gcash', refundReference: 'GC-9', notes: 'Keys returned', status: 'settled',
  settledAt: '2027-04-01T17:30:00Z', proofs: [{ id: 'f', settlementId: 's', propertyId: 'p', name: 'proof.png', mimeType: 'image/png', size: 1,
    storagePath: 'secret/proof.png', ready: true }] };
const ctx = { propertyName: 'Lahug Units', ownerName: 'Maria Santos', ownerAddress: 'Lahug, Cebu City', renterName: 'Juan Dela Cruz',
  roomName: 'Room 1', moveOut: '2027-03-31' };

describe('settlementDocument', () => {
  it('lists the deposit, unpaid bills as one line, each extra line, and the refund in figures and words', () => {
    const doc = settlementDocument(settlement, ctx);
    expect(doc).toMatchObject({ from: { name: 'Maria Santos', address: 'Lahug, Cebu City' }, deposit: '₱10,000',
      fields: [['Tenant', 'Juan Dela Cruz'], ['Room', 'Room 1'], ['Moved out', 'Mar 31, 2027'], ['Settled on', 'Apr 2, 2027']],
      deductions: [{ label: 'Unpaid bills', amount: '₱2,500.50' }, { label: 'Cleaning', amount: '₱500' }, { label: 'Broken door', amount: '₱1,500' }],
      totalDeductions: '₱4,500.50', notes: 'Keys returned', lessor: 'Maria Santos', tenant: 'Juan Dela Cruz', owed: null, credit: null });
    expect(doc.result).toEqual({ title: 'Refund to tenant', amount: '₱5,499.50', words: 'Five Thousand Four Hundred Ninety Nine Pesos And Fifty Centavos Only',
      details: [['Method', 'GCash'], ['Date', 'Apr 2, 2027'], ['Reference no.', 'GC-9']] });
    expect(JSON.stringify(doc)).not.toContain('secret');
  });

  it('says the deposit was kept on forfeit, with what the tenant still owes', () => {
    const doc = settlementDocument({ ...settlement, forfeit: true, refundCentavos: 0, owedCentavos: 0, refundedOn: null, refundMethod: null,
      refundReference: '', unpaidBillsCentavos: 0, lines: [] }, ctx);
    expect(doc.deductions).toEqual([]);
    expect(doc.result).toEqual({ title: 'Deposit kept', amount: '₱10,000', words: null, details: [['Reason', 'Kept in full (early termination)']] });
    expect(doc.owed).toBeNull();
    const owing = settlementDocument({ ...settlement, refundCentavos: 0, owedCentavos: 120000, refundedOn: null, refundMethod: null,
      refundReference: '', lines: [{ label: 'Damage', amount: 869950 }] }, ctx);
    expect(owing.result.details).toEqual([['Reason', 'Used up by the deductions']]);
    expect(owing.owed).toBe('Tenant still owes ₱1,200');
    expect(owing.tenant).toBeNull();
  });

  it('lists the tenant credit when there is one', () => {
    expect(settlementDocument({ ...settlement, creditCentavos: 30000, refundCentavos: 579950 }, ctx)).toMatchObject({
      credit: '₱300', result: { amount: '₱5,799.50' } });
  });

  it('falls back to the property name and skips an empty reference', () => {
    const doc = settlementDocument({ ...settlement, refundReference: '' }, { ...ctx, ownerName: '' });
    expect(doc.from.name).toBe('Lahug Units');
    expect(doc.lessor).toBe('Lahug Units');
    expect(doc.result.details).toEqual([['Method', 'GCash'], ['Date', 'Apr 2, 2027']]);
  });
});
