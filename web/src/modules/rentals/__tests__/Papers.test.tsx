import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NOTARY_ACKNOWLEDGMENT, receiptDocument, renderClauses } from '@himan/shared/rentals';
import type { ContractText, RentalBill, RentalPayment } from '@himan/shared/rentals';
import { ContractPaper } from '../presentation/components/ContractPaper';
import { ReceiptPaper } from '../presentation/components/ReceiptPaper';
import { contractPdfData, manilaDate } from '../presentation/utils/contract';

const PNG = 'data:image/png;base64,AAAA';
const property = { lessorName: 'Maria Santos', lessorAddress: '', address: 'Talamban, Cebu City', signingCity: 'Mandaue City' };
const text = (extra: Partial<ContractText> = {}): ContractText => ({ id: 'ct', propertyId: 'p', contractId: 'c',
  body: ['KNOW ALL MEN BY THESE PRESENTS:', '1. Rent is ₱5,000 a month.', '2. Pay on the 5th.', 'IN WITNESS WHEREOF, the parties sign below.'],
  specialTerms: 'No pets.', status: 'draft', signMode: null, contentHash: null, tenantName: null, tenantSignature: null, tenantSignedAt: null,
  lessorSignedAt: null, lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '', ...extra });
const signed = (extra: Partial<ContractText> = {}) => text({ status: 'countersigned', signMode: 'esign', tenantName: 'Ben Cruz',
  tenantSignature: PNG, tenantSignedAt: '2026-10-19T02:00:00Z', lessorSignature: PNG, lessorSignedAt: '2026-10-20T02:00:00Z',
  contentHash: 'abcdef0123456789'.repeat(4), ...extra });

describe('ContractPaper (the on-screen copy of the contract PDF)', () => {
  const paper = () => within(screen.getByRole('article', { name: 'Contract of Lease' }));

  it('shows the lessor, title, every clause with special terms last, and the witness lines', () => {
    const doc = contractPdfData(text(), property, 'Ben Cruz');
    render(<ContractPaper doc={doc} />);
    const sheet = paper();
    expect(sheet.getAllByText(doc.lessorName).length).toBeGreaterThan(0);
    expect(sheet.getByText(doc.lessorAddress)).toBeInTheDocument();
    expect(sheet.getByRole('heading', { name: 'Contract of Lease' })).toBeInTheDocument();
    for (const line of doc.lines) expect(sheet.getByText(line)).toBeInTheDocument();
    expect(doc.lines.at(-2)).toBe('3. Special terms: No pets.');
    expect(sheet.getByText('Ben Cruz')).toBeInTheDocument();
    expect(sheet.getByText('LESSOR')).toBeInTheDocument();
    expect(sheet.getByText('LESSEE')).toBeInTheDocument();
    expect(sheet.getByText('SIGNED IN THE PRESENCE OF:')).toBeInTheDocument();
  });

  it('is a white sheet like the PDF, in light and dark mode alike', () => {
    render(<ContractPaper doc={contractPdfData(text(), property)} />);
    const sheet = screen.getByRole('article', { name: 'Contract of Lease' });
    expect(sheet.className).toMatch(/bg-white/);
    expect(sheet.className).toMatch(/text-neutral-900/);
  });

  it('leaves blank signature lines until signed, with no notary page or fingerprint', () => {
    render(<ContractPaper doc={contractPdfData(text(), property)} />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByText(/Signed online/)).toBeNull();
    expect(screen.queryByText(/Document fingerprint/)).toBeNull();
    expect(screen.queryByText('ACKNOWLEDGEMENT')).toBeNull();
  });

  it('shows both signatures with their dates and the 12-character fingerprint once signed', () => {
    const doc = contractPdfData(signed(), property);
    render(<ContractPaper doc={doc} />);
    expect(screen.getByRole('img', { name: 'Lessor signature' })).toHaveAttribute('src', PNG);
    expect(screen.getByRole('img', { name: 'Lessee signature' })).toHaveAttribute('src', PNG);
    expect(screen.getByText(`Signed online ${manilaDate(doc.tenantSignedAt!)}`)).toBeInTheDocument();
    expect(screen.getByText(`Signed online ${manilaDate(doc.lessorSignedAt!)}`)).toBeInTheDocument();
    expect(screen.getByText('Document fingerprint: abcdef012345 (changes if the signed text changes)')).toBeInTheDocument();
    expect(screen.queryByText(doc.contentHash!)).toBeNull();
  });

  it('adds the notary acknowledgment only for notarize', () => {
    const doc = contractPdfData(signed({ signMode: 'notarize' }), property);
    render(<ContractPaper doc={doc} />);
    for (const line of renderClauses(NOTARY_ACKNOWLEDGMENT, { signing_city: doc.signingCity })) expect(screen.getByText(line)).toBeInTheDocument();
  });
});

