import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import { formatPesos } from './money.js';
import type { RentalContract, RentalProperty, RentalTenancy, Renter } from './types.js';
import { pesosInWords } from './words.js';

export interface Clause { id: string; text: string }
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'countersigned';
export type SignMode = 'esign' | 'notarize';
export type LinkKind = 'new' | 'existing';

/** A contract's text as sent to the tenant; frozen (with `contentHash`) once the tenant signs. */
export interface ContractText {
  id: string; propertyId: string; contractId: string; body: string[]; specialTerms: string; status: ContractStatus;
  signMode: SignMode | null; contentHash: string | null; tenantName: string | null; tenantSignature: string | null;
  tenantSignedAt: string | null; lessorSignedAt: string | null; lessorSignature: string | null;
  notarizedScanPath: string | null; createdAt: string; updatedAt: string;
  /** Signed on the owner's device with them present (`witnessedBy`: that manager's user id). */
  signedInPerson?: boolean; witnessedBy?: string | null;
}

/** The one answer for a guessed, old, revoked or expired link, so a caller learns nothing about which. */
export const INVALID_LINK_MESSAGE = 'This link isn\'t valid anymore';

export const MAX_SIGNATURE_LENGTH = 150_000;
export const signatureSchema = z.string('Draw your signature')
  .refine((s) => s.startsWith('data:image/png;base64,') && s.length <= MAX_SIGNATURE_LENGTH, 'Draw your signature again (it must be a small PNG)');

export const clausesSchema = z.array(z.object({
  id: z.string().trim().min(1).max(80), text: z.string().trim().min(1, 'A clause can’t be empty').max(4000, 'Keep each clause under 4,000 characters'),
})).min(1, 'Keep at least one clause').max(80, 'A contract can have up to 80 clauses');

/** `{token}/{file}.{pdf|jpg|jpeg|png}`: one plain file directly inside the link's folder. */
export const ID_PATH = /^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(pdf|jpe?g|png)$/;

export const UNSAFE_LESSEE_MESSAGE = 'Remove line breaks and braces from the name and address';
/** A control character (line breaks included) or `{{`/`}}` in a lessee name or address could inject text into the signed contract.
 * Same rule as the database (`rental_resolve_lessee`, `rental_link_submit_details`, `rental_sign_in_person`). */
const unsafeLessee = (v: string) => v.includes('{{') || v.includes('}}') || Array.from(v).some((c) => c < ' ' || c === '\x7f');

const required = (message: string, max: number) => z.string().trim().min(1, message).max(max);
const lesseeValue = (message: string, max: number) => required(message, max).refine((v) => !unsafeLessee(v), UNSAFE_LESSEE_MESSAGE);
/** The new-tenant form on the link; `idPaths` are the files `LinkRepository.uploadId` returned. */
export const linkDetailsSchema = z.object({
  fullName: lesseeValue('Enter your full name', 160), phone: required('Enter your mobile number', 40),
  address: lesseeValue('Enter your home address', 300), emergencyName: required('Enter an emergency contact name', 160),
  emergencyPhone: required('Enter the emergency contact’s number', 40),
  facebook: z.string().trim().max(200), email: z.union([z.literal(''), z.email('Enter a valid email')]),
  occupants: z.number().int().min(1).max(50),
  idPaths: z.array(z.string().regex(ID_PATH, 'That file can’t be used')).min(1, 'Add a photo of a valid ID').max(3, 'Add up to 3 ID files'),
});

/** The same form filled in on the owner's device (in-person signing): the ID files are uploaded separately. */
export const inPersonDetailsSchema = linkDetailsSchema.omit({ idPaths: true });
export type InPersonDetails = z.infer<typeof inPersonDetailsSchema>;

/** What a new tenant types into the link form; nothing reaches the renter record until a manager accepts it. */
export type LinkDetails = z.infer<typeof linkDetailsSchema>;
/** As stored for review: `occupants` is null when the tenant didn't give it (Accept keeps the renter's). */
export type SubmittedDetails = Omit<LinkDetails, 'occupants'> & { occupants: number | null };
export interface TenancyLink {
  tenancyId: string; propertyId: string; token: string; kind: LinkKind; status: 'open' | 'submitted' | 'accepted';
  submittedDetails: SubmittedDetails | null; submittedAt: string | null; acceptedAt: string | null; revokedAt: string | null; createdAt: string;
}

