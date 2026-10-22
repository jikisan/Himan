import { z } from 'zod';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

export const RECEIPT_MAX_TAGS = 10;
export const RECEIPT_TAG_MAX_LENGTH = 30;
export const RECEIPT_PHOTO_LIMIT = 5 * 1024 * 1024;
/** Photos are resized to fit this box and saved as JPEG before upload. */
export const RECEIPT_PHOTO_MAX_EDGE = 1600;
/** A warranty or expiry this close (in days, inclusive) counts as "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

/** Lower-cases, trims, collapses spaces, drops blanks and duplicates, and caps count and length. */
export function normalizeTags(raw: readonly string[] | string): string[] {
  const parts = typeof raw === 'string' ? raw.split(/[,\n]/) : raw;
  const seen = new Set<string>();
  for (const part of parts) {
    const tag = part.replace(/\s+/g, ' ').trim().toLocaleLowerCase().slice(0, RECEIPT_TAG_MAX_LENGTH).trim();
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, RECEIPT_MAX_TAGS);
}

export const receiptSchema = z.object({
  merchant: z.string().trim().min(1, 'Enter the store name').max(120),
  amount: z.number('Enter the amount').finite().min(0, 'Amount cannot be negative').max(9_999_999_999.99),
  purchasedOn: z.iso.date('Choose the purchase date'),
  note: z.string().trim().max(2000),
  tags: z.array(z.string()).transform(normalizeTags),
  warrantyEndsOn: z.iso.date().nullable(),
  expiresOn: z.iso.date().nullable(),
}).refine((v) => !v.warrantyEndsOn || v.warrantyEndsOn >= v.purchasedOn, {
  message: 'Warranty must end on or after the purchase date', path: ['warrantyEndsOn'],
});

export type ReceiptInput = z.input<typeof receiptSchema>;
export type ReceiptValue = z.output<typeof receiptSchema>;

export interface Receipt extends ReceiptValue {
  id: string;
  userId: string;
  photoPath: string;
  createdAt: string;
  updatedAt: string;
}

export type DateStatusKind = 'none' | 'expired' | 'today' | 'soon' | 'ok';
export interface DateStatus { kind: DateStatusKind; days: number }

export const todayISO = (now = new Date()) => format(now, 'yyyy-MM-dd');

/** How far an end date is from `today` (yyyy-MM-dd). Negative days = already past. */
export function dateStatus(endsOn: string | null, today: string): DateStatus {
  if (!endsOn) return { kind: 'none', days: 0 };
  const days = differenceInCalendarDays(parseISO(endsOn), parseISO(today));
  if (days < 0) return { kind: 'expired', days };
  if (days === 0) return { kind: 'today', days };
  return { kind: days <= EXPIRING_SOON_DAYS ? 'soon' : 'ok', days };
}

export interface ReceiptAttention { what: 'Warranty' | 'Expiry'; status: DateStatus }

/** The date a person most needs to see: the nearest one that has not passed, else the latest that has. */
export function receiptAttention(r: Pick<Receipt, 'warrantyEndsOn' | 'expiresOn'>, today: string): ReceiptAttention | null {
  const all = ([['Warranty', r.warrantyEndsOn], ['Expiry', r.expiresOn]] as const)
    .map(([what, date]) => ({ what, status: dateStatus(date, today) }))
    .filter((a) => a.status.kind !== 'none');
  const upcoming = all.filter((a) => a.status.days >= 0).sort((a, b) => a.status.days - b.status.days);
  if (upcoming.length) return upcoming[0];
  return all.sort((a, b) => b.status.days - a.status.days)[0] ?? null;
}

export function statusLabel({ what, status }: ReceiptAttention): string {
  switch (status.kind) {
    case 'expired': return `${what} ended ${-status.days} ${-status.days === 1 ? 'day' : 'days'} ago`;
    case 'today': return `${what} ends today`;
    default: return `${what} ends in ${status.days} ${status.days === 1 ? 'day' : 'days'}`;
  }
}

export const isExpiringSoon = (r: Pick<Receipt, 'warrantyEndsOn' | 'expiresOn'>, today: string) =>
  [r.warrantyEndsOn, r.expiresOn].some((d) => { const k = dateStatus(d, today).kind; return k === 'soon' || k === 'today'; });

/** Soonest-ending first; used by the "Expiring soon" view. */
export function expiringSoon<T extends Pick<Receipt, 'warrantyEndsOn' | 'expiresOn'>>(receipts: T[], today: string): T[] {
  const days = (r: T) => receiptAttention(r, today)?.status.days ?? Infinity;
  return receipts.filter((r) => isExpiringSoon(r, today)).sort((a, b) => days(a) - days(b));
}

export function filterReceipts<T extends Pick<Receipt, 'merchant' | 'note' | 'tags'>>(receipts: T[], search: string, tag: string | null): T[] {
  const needle = search.trim().toLocaleLowerCase();
  return receipts.filter((r) => (!tag || r.tags.includes(tag))
    && (!needle || [r.merchant, r.note, ...r.tags].some((t) => t.toLocaleLowerCase().includes(needle))));
}

/** Every tag in use with how many receipts carry it, most used first. */
export function tagCounts(receipts: Pick<Receipt, 'tags'>[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of receipts) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function validateReceiptPhoto(size: number): void {
  if (!Number.isInteger(size) || size <= 0 || size > RECEIPT_PHOTO_LIMIT) throw new Error('Choose a photo up to 5 MB');
}

/** Scale (w, h) down to fit the max edge; never up. */
export function fitPhoto(width: number, height: number, maxEdge = RECEIPT_PHOTO_MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