const bill: RentalBill = { id: 'b2', propertyId: 'p', tenancyId: 't', kind: 'monthly', period: '2026-11', number: 'LU-2026-0002',
  issuedOn: '2026-11-01', dueOn: '2026-11-15', status: 'issued', voidReason: '', lines: [{ kind: 'rent', label: 'Rent', amount: 350000 }] };
const pay = (extra: Partial<RentalPayment> = {}): RentalPayment => ({ id: '9f8e7d6c-5b4a', propertyId: 'p', tenancyId: 't', amountCentavos: 400050,
  paidOn: '2026-11-05', method: 'gcash', reference: 'GC-123', notes: '', status: 'active', voidReason: '', createdAt: '2026-11-05T01:00:00Z',
  proofs: [{ id: 'f', paymentId: 'x', propertyId: 'p', name: 'proof.png', mimeType: 'image/png', size: 1, storagePath: 'secret/proof.png', ready: true }],
  allocations: [{ id: 'a', paymentId: 'x', billId: 'b2', amountCentavos: 200000, pinned: false }], ...extra });
const ctx = (p: RentalPayment) => ({ propertyName: 'Lahug Units', ownerName: 'Maria Santos', ownerAddress: 'Lahug, Cebu City',
  renterName: 'Juan Dela Cruz', roomName: 'Room 1', bills: [bill], payments: [p], today: '2026-11-10' });

describe('ReceiptPaper (the on-screen copy of the receipt PDF)', () => {
  const paper = () => within(screen.getByRole('article', { name: 'Acknowledgment Receipt' }));

  it('shows every figure and label the PDF is made from, and no proofs', () => {
    const p = pay();
    const doc = receiptDocument(p, ctx(p));
    render(<ReceiptPaper doc={doc} />);
    const sheet = paper();
    expect(sheet.getByRole('heading', { name: 'Acknowledgment Receipt' })).toBeInTheDocument();
    for (const v of [doc.from.address, doc.number, doc.date, doc.room, doc.amount, doc.amountInWords, doc.method, doc.reference, doc.balance!, doc.credit!, doc.asOf!])
      expect(sheet.getByText(v, { exact: false })).toBeInTheDocument();
    expect(sheet.getByText(doc.receivedFrom)).toBeInTheDocument();
    for (const a of doc.appliedTo) { expect(sheet.getByText(a.bill)).toBeInTheDocument(); expect(sheet.getByText(a.amount)).toBeInTheDocument(); }
    for (const label of ['Applied to', doc.balanceLabel, 'Kept as credit for the next SOA', 'Received by', 'Reference no.', 'Method']) expect(sheet.getByText(label)).toBeInTheDocument();
    expect(sheet.getAllByText(doc.receivedBy).length).toBeGreaterThan(0);
    expect(screen.queryByText(/proof/i)).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('is a white sheet like the PDF, in light and dark mode alike', () => {
    const p = pay();
    render(<ReceiptPaper doc={receiptDocument(p, ctx(p))} />);
    expect(screen.getByRole('article', { name: 'Acknowledgment Receipt' }).className).toMatch(/bg-white.*text-neutral-900|text-neutral-900.*bg-white/);
  });

  it('shows the VOID banner with its reason, and no balance or credit', () => {
    const p = pay({ status: 'void', voidReason: 'Transfer bounced' });
    const doc = receiptDocument(p, ctx(p));
    render(<ReceiptPaper doc={doc} />);
    expect(paper().getByText('VOID — Transfer bounced')).toBeInTheDocument();
    expect(screen.queryByText('Kept as credit for the next SOA')).toBeNull();
  });

  it('has no Figures-as-of note on a snapshot receipt', () => {
    const p = pay({ receipt: { applied: [{ billId: 'b2', number: 'LU-2026-0002', amount: 200000 }], balanceCentavos: 150000, creditCentavos: 0 } });
    render(<ReceiptPaper doc={receiptDocument(p, ctx(p))} />);
    expect(screen.queryByText(/Figures as of/)).toBeNull();
    expect(screen.getByText('Balance after this payment')).toBeInTheDocument();
  });
});