export const CONTRACT_FIELDS = [
  { key: 'lessor_name', label: 'Lessor name' },
  { key: 'lessor_civil_status', label: 'Lessor civil status' },
  { key: 'lessor_address', label: 'Lessor address' },
  { key: 'lessor_capacity', label: 'Lessor is owner or representative' },
  { key: 'lessee_name', label: 'Tenant name' },
  { key: 'lessee_address', label: 'Tenant address' },
  { key: 'property_address', label: 'Property address' },
  { key: 'term_start', label: 'Contract start' },
  { key: 'term_end', label: 'Contract end' },
  { key: 'monthly_rent', label: 'Monthly rent' },
  { key: 'monthly_rent_words', label: 'Monthly rent in words' },
  { key: 'due_day_ordinal', label: 'Rent due day (e.g. 30th)' },
  { key: 'advance', label: 'Advance' },
  { key: 'advance_words', label: 'Advance in words' },
  { key: 'deposit', label: 'Deposit' },
  { key: 'deposit_words', label: 'Deposit in words' },
  { key: 'signing_city', label: 'City of signing' },
  { key: 'signing_date', label: 'Date of signing' },
] as const;
export type ContractField = (typeof CONTRACT_FIELDS)[number]['key'];
export type ContractValues = Partial<Record<ContractField, string>>;

const BLANK = '__________';

// The owner's Philippine contract of lease, personal details replaced by fields. Numbered clauses get "1. ", "2. "…
// from their order; the parts below (and the notary page) are not numbered.
const UNNUMBERED = new Set(['preamble', 'parties', 'and', 'lessee', 'witnesseth', 'whereas-lessor', 'whereas-lessee', 'closing',
  'notary-venue', 'notary-title', 'notary-body', 'notary-seal', 'notary-register']);

