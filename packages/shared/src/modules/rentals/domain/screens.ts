// Pure helpers the rentals screens share on web and mobile: words for money and bill states, the month's to-do, contract text,
// the details form's fields and Messenger links.
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { billTotal, contractFor, dueOn, formatBillPesos, pendingBill } from './billing.js';
import { billBalance, billPaid, billState } from './payments.js';
import { centavosToInput, parsePesos } from './money.js';
import { tenancyChargeSchema } from './schemas.js';
import type { TenancyCharge } from './schemas.js';
import { linkMessage, resolveLessee } from './contracts.js';
import type { ContractStage, ContractText, LinkKind, SignMode, TenancyLink } from './contracts.js';
import type { MeterReading, RentalBill, RentalProperty, RentalTenancy, RentalUnit, Renter, UtilityBill } from './types.js';
import type { RentalPayment } from './payments.js';
import type { Pending } from './billing.js';

export type MoneyTone = 'due' | 'late' | 'paid' | 'cancelled';

/** What a bill row says, in words: how much is left to pay and whether it is late. */
export function billMoney(bill: RentalBill, payments: RentalPayment[], today: string): { tone: MoneyTone; headline: string; detail: string } {
  const total = formatBillPesos(billTotal(bill.lines));
  const state = billState(bill, payments, today);
  if (state === 'void') return { tone: 'cancelled', headline: 'Cancelled', detail: total };
  if (state === 'paid') return { tone: 'paid', headline: 'Paid in full', detail: total };
  const paid = billPaid(bill.id, payments);
  const left = formatBillPesos(billBalance(bill, payments));
  const late = differenceInCalendarDays(parseISO(today), parseISO(bill.dueOn));
  const when = state === 'overdue' ? `${late} day${late === 1 ? '' : 's'} late` : `Due ${format(parseISO(bill.dueOn), 'MMM d')}`;
  return {
    tone: state === 'overdue' ? 'late' : 'due',
    headline: paid > 0 ? `${left} left to pay` : `${left} to pay`,
    detail: paid > 0 ? `${formatBillPesos(paid)} paid of ${total}. ${when}` : when,
  };
}

type Ctx = { property: RentalProperty; tenancies: RentalTenancy[]; readings: MeterReading[]; bills: RentalBill[]; utilityBills?: UtilityBill[] };

export interface MonthRow { t: RentalTenancy; pending: Pending; others: RentalBill[]; skip: boolean; due: string }

/** Every tenant who has (or will have) a bill this month, earliest due first. `skipped` holds `${tenancyId}:${period}` keys. */
export function monthRows(ctx: Ctx,
  period: string, skipped: Set<string> = new Set()): MonthRow[] {
  const room = (t: RentalTenancy) => ctx.property.units.find((u) => u.id === t.unitId)?.name ?? '';
  return ctx.tenancies.map((t) => {
    const skip = skipped.has(`${t.id}:${period}`);
    const pending = pendingBill(ctx, t.id, period, { skipUtilities: skip });
    const others = ctx.bills.filter((b) => b.tenancyId === t.id && b.period === period && !(b.kind === 'monthly' && b.status === 'issued'));
    const due = dueOn(period, contractFor(t, dueOn(period, 31))?.dueDay ?? 31);
    return { t, pending, others, skip, due };
  }).filter((r) => r.pending.state !== 'none' || r.others.length)
    .sort((a, b) => a.due.localeCompare(b.due) || room(a.t).localeCompare(room(b.t)));
}

