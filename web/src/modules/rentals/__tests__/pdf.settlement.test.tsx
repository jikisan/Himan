// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { settlementDocument } from '@himan/shared/rentals';
import type { RentalSettlement } from '@himan/shared/rentals';
import { SettlementPdf } from '../presentation/pdf/SettlementPdf';
import { pdfText } from './pdfText';

const long = 'Maria Santos-Villanueva de la Cruz y Fernandez Apartments and Boarding House Corporation';
const settlement: RentalSettlement = { id: 's', propertyId: 'p', tenancyId: 't', depositCentavos: 1000000, unpaidBillsCentavos: 250050,
  lines: [{ label: 'Cleaning', amount: 50000 }, { label: `Broken door replaced by ${long}`, amount: 150000 }], forfeit: false,
  refundCentavos: 549950, owedCentavos: 0, refundedOn: '2027-04-02', refundMethod: 'gcash', refundReference: 'GC-9', notes: 'Keys returned',
  status: 'settled', settledAt: '2027-04-02T01:00:00Z', proofs: [] };
const ctx = { propertyName: 'Lahug Units', ownerName: long, ownerAddress: 'Lahug, Cebu City', renterName: `Juan ${long}`, roomName: 'Room 1',
  moveOut: '2027-03-31' };

describe('settlement pdf', () => {
  it('prints the deposit, each deduction, the refund in words and both signature lines', async () => {
    const text = await pdfText(await renderToBuffer(<SettlementPdf doc={settlementDocument(settlement, ctx)} />), 'settlement');
    if (text === null) return;
    for (const s of ['DEPOSIT SETTLEMENT', 'Mar 31, 2027', 'Deposit held', '₱10,000', 'Unpaid bills', '₱2,500.50', 'Cleaning', '₱1,500',
      'REFUND TO TENANT', '₱5,499.50', 'Five Thousand Four Hundred Ninety Nine Pesos And Fifty Centavos Only', 'GCash', 'Apr 2, 2027', 'GC-9',
      'Keys returned', 'Lessor', 'Received by'])
      expect(text.replace(/\s+/g, ' ')).toContain(s);
  });

  it('says what the tenant still owes when the deposit is kept', async () => {
    const kept = { ...settlement, forfeit: true, refundCentavos: 0, owedCentavos: 120000, refundedOn: null, refundMethod: null, refundReference: '' };
    const text = await pdfText(await renderToBuffer(<SettlementPdf doc={settlementDocument(kept, ctx)} />), 'settlement-kept');
    if (text === null) return;
    expect(text).toContain('DEPOSIT KEPT');
    expect(text).toContain('Kept in full (early termination)');
    expect(text).toContain('Tenant still owes ₱1,200');
    expect(text).not.toContain('REFUND TO TENANT');
    expect(text).not.toContain('Received by');
  });

  it('prints the tenant credit when there is one', async () => {
    const withCredit = { ...settlement, creditCentavos: 30000, refundCentavos: 579950 };
    const text = await pdfText(await renderToBuffer(<SettlementPdf doc={settlementDocument(withCredit, ctx)} />), 'settlement-credit');
    if (text === null) return;
    expect(text.replace(/\s+/g, ' ')).toContain('Tenant credit ₱300');
    expect(text).toContain('₱5,799.50');
  });
});