export const DEFAULT_CLAUSES: Clause[] = [
  { id: 'preamble', text: 'KNOW ALL MEN BY THESE PRESENTS:' },
  { id: 'parties', text: 'This CONTRACT OF LEASE, made and entered into this {{signing_date}} at {{signing_city}}, by and between: {{lessor_name}}, of legal age, {{lessor_civil_status}} and residing at {{lessor_address}}, and hereinafter referred to as the LESSOR,' },
  { id: 'and', text: '-and-' },
  { id: 'lessee', text: '{{lessee_name}}, also of legal age, and residing at {{lessee_address}}, and hereinafter referred to as the LESSEE,' },
  { id: 'witnesseth', text: 'WITNESSETH: That' },
  { id: 'whereas-lessor', text: 'WHEREAS the LESSOR is {{lessor_capacity}} of a house and lot situated at {{property_address}};' },
  { id: 'whereas-lessee', text: 'WHEREAS, the LESSEE is willing to lease said property from the LESSOR under the following terms and conditions:' },
  { id: 'term', text: 'That the lease shall be for a period from {{term_start}}, up to {{term_end}};' },
  { id: 'coverage', text: 'That the lease covers the leased premises described above, subject to the special terms of this contract;' },
  { id: 'rent', text: 'That the LESSEE shall pay a monthly rental of {{monthly_rent_words}} ({{monthly_rent}}), Philippine Currency, payable every {{due_day_ordinal}} day of the month;' },
  { id: 'deposit', text: 'That the LESSEE shall pay upon signing this contract a deposit of {{deposit_words}} ({{deposit}}) and an advance of {{advance_words}} ({{advance}}). The deposit shall not be considered as payment for rental but will be reimbursed by the LESSOR upon the termination of this contract, unless the leased property suffers damages or the LESSEE has unpaid utility and water bills in which case, said bills and damages will be paid out of the deposit;' },
  { id: 'utilities', text: 'That electric and water bills shall be for the account of the LESSEE, the exact amount of which will be based on the electric and water reading for each month;' },
  { id: 'residential', text: 'That the leased premises shall be devoted exclusively for residential purposes only;' },
  { id: 'furnishings', text: 'That the refrigerator, washing machine, air-conditioning unit, tables, chairs, cabinets, and other furniture or appliances provided in the premises are for the convenience of the LESSEE but are not included in the rental value. The LESSEE shall ensure proper care and use of all such items and return them in good condition, subject to normal wear and tear. For the air-conditioning unit, the LESSEE shall provide regular cleaning and maintenance at least once every six (6) months at their own expense. Any damage to any of the said appliances or furniture caused by misuse, neglect, or failure to maintain shall be repaired or replaced at the expense of the LESSEE;' },
  { id: 'improvements', text: 'That all improvements to be made or introduced on the premises shall require the prior written consent of the LESSOR, and any improvement that can no longer be removed by the LESSEE without causing damage shall become the property of the LESSOR;' },
  { id: 'repairs', text: 'That any expenses for repair arising from damage willfully or negligently caused by the LESSEE, or by their household members or guests, shall be shouldered by the LESSEE;' },
  { id: 'sublease', text: 'That under no circumstance will the leased premises be subleased to any other person or entity without the written consent and approval of the LESSOR;' },
  { id: 'occupants', text: 'That the maximum number of occupants allowed to reside in the leased premises shall not exceed six (6) persons at any given time;' },
  { id: 'holdover', text: 'That if said premises is not surrendered to the LESSOR at the expiration of the lease contract, the LESSEE shall be responsible to the LESSOR for all damages which the LESSOR may suffer by reason thereof;' },
  { id: 'return', text: 'That the LESSEE hereby agrees to return the leased premises at the expiration of the contract in as good a condition as reasonable wear and tear will permit without any delay whatsoever;' },
  { id: 'arrears', text: 'That in case the LESSEE shall have arrears in rental payments and is unable to pay said arrears before vacating the premises, the LESSOR shall have the option to take possession of any tangible and valuable property to offset the amount of rental arrears without the need of judicial action;' },
  { id: 'abandonment', text: 'That in case the leased premises shall be abandoned, vacated, or deserted for a period of one (1) week without any previous notice to the LESSOR and during the time the LESSEE is in default in the payment of the monthly rental, then under such circumstances the LESSOR can consider the leased premises as legally abandoned and may enter the premises and take possession thereof without prejudice to its right of action against the LESSEE;' },
  { id: 'increase', text: 'That the LESSOR reserves the right to increase the rental rate after one (1) year, if the contract is renewed by mutual agreement of the parties;' },
  { id: 'cleanliness', text: 'That the LESSEE is obliged to observe cleanliness and maintain peaceful condition inside and outside the premises;' },
  { id: 'late-payment', text: 'That if the LESSEE is late in paying the rent or monthly utilities for one (1) month on multiple occasions, or becomes late for two (2) consecutive months, the LESSOR has the right to terminate this contract and forfeit the advance payment;' },
  { id: 'move-out-cleaning', text: 'That if the LESSEE does not wish to renew the contract at the end of its term, or decides to discontinue renting prior to expiration, the LESSEE shall clean the house thoroughly and ensure no garbage or personal belongings are left behind. Failure to comply authorizes the LESSOR to deduct the necessary cleaning costs from deposit;' },
  { id: 'move-out-bills', text: 'That if the LESSEE does not wish to renew the contract at the end of its term, or decides to discontinue renting prior to expiration, the LESSEE shall settle all outstanding utility and water bills before vacating the premises. Failure to comply authorizes the LESSOR to deduct the unpaid bills from deposit;' },
  { id: 'inspection', text: 'That the LESSEE shall allow the LESSOR or its authorized representative to inspect the leased premises at reasonable times and with prior notice to ensure compliance with the terms and conditions of this contract.' },
  { id: 'hazards', text: 'That the LESSEE shall not keep or store hazardous, flammable, or illegal substances within the premises;' },
  { id: 'belongings', text: 'That the LESSEE shall be solely responsible for the safety and security of their personal belongings. The LESSOR shall not be liable for any loss, theft, or damage to the LESSEE’s personal property during the lease period;' },
  { id: 'report-repairs', text: 'That the LESSEE shall inform the LESSOR immediately of any necessary repairs or maintenance required on the premises to prevent further damage;' },
  { id: 'notices', text: 'That all communications and notices between the LESSOR and LESSEE under this contract shall be made in writing and delivered personally or through electronic means acknowledged by both parties;' },
  { id: 'violations', text: 'That any violation of the terms and conditions of this agreement shall constitute grounds for termination by the LESSOR, without prejudice to the LESSOR’s right to recover damages, and the LESSEE shall vacate the premises immediately upon receipt of written notice of termination. In the event of early termination of the lease, whether due to violation of this agreement or by the voluntary decision of the LESSEE, the security deposit shall be automatically forfeited in favor of the LESSOR, without prejudice to claims for any unpaid obligations or damages;' },
  { id: 'warranty', text: 'That the LESSEE hereby warrants that he/she has read and understood all the foregoing provisions of this contract and shall abide by the same, otherwise, any violation will subject the LESSEE to ejectment and other legal sanctions.' },
  { id: 'closing', text: 'IN WITNESS WHEREOF, the parties have hereunto set their hands this {{signing_date}} at {{signing_city}}, Philippines.' },
];

