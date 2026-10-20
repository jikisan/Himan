// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isValidElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { billDocument } from '@himan/shared/rentals';
import type { BillLine, PaymentAccount, RentalBill } from '@himan/shared/rentals';
import { BillPdf } from '../presentation/pdf/BillPdf';
import { pdfText } from './pdfText';

// A 1×1 PNG, standing in for a QR image.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const long = 'Maria Santos-Villanueva de la Cruz y Fernandez Apartments and Boarding House Corporation';
const lines: BillLine[] = [
  { kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } },
  { kind: 'electric', label: 'Electricity', amount: 80000, meter: { readings: ['r2'], fromDate: '2026-10-15', fromValue: 1200,
    toDate: '2026-11-10', toValue: 1350, usage: 150, rate: 1600, sharedWith: 3 } },
  { kind: 'water', label: 'Water', amount: 20000 },
  ...Array.from({ length: 60 }, (_, i): BillLine => ({ kind: 'other', label: `Other charge number ${i + 1} for ${long}`, amount: 1000 + i })),
];
const bill: RentalBill = { id: 'b', propertyId: 'p', tenancyId: 't', kind: 'monthly', period: '2026-11', number: 'LU-2026-0002',
  issuedOn: '2026-11-01', dueOn: '2026-11-15', status: 'issued', voidReason: '', lines };
const account = (id: string, qrPath: string | null): PaymentAccount => ({ id, propertyId: 'p', kind: 'gcash', label: 'GCash',
  accountName: 'Maria Santos', accountNumber: '0917 555 1234', qrPath, position: 0 });
const info = { propertyName: 'Lahug Units', ownerName: long, ownerAddress: 'Lahug, Cebu City', renterName: `Juan ${long}`,
  roomName: 'Room 1', lateFeeCentavos: 50000, previousBalanceCentavos: 100000, accounts: [account('a1', 'a1.png'), account('a2', 'a2.png')] };

describe('bill pdf', () => {
  it('prints a long bill over several pages with pesos, readings, accounts and the footer', async () => {
    const pdf = await renderToBuffer(<BillPdf doc={billDocument(bill, info)} qr={{ a1: PNG }} />);
    const text = await pdfText(pdf, 'bill');
    expect(new TextDecoder('latin1').decode(pdf)).toMatch(/\/Type\s*\/Page\b[\s\S]*\/Type\s*\/Page\b/); // more than one page
    if (text === null) return;
    for (const s of ['STATEMENT OF ACCOUNT', 'LU-2026-0002', '₱3,500', 'Nov 10, 2026', '1,350', '150 kWh × ₱16', 'Your 1/3 share',
      'Other charge number 60', 'Previous balance', 'PAY TO', '0917 555 1234', 'Late payment will have a penalty of ₱500.', 'Received by'])
      expect(text).toContain(s);
    expect(text).not.toContain('±');
  });

  it('marks a cancelled bill and asks for nothing on it', async () => {
    const text = await pdfText(await renderToBuffer(<BillPdf doc={billDocument({ ...bill, status: 'void', lines: lines.slice(0, 3) }, info)} qr={{}} />));
    if (text === null) return;
    expect(text).toContain('CANCELLED');
    expect(text).toContain('Previous balance');
    expect(text).not.toContain('Amount due now');
  });

  it('keeps headings with what follows them at a page foot', () => {
    const found: Record<string, number | undefined> = {};
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!isValidElement(node)) return;
      const { children, minPresenceAhead } = node.props as { children?: unknown; minPresenceAhead?: number };
      if (typeof children === 'string') found[children] = minPresenceAhead;
      walk(children);
    };
    walk(BillPdf({ doc: billDocument(bill, info), qr: {} }));
    expect(found['Rent and charges']).toBeGreaterThanOrEqual(24);
    expect(found['Pay to']).toBeGreaterThanOrEqual(96);
  });
});
