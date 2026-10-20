import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { billDocument } from '@himan/shared/rentals';
import type { RentalBill, StatementInfo } from '@himan/shared/rentals';
import { Statement } from '../presentation/components/Statement';

const qrUrl = (p: string) => `https://files.test/${p}`;

const bill: Pick<RentalBill, 'period' | 'dueOn' | 'lines'> & Partial<Pick<RentalBill, 'number' | 'issuedOn' | 'status'>> = {
  period: '2026-11', dueOn: '2026-11-15', number: 'LU-2026-0002', issuedOn: '2026-10-15', status: 'issued',
  lines: [{ kind: 'rent', label: 'Rent', amount: 800000, period: { from: '2026-11-15', to: '2026-12-14' } } as never,
    { kind: 'charge', label: 'Parking', amount: 50000 } as never],
};
const info: StatementInfo = {
  propertyName: 'Lahug Units', ownerName: 'Santerna', ownerAddress: 'Cebu City', renterName: 'Juan Dela Cruz', roomName: 'Room A',
  lateFeeCentavos: 50000, previousBalanceCentavos: 0, paidCentavos: 300000,
  accounts: [{ id: 'a1', propertyId: 'p', kind: 'gcash', label: 'GCash', accountName: 'Santerna', accountNumber: '0917', qrPath: 'p/a1.png', position: 0 },
    { id: 'a2', propertyId: 'p', kind: 'bank', label: 'BPI', accountName: 'Santerna', accountNumber: '123', qrPath: null, position: 1 }],
};

describe('Statement (the on-screen copy of the PDF)', () => {
  it('shows every figure and label the PDF is made from', () => {
    render(<Statement bill={bill} info={info} qrUrl={qrUrl} />);
    const sheet = within(screen.getByRole('article', { name: 'Statement of Account' }));
    const doc = billDocument(bill, info);
    for (const [k, v] of doc.fields) { expect(sheet.getByText(k + ':')).toBeInTheDocument(); expect(sheet.getByText(v)).toBeInTheDocument(); }
    expect(sheet.getByText(doc.total)).toBeInTheDocument();
    for (const [k] of doc.summary) expect(sheet.getByText(k)).toBeInTheDocument();
    expect(sheet.getByText(doc.lateFee!)).toBeInTheDocument();
    expect(sheet.getByText('Received by:')).toBeInTheDocument();
  });
  it('is a white sheet like the PDF, in light and dark mode alike', () => {
    render(<Statement bill={bill} info={info} qrUrl={qrUrl} />);
    const sheet = screen.getByRole('article', { name: 'Statement of Account' });
    expect(sheet.className).toMatch(/bg-white/);
    expect(sheet.className).toMatch(/text-neutral-900/);
  });
  it('shows the QR image next to accounts that have one, and only those', () => {
    render(<Statement bill={bill} info={info} qrUrl={qrUrl} />);
    const qr = screen.getAllByRole('img', { name: /QR/i });
    expect(qr).toHaveLength(1);
    expect(qr[0]).toHaveAttribute('src', 'https://files.test/p/a1.png');
    expect(qr[0]).toHaveAttribute('alt', 'GCash QR code');
  });
  it('hides the QR image if it fails to load, keeping the account text', () => {
    render(<Statement bill={bill} info={info} qrUrl={qrUrl} />);
    fireEvent.error(screen.getByRole('img', { name: /QR/i }));
    expect(screen.queryByRole('img', { name: /QR/i })).toBeNull();
    expect(screen.getByText(/0917/)).toBeInTheDocument();
  });
  it('asks for nothing when cancelled, like the PDF', () => {
    render(<Statement bill={{ ...bill, status: 'void' }} info={info} qrUrl={qrUrl} />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByText('Amount due now')).toBeNull();
  });
});
