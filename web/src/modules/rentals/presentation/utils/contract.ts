import { linkMessage } from '@himan/shared/rentals';
import type { ContractStage, ContractText, LinkKind, RentalProperty, SignMode, TenancyLink } from '@himan/shared/rentals';

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

/** Where a new tenant's details link stands, in plain words; null when there is nothing to wait for or review. */
export function detailsStatus(links: TenancyLink[], tenancyId: string): 'Waiting for details' | 'Details to review' | null {
  const link = links.find((l) => l.tenancyId === tenancyId && l.kind === 'new');
  if (link?.status === 'submitted') return 'Details to review';
  return link?.status === 'open' && !link.revokedAt ? 'Waiting for details' : null;
}

/** The ready-to-send message for a link token (the page lives at /r/:token). */
export const tenantLinkMessage = (token: string, tenantName: string, kind: LinkKind) =>
  linkMessage(`${location.origin}/r/${token}`, tenantName, kind);

/** The two ways a contract is signed: value, label, hint. */
export const SIGN_MODES: [SignMode, string, string][] = [
  ['esign', 'Sign online only', 'A drawn signature is enough.'],
  ['notarize', 'Sign online, then notarize', 'A printed copy is also signed in front of a notary.'],
];
export const signModeWords = (mode: SignMode) => SIGN_MODES.find(([value]) => value === mode)![1];

/** Short badge for the Tenants list and Rooms board; null once the contract is done or not needed. */
export const CONTRACT_BADGE: Record<ContractStage, string | null> = {
  none: 'No contract', draft: 'Contract not sent', sent: 'Waiting to sign', signed: 'Needs your signature', done: null, not_needed: null,
};
/** Open stages: the nudge shows on Home and the sheet puts the contract first. */
export const contractOpen = (stage: ContractStage) => CONTRACT_BADGE[stage] !== null;
