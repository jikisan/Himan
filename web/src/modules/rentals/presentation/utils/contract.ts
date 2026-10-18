import type { ContractText, RentalProperty, SignMode } from '@himan/shared/rentals';

/**
 * The contract as printed and shown: the frozen `body`, with the special terms as the last numbered clause, placed before
 * the closing "IN WITNESS WHEREOF" line when the template ends with one.
 */
export function contractLines(body: string[], specialTerms: string): string[] {
  const terms = specialTerms.trim();
  if (!terms) return body;
  const n = body.filter((line) => /^\d+\. /.test(line)).length + 1;
  const closing = /^IN WITNESS WHEREOF/i.test(body.at(-1) ?? '');
  const line = `${n}. Special terms: ${terms}`;
  return closing ? [...body.slice(0, -1), line, body.at(-1)!] : [...body, line];
}

/** Everything the contract PDF prints; no ids, file paths or proofs. Built by the landlord page and the renter link page. */
export interface ContractPdfData {
  lessorName: string; lessorAddress: string; signingCity: string; lines: string[]; signMode: SignMode | null;
  tenantName: string; tenantSignature: string | null; tenantSignedAt: string | null;
  lessorSignature: string | null; lessorSignedAt: string | null; contentHash: string | null;
}

export function contractPdfData(text: ContractText,
  property: Pick<RentalProperty, 'lessorName' | 'lessorAddress' | 'address' | 'signingCity'>, renterName = ''): ContractPdfData {
  return { lessorName: property.lessorName, lessorAddress: property.lessorAddress || property.address, signingCity: property.signingCity,
    lines: contractLines(text.body, text.specialTerms), signMode: text.signMode, tenantName: text.tenantName || renterName,
    tenantSignature: text.tenantSignature, tenantSignedAt: text.tenantSignedAt, lessorSignature: text.lessorSignature,
    lessorSignedAt: text.lessorSignedAt, contentHash: text.contentHash };
}

/** "Oct 19, 2026" in Manila time for a timestamp. */
export const manilaDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));