/** The notary's page, printed only for contracts signed to be notarized; the blanks are the notary's to fill. */
export const NOTARY_ACKNOWLEDGMENT: Clause[] = [
  { id: 'notary-venue', text: 'REPUBLIC OF THE PHILIPPINES) {{signing_city}} ) S.S.' },
  { id: 'notary-title', text: 'ACKNOWLEDGEMENT' },
  { id: 'notary-body', text: `BEFORE ME, a Notary Public for and in {{signing_city}}, this ${BLANK} day of ${BLANK}, ${BLANK}, personally came and appeared ${BLANK}, showing a competent proof of his identification: ${BLANK} VALID UNTIL ${BLANK} known to me and to me known to be the same person who executed the forgoing instrument and acknowledged that the same is his free and voluntary act and deed.` },
  { id: 'notary-seal', text: 'WITNESS MY HAND AND SEAL.' },
  { id: 'notary-register', text: `Doc. No. ${BLANK}; Page No. ${BLANK}; Book No. ${BLANK}; Series of ${BLANK}` },
];

const LESSEE = new Set(['lessee_name', 'lessee_address']);

/** Resolves `{{field}}` placeholders (a missing or empty value prints a blank line) and numbers the clauses.
 * `keepLessee`: leaves `{{lessee_name}}` and `{{lessee_address}}` for `resolveLessee` at signing (stored contract texts). */
export function renderClauses(clauses: Clause[], values: ContractValues, options: { keepLessee?: boolean } = {}): string[] {
  let n = 0;
  return clauses.map(({ id, text }) => {
    const filled = text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => options.keepLessee && LESSEE.has(key) ? match
      : (Object.hasOwn(values, key) ? values[key as ContractField]?.trim() : '') || BLANK);
    return UNNUMBERED.has(id) ? filled : `${++n}. ${filled}`;
  });
}

/** Fills the tenant's name and address into a stored text, exactly like the database's `rental_resolve_lessee`:
 * plain replacement in every line, the value trimmed of spaces (like `btrim`), an empty one printed as a blank. Already-resolved
 * texts are unchanged. Throws on a value that could inject text (neither placeholder can then appear in a value, so the two
 * replacements in a row are safe). */
export function resolveLessee(body: string[], name: string, address: string): string[] {
  if (unsafeLessee(name) || unsafeLessee(address)) throw new Error(UNSAFE_LESSEE_MESSAGE);
  const n = name.replace(/^ +| +$/g, '') || BLANK;
  const a = address.replace(/^ +| +$/g, '') || BLANK;
  return body.map((line) => line.split('{{lessee_name}}').join(n).split('{{lessee_address}}').join(a));
}

const longDate = (date: string) => format(parseISO(date), 'MMMM d, yyyy');
const words = (centavos: number) => pesosInWords(centavos).toUpperCase();

