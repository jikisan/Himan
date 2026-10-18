// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { DEFAULT_CLAUSES, contractValues, renderClauses } from '@himan/shared/rentals';
import type { ContractText, RentalProperty } from '@himan/shared/rentals';
import { ContractPdf } from '../presentation/pdf/ContractPdf';
import { contractLines, contractPdfData } from '../presentation/utils/contract';
import { pdfText } from './pdfText';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const property = { name: 'Lahug Units', address: '12 Gorordo Ave, Lahug, Cebu City', lessorName: 'Maria Santos', lessorCivilStatus: 'married',
  lessorAddress: 'Banilad, Cebu City', lessorCapacity: 'owner', signingCity: 'Cebu City' } as RentalProperty;
const body = renderClauses(DEFAULT_CLAUSES, contractValues({ property, renter: { fullName: 'Juan Dela Cruz', address: 'Mandaue City' },
  contract: { startDate: '2026-11-01', endDate: '2027-10-31', monthlyRentCentavos: 1_500_000, dueDay: 30, advanceMonths: 1, depositCentavos: 1_500_000 },
  signingDate: '2026-10-18' }));
const hash = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
const text: ContractText = { id: 'secret-text-id', propertyId: 'p', contractId: 'c', body, specialTerms: 'The storage room is not part of the lease.',
  status: 'countersigned', signMode: 'esign', contentHash: hash, tenantName: 'Juan Dela Cruz', tenantSignature: PNG,
  tenantSignedAt: '2026-10-19T03:00:00Z', lessorSignedAt: '2026-10-20T03:00:00Z', lessorSignature: PNG, notarizedScanPath: 'p/contracts/x/scan.pdf',
  createdAt: '', updatedAt: '' };

describe('contract lines', () => {
  it('puts the special terms in as the last numbered clause, before the closing', () => {
    const lines = contractLines(body, 'No pets.');
    const numbered = body.filter((l) => /^\d+\. /.test(l)).length;
    expect(lines.at(-2)).toBe(`${numbered + 1}. Special terms: No pets.`);
    expect(lines.at(-1)).toMatch(/^IN WITNESS WHEREOF/);
    expect(contractLines(body, '  ')).toEqual(body);
  });
});

describe('contract pdf', () => {
  it('prints the signed contract with signatures, witnesses and a fingerprint, and nothing private', async () => {
    const pdf = await renderToBuffer(<ContractPdf doc={contractPdfData(text, property)} />);
    expect(new TextDecoder('latin1').decode(pdf)).not.toContain('secret-text-id');
    const out = await pdfText(pdf, 'contract');
    if (out === null) return;
    const flat = out.replace(/\s+/g, ' ');
    for (const s of ['CONTRACT OF LEASE', 'Maria Santos', 'KNOW ALL MEN BY THESE PRESENTS', '₱15,000.00', '27. That the LESSEE hereby warrants',
      '28. Special terms: The storage room is not part of the lease.', 'IN WITNESS WHEREOF', 'SIGNED IN THE PRESENCE OF', 'Juan Dela Cruz',
      'LESSOR', 'LESSEE', 'Signed online Oct 19, 2026', 'Signed online Oct 20, 2026', 'a1b2c3d4e5f6'])
      expect(flat).toContain(s);
    expect(flat).not.toContain(hash);
    expect(flat).not.toContain('ACKNOWLEDGEMENT');
    expect(flat).not.toContain('scan.pdf');
    expect(flat).not.toContain('±');
    expect(out).not.toMatch(/\(-\s*$/m); // no hyphen where the peso sign's font starts
  });

  it('adds the notary page only when the tenant chose to notarize', async () => {
    const out = await pdfText(await renderToBuffer(<ContractPdf doc={contractPdfData({ ...text, signMode: 'notarize' }, property)} />), 'contract-notary');
    if (out === null) return;
    expect(out).toContain('ACKNOWLEDGEMENT');
    expect(out).toContain('Cebu City');
  });

  it('prints blank signature lines on an unsigned draft', async () => {
    const out = await pdfText(await renderToBuffer(<ContractPdf doc={contractPdfData({ ...text, status: 'draft', tenantSignature: null,
      tenantSignedAt: null, lessorSignature: null, lessorSignedAt: null, contentHash: null, signMode: null }, property)} />), 'contract-draft');
    if (out === null) return;
    expect(out).not.toContain('Signed online');
    expect(out).not.toContain('fingerprint');
  });
});
