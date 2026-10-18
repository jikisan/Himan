// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { receiptDocument } from '@himan/shared/rentals';
import type { RentalBill, RentalPayment } from '@himan/shared/rentals';
import { ReceiptPdf } from '../presentation/pdf/ReceiptPdf';
import { pdfText } from './pdfText';

const bill: RentalBill = { id: 'b2', propertyId: 'p', tenancyId: 't', kind: 'monthly', period: '2026-11', number: 'LU-2026-0002',
  issuedOn: '2026-11-01', dueOn: '2026-11-15', status: 'issued', voidReason: '', lines: [{ kind: 'rent', label: 'Rent', amount: 350000 }] };
const payment: RentalPayment = { id: '9f8e7d6c-5b4a-0000-0000-000000000002', propertyId: 'p', tenancyId: 't', amountCentavos: 2_000_050,
  paidOn: '2026-11-05', method: 'gcash', reference: 'GC-123', notes: '', status: 'active', voidReason: '', createdAt: '', proofs: [],
  allocations: [{ id: 'a', paymentId: 'x', billId: 'b2', amountCentavos: 350000, pinned: false }] };
const long = 'Maria Santos-Villanueva de la Cruz y Fernandez Apartments and Boarding House Corporation';
const ctx = { propertyName: 'Lahug Units', ownerName: long, ownerAddress: 'Lahug, Cebu City', renterName: `Juan ${long}`, roomName: 'Room 1',
  bills: [bill], payments: [payment] };

describe('receipt pdf', () => {
  it('prints the acknowledgment receipt with the amount in figures and words', async () => {
    const text = await pdfText(await renderToBuffer(<ReceiptPdf doc={receiptDocument(payment, ctx)} />), 'receipt');
    if (text === null) return;
    for (const s of ['ACKNOWLEDGMENT RECEIPT', 'R-9F8E7D6C', 'Nov 5, 2026', '₱20,000.50', 'Twenty Thousand Pesos And Fifty Centavos Only',
      'GCash', 'GC-123', 'LU-2026-0002 · November 2026 SOA', '₱3,500', 'Fully paid', '₱16,500.50', 'Received by'])
      expect(text.replace(/\s+/g, ' ')).toContain(s);
    expect(text).not.toContain('VOID');
  });

  it('shows the void banner with the reason', async () => {
    const voided = { ...payment, status: 'void' as const, voidReason: 'Transfer bounced', allocations: [] };
    const text = await pdfText(await renderToBuffer(<ReceiptPdf doc={receiptDocument(voided, { ...ctx, payments: [voided] })} />), 'receipt-void');
    if (text !== null) expect(text).toContain('VOID — Transfer bounced');
  });

  it('prints the snapshot balance, and dates live figures on older receipts', async () => {
    const snap = { ...payment, receipt: { applied: [{ billId: 'b2', number: 'LU-2026-0002', amount: 350000 }], creditCentavos: 1_650_050, balanceCentavos: 120000 } };
    const text = await pdfText(await renderToBuffer(<ReceiptPdf doc={receiptDocument(snap, { ...ctx, payments: [snap] })} />), 'receipt-snapshot');
    if (text !== null) {
      expect(text.replace(/\s+/g, ' ')).toContain('Balance after this payment ₱1,200');
      expect(text).not.toContain('Figures as of');
    }
    const live = await pdfText(await renderToBuffer(<ReceiptPdf doc={receiptDocument(payment, { ...ctx, today: '2026-12-01' })} />), 'receipt-live');
    if (live !== null) expect(live).toContain('Figures as of Dec 1, 2026');
  });
});
