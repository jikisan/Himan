import { describe, expect, it } from 'vitest';
import { breakdown, filterTransactions, formatPesos, monthLabel, monthRange, parsePesos, shiftMonth, summarize,
  transactionSchema } from '@himan/shared/finances';
import type { FinanceCategory, FinanceTransaction } from '@himan/shared/finances';

const food: FinanceCategory = { id: 'food', kind: 'expense', name: 'Food', color: '#f97316' };
const bills: FinanceCategory = { id: 'bills', kind: 'expense', name: 'Bills', color: '#eab308' };
const t = (id: string, kind: 'income' | 'expense', amountCentavos: number, categoryId: string | null, note = ''): FinanceTransaction =>
  ({ id, kind, amountCentavos, occurredOn: '2026-10-02', note, categoryId });

describe('money', () => {
  it('parses pesos into centavos without float error', () => {
    expect(parsePesos('₱1,500.50')).toBe(150050);
    expect(parsePesos('0.1')).toBe(10);
    expect(parsePesos('19.99')).toBe(1999);
  });
  it('rejects zero, negatives, junk and absurd amounts', () => {
    for (const bad of ['0', '-5', 'abc', '1.234', '', '99999999999']) expect(() => parsePesos(bad)).toThrow();
  });
  it('formats as PHP', () => expect(formatPesos(150050)).toContain('1,500.50'));
});

describe('months', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
  it('gives a half-open range and a label', () => {
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' });
    expect(monthLabel('2026-10')).toBe('October 2026');
  });
});

describe('totals and grouping', () => {
  const list = [t('1', 'income', 500000, null), t('2', 'expense', 30000, 'food'), t('3', 'expense', 10000, 'food'), t('4', 'expense', 20000, 'bills'), t('5', 'expense', 10000, null)];
  it('sums income, expense and balance', () => {
    expect(summarize(list)).toEqual({ income: 500000, expense: 70000, balance: 430000 });
    expect(summarize([])).toEqual({ income: 0, expense: 0, balance: 0 });
  });
  it('groups expenses by category, largest first, with shares that sum to 1', () => {
    const rows = breakdown(list, [food, bills]);
    expect(rows.map((r) => [r.name, r.total])).toEqual([['Food', 40000], ['Bills', 20000], ['Uncategorized', 10000]]);
    expect(rows.reduce((sum, r) => sum + r.share, 0)).toBeCloseTo(1);
  });
  it('treats a deleted category as uncategorized', () => {
    expect(breakdown([t('1', 'expense', 100, 'gone')], [food])[0].name).toBe('Uncategorized');
  });
  it('searches note and category name', () => {
    const items = [t('1', 'expense', 100, 'food', 'Jollibee'), t('2', 'expense', 100, 'bills', 'Meralco')];
    expect(filterTransactions(items, [food, bills], 'JOLLI').map((x) => x.id)).toEqual(['1']);
    expect(filterTransactions(items, [food, bills], 'bills').map((x) => x.id)).toEqual(['2']);
    expect(filterTransactions(items, [food, bills], ' ')).toHaveLength(2);
  });
});

describe('transactionSchema', () => {
  const ok = { kind: 'expense', amountCentavos: 100, occurredOn: '2026-10-02', note: ' hi ', categoryId: null };
  it('trims notes and rejects impossible dates and zero amounts', () => {
    expect(transactionSchema.parse(ok).note).toBe('hi');
    expect(transactionSchema.safeParse({ ...ok, occurredOn: '2026-02-30' }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...ok, amountCentavos: 0 }).success).toBe(false);
  });
});