export function contractValues(input: {
  property: Pick<RentalProperty, 'address' | 'lessorName' | 'lessorCivilStatus' | 'lessorAddress' | 'lessorCapacity' | 'signingCity'>;
  renter?: Pick<Renter, 'fullName' | 'address'>;
  contract: Pick<RentalContract, 'startDate' | 'endDate' | 'monthlyRentCentavos' | 'dueDay' | 'advanceMonths' | 'depositCentavos'>;
  /** YYYY-MM-DD; left blank to be filled by hand when not given. */
  signingDate?: string;
}): Required<ContractValues> {
  const { property: p, renter, contract: c, signingDate } = input;
  const advance = c.monthlyRentCentavos * c.advanceMonths;
  return {
    lessor_name: p.lessorName, lessor_civil_status: p.lessorCivilStatus, lessor_address: p.lessorAddress,
    lessor_capacity: p.lessorCapacity === 'owner' ? 'the owner' : 'the representative of the owner and the authorized representative',
    lessee_name: renter?.fullName ?? '', lessee_address: renter?.address ?? '', property_address: p.address,
    term_start: longDate(c.startDate), term_end: longDate(c.endDate),
    monthly_rent: formatPesos(c.monthlyRentCentavos), monthly_rent_words: words(c.monthlyRentCentavos),
    due_day_ordinal: ordinal(c.dueDay),
    advance: formatPesos(advance), advance_words: words(advance),
    deposit: formatPesos(c.depositCentavos), deposit_words: words(c.depositCentavos),
    signing_city: p.signingCity,
    signing_date: signingDate ? `${ordinal(parseISO(signingDate).getDate())} day of ${format(parseISO(signingDate), 'MMMM, yyyy')}` : '',
  };
}

/** Exactly what `rental_link_sign` hashes: the body lines joined with "\n", then "\nSPECIAL:" and the special terms. */
export function canonicalText(body: string[], specialTerms: string): string {
  return `${body.join('\n')}\nSPECIAL:${specialTerms}`;
}

/** Lowercase hex SHA-256 of the UTF-8 text. */
export async function sha256Hex(text: string): Promise<string> {
  const subtle = (globalThis as { crypto?: { subtle?: { digest(algorithm: string, data: Uint8Array): Promise<ArrayBuffer> } } })
    .crypto?.subtle;
  if (!subtle) throw new Error('This device can’t check the contract (secure hashing is not available)');
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

export function contractStatusLabel(status: ContractStatus, signMode: SignMode | null): string {
  switch (status) {
    case 'draft': return 'Draft, not sent yet';
    case 'sent': return 'Waiting for the tenant to sign';
    case 'signed': return 'Signed by the tenant, waiting for your signature';
    case 'countersigned': return signMode === 'notarize' ? 'Signed by both, to be notarized' : 'Signed by both';
  }
}

/** Where a tenancy's written contract stands: none, draft, sent (tenant to sign), signed (you to countersign), done or not_needed. */
export type ContractStage = 'none' | 'draft' | 'sent' | 'signed' | 'done' | 'not_needed';
const STAGE: Record<ContractStatus, ContractStage> = { draft: 'draft', sent: 'sent', signed: 'signed', countersigned: 'done' };
const RANK: ContractStatus[] = ['draft', 'sent', 'signed', 'countersigned'];

/**
 * The active contract's text decides; without one (e.g. a rent change renewed the contract), the furthest-along text of the
 * tenancy's earlier contracts does. A dismissed tenancy is not_needed until a text is sent.
 */
export function contractStage(tenancy: Pick<RentalTenancy, 'contracts' | 'contractNotNeeded'>,
  texts: Pick<ContractText, 'contractId' | 'status'>[]): ContractStage {
  const active = tenancy.contracts.find((c) => c.status === 'active');
  const mine = texts.filter((t) => tenancy.contracts.some((c) => c.id === t.contractId));
  const text = mine.find((t) => t.contractId === active?.id)
    ?? [...mine].sort((a, b) => RANK.indexOf(b.status) - RANK.indexOf(a.status))[0];
  const stage = text ? STAGE[text.status] : 'none';
  return tenancy.contractNotNeeded && (stage === 'none' || stage === 'draft') ? 'not_needed' : stage;
}

/** The ready-to-paste Messenger message for a tenant's private link. */
export function linkMessage(url: string, tenantName: string, kind: LinkKind): string {
  const first = tenantName.trim().split(/\s+/)[0];
  const hello = first ? `Hi ${first}!` : 'Hi!';
  const ask = kind === 'new'
    ? 'Please fill in your details here, then read and sign your lease contract:'
    : 'Your lease contract is ready. Please read and sign it here:';
  return `${hello} ${ask}\n${url}\nYou can also see your bills there. This link is just for you, so please don’t share it.`;
}