/** What is left to do for a month: meters to read, bill amounts to type, SOAs to generate, and overdue (unpaid past due) bills. */
export function monthTodo(rows: MonthRow[], bills: RentalBill[], today: string, units: RentalUnit[] = [], payments: RentalPayment[] = []) {
  const waiting = rows.filter((r) => r.pending.state === 'needs-reading');
  const ready = rows.filter((r) => r.pending.state === 'ready');
  const keys = waiting.flatMap(({ t, pending }) => pending.state === 'needs-reading' ? pending.kinds.map((k) => ({ unitId: t.unitId, kind: k })) : []);
  const byAmount = ({ unitId, kind }: { unitId: string; kind: 'electric' | 'water' }) => {
    const unit = units.find((u) => u.id === unitId);
    return (kind === 'electric' ? unit?.electricMode : unit?.waterMode) === 'monthly';
  };
  return {
    waiting, ready,
    /** `${unitId}:${kind}` of sub-meters a waiting SOA needs read. */
    meters: new Set(keys.filter((k) => !byAmount(k)).map((k) => `${k.unitId}:${k.kind}`)),
    /** `${unitId}:${kind}` of utilities whose month's bill amount a waiting SOA needs. */
    amounts: new Set(keys.filter(byAmount).map((k) => `${k.unitId}:${k.kind}`)),
    readyTotal: ready.reduce((sum, r) => sum + (r.pending.state === 'ready' ? billTotal(r.pending.lines) : 0), 0),
    overdue: bills.filter((b) => billState(b, payments, today) === 'overdue').sort((a, b) => a.dueOn.localeCompare(b.dueOn)),
  };
}

/**
 * The latest cancelled SOA for each one that nothing replaces and that won't come back on their own: move-in and final SOAs, and monthly
 * ones whose month no longer gets a monthly SOA (e.g. the tenant moved out before the due date).
 */
export function unreplacedCancelled(ctx: Ctx): RentalBill[] {
  // One missing SOA per tenant, kind and (for monthly) month, however often it was cancelled: keep the latest copy.
  const slot = (b: RentalBill) => `${b.tenancyId}:${b.kind}:${b.kind === 'monthly' ? b.period : ''}`;
  const latest = new Map<string, RentalBill>();
  for (const b of ctx.bills) {
    if (b.status !== 'void') continue;
    const seen = latest.get(slot(b));
    if (!seen || b.issuedOn > seen.issuedOn || (b.issuedOn === seen.issuedOn && b.number > seen.number)) latest.set(slot(b), b);
  }
  return [...latest.values()].filter((b) =>
    !ctx.bills.some((x) => x.status === 'issued' && slot(x) === slot(b))
    && (b.kind !== 'monthly' || pendingBill(ctx, b.tenancyId, b.period).state === 'none'))
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
}

/** Shown before editing or cancelling a bill that has payments. */
export const paidChangeWarning = (paidCentavos: number) =>
  `${formatBillPesos(paidCentavos)} was already paid on this bill. If it goes down, the extra goes back to the tenant’s credit.`;


export type ChargeRow = { label: string; amount: string };

export const toChargeRows = (charges: TenancyCharge[]): ChargeRow[] => charges.map((c) => ({ label: c.label, amount: centavosToInput(c.amount) }));

/** Typed rows → charges; blank rows are dropped, half-filled ones throw a readable error. */
export function parseCharges(rows: ChargeRow[]): TenancyCharge[] {
  return rows.filter((r) => r.label.trim() || r.amount.trim()).map((r) => {
    if (!r.label.trim() || !r.amount.trim()) throw new Error('Enter a name and amount for each charge');
    const parsed = tenancyChargeSchema.safeParse({ label: r.label, amount: parsePesos(r.amount) });
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    return parsed.data;
  });
}

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
  /** The tenant signed on the owner's device: printed "Signed in person" instead of "Signed online". */
  signedInPerson?: boolean;
}

/** `resolveLessee` for display: a value it refuses (line breaks, braces) leaves the placeholders showing instead of crashing the page;
 * signing with such a value is refused with the reason. */
export function previewLessee(body: string[], name: string, address: string): string[] {
  try { return resolveLessee(body, name, address); } catch { return body; }
}

