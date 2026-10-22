import { z } from 'zod';

export type FinanceKind = 'income' | 'expense';

export interface FinanceCategory { id: string; kind: FinanceKind; name: string; color: string }
export interface FinanceTransaction {
  id: string; kind: FinanceKind; amountCentavos: number; occurredOn: string; note: string; categoryId: string | null;
}

export const CATEGORY_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#64748b'] as const;

export const DEFAULT_CATEGORIES: Omit<FinanceCategory, 'id'>[] = [
  { kind: 'expense', name: 'Food', color: CATEGORY_COLORS[1] },
  { kind: 'expense', name: 'Transport', color: CATEGORY_COLORS[5] },
  { kind: 'expense', name: 'Bills', color: CATEGORY_COLORS[2] },
  { kind: 'expense', name: 'Shopping', color: CATEGORY_COLORS[8] },
  { kind: 'expense', name: 'Health', color: CATEGORY_COLORS[3] },
  { kind: 'expense', name: 'Other', color: CATEGORY_COLORS[9] },
  { kind: 'income', name: 'Salary', color: CATEGORY_COLORS[3] },
  { kind: 'income', name: 'Other income', color: CATEGORY_COLORS[4] },
];

// ---- Money (integer centavos, PHP) ----
const MAX_CENTAVOS = 2_000_000_000;

export function parsePesos(input: string): number {
  const cleaned = input.replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error('Enter an amount like 250 or 1,500.50');
  const [whole, fraction = ''] = cleaned.split('.');
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos <= 0) throw new Error('Amount must be more than zero');
  if (centavos > MAX_CENTAVOS) throw new Error('Amount is too large');
  return centavos;
}

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export const formatPesos = (centavos: number): string => peso.format(centavos / 100);
export const centavosToInput = (centavos: number): string => (centavos / 100).toFixed(2);

/** Today's calendar day in Manila as YYYY-MM-DD. */
export const manilaToday = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);

// ---- Months ('YYYY-MM') ----
export const monthOf = (date: string): string => date.slice(0, 7);

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** First day of the month and first day of the next, for a half-open range query. */
export const monthRange = (month: string): { from: string; to: string } =>
  ({ from: `${month}-01`, to: `${shiftMonth(month, 1)}-01` });

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthLabel = (month: string): string => `${MONTH_NAMES[Number(month.slice(5)) - 1]} ${month.slice(0, 4)}`;

// ---- Validation ----
const realDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

export const transactionSchema = z.object({
  kind: z.enum(['income', 'expense']),
  amountCentavos: z.number().int().min(1, 'Amount must be more than zero').max(MAX_CENTAVOS, 'Amount is too large'),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date').refine(realDate, 'Pick a real date'),
  note: z.string().trim().max(200, 'Note is too long'),
  categoryId: z.string().nullable(),
});
export type FinanceTransactionInput = z.infer<typeof transactionSchema>;

export const categorySchema = z.object({
  kind: z.enum(['income', 'expense']),
  name: z.string().trim().min(1, 'Enter a name').max(40, 'Name is too long'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type FinanceCategoryInput = z.infer<typeof categorySchema>;

// ---- Totals and grouping ----
export interface FinanceTotals { income: number; expense: number; balance: number }

export function summarize(transactions: FinanceTransaction[]): FinanceTotals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) t.kind === 'income' ? (income += t.amountCentavos) : (expense += t.amountCentavos);
  return { income, expense, balance: income - expense };
}

export interface BreakdownRow { categoryId: string | null; name: string; color: string; total: number; share: number }

const UNCATEGORIZED = { name: 'Uncategorized', color: '#94a3b8' };

/** Totals per category for one kind, largest first; `share` is a 0..1 fraction of the kind's total. */
export function breakdown(transactions: FinanceTransaction[], categories: FinanceCategory[], kind: FinanceKind = 'expense'): BreakdownRow[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const sums = new Map<string | null, number>();
  let all = 0;
  for (const t of transactions) {
    if (t.kind !== kind) continue;
    const key = t.categoryId && byId.has(t.categoryId) ? t.categoryId : null;
    sums.set(key, (sums.get(key) ?? 0) + t.amountCentavos);
    all += t.amountCentavos;
  }
  return [...sums]
    .map(([categoryId, total]) => ({ categoryId, ...(categoryId ? byId.get(categoryId)! : UNCATEGORIZED), total, share: total / all }))
    .map(({ categoryId, name, color, total, share }) => ({ categoryId, name, color, total, share }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** Whole-percent label that never shows a real share as 0%. */
export const percentLabel = (share: number): string => (share > 0 && share < 0.01 ? '<1%' : `${Math.round(share * 100)}%`);

/** Case-insensitive match on note or category name. */
export function filterTransactions(transactions: FinanceTransaction[], categories: FinanceCategory[], search: string): FinanceTransaction[] {
  const q = search.trim().toLowerCase();
  if (!q) return transactions;
  const names = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));
  return transactions.filter((t) => t.note.toLowerCase().includes(q) || (t.categoryId && names.get(t.categoryId)?.includes(q)));
}