/** An unsigned text shows the renter's current name and address in its lessee placeholders; a signed one is already resolved. */
export function contractPdfData(text: ContractText,
  property: Pick<RentalProperty, 'lessorName' | 'lessorAddress' | 'address' | 'signingCity'>,
  renter: Pick<Renter, 'fullName' | 'address'> = { fullName: '', address: '' }): ContractPdfData {
  return { lessorName: property.lessorName, lessorAddress: property.lessorAddress || property.address, signingCity: property.signingCity,
    lines: contractLines(previewLessee(text.body, renter.fullName, renter.address), text.specialTerms), signMode: text.signMode,
    tenantName: text.tenantName || renter.fullName, tenantSignature: text.tenantSignature, tenantSignedAt: text.tenantSignedAt,
    lessorSignature: text.lessorSignature, lessorSignedAt: text.lessorSignedAt, contentHash: text.contentHash, signedInPerson: text.signedInPerson };
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

/** The ready-to-send message for a link token; the page lives at `${origin}/r/:token`. */
export const tenantLinkMessage = (origin: string, token: string, tenantName: string, kind: LinkKind) =>
  linkMessage(`${origin}/r/${token}`, tenantName, kind);

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

/** The details form fields: key, label, autocomplete, input type. Shared with in-person signing. */
export const TEXT_FIELDS = [
  ['fullName', 'Full name', 'name', 'text'], ['phone', 'Mobile number', 'tel', 'tel'], ['address', 'Home address', 'street-address', 'text'],
  ['emergencyName', 'Emergency contact name', 'off', 'text'], ['emergencyPhone', 'Emergency contact number', 'off', 'tel'],
] as const;
// TODO owner: legal review of this wording (Data Privacy Act 2012)
export const PRIVACY_CONSENT = 'I agree that my landlord stores these details to manage my rental.';
export const OPTIONAL_FIELDS = [['facebook', 'Facebook or Messenger name', 'off', 'text'], ['email', 'Email', 'email', 'email']] as const;
/** How the details form is grouped on screen: about the tenant, then who to call. */
export const ABOUT_FIELDS = TEXT_FIELDS.slice(0, 3);
export const EMERGENCY_FIELDS = TEXT_FIELDS.slice(3);

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  const message = (error as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : 'Something went wrong. Retry when connected.';
}

/**
 * A link for whatever was typed in "Facebook / Messenger": a profile or m.me link is used as is,
 * a username opens a Messenger chat, and a plain name becomes a Facebook search. Only http(s) links come out.
 */
export function messengerUrl(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const withScheme = /^https?:\/\//i.test(text) ? text
    : /^(www\.|m\.)?(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)\//i.test(text) ? `https://${text}` : null;
  if (withScheme) {
    try {
      const url = new URL(withScheme);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch { return null; }
  }
  const username = text.replace(/^@/, '');
  if (/^[a-z0-9.]{5,50}$/i.test(username)) return `https://m.me/${username}`;
  return `https://www.facebook.com/search/top?q=${encodeURIComponent(text)}`;
}

/** Short text to show for the saved value: a username where there is one, otherwise what kind of link it is. */
export function messengerLabel(value: string): string {
  const url = messengerUrl(value);
  const text = value.trim();
  if (!url || !/^(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)\//i.test(text)) return text;
  const { hostname, pathname, searchParams } = new URL(url);
  const parts = pathname.split('/').filter(Boolean);
  const isChat = /(^|\.)(messenger\.com|m\.me)$/i.test(hostname);
  // m.me/<name> and messenger.com/t/<name>; facebook.com/<name> (not profile.php?id=…).
  const name = isChat ? (hostname.endsWith('m.me') ? parts[0] : parts[parts.indexOf('t') + 1]) : (parts[0] !== 'profile.php' && !searchParams.has('id') ? parts[0] : undefined);
  if (name && /^[a-z][a-z0-9.]{3,49}$/i.test(name)) return `@${name}`;
  return isChat ? 'Messenger chat' : 'Facebook profile';
}
