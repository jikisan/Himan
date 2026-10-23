import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import {
  DEFAULT_CATEGORIES, categorySchema, monthRange, transactionSchema,
} from '../domain/index.js';
import type {
  FinanceCategory, FinanceCategoryInput, FinanceTransaction, FinanceTransactionInput,
} from '../domain/index.js';

const kind = z.enum(['income', 'expense']);
const categoryRow = z.object({ id: z.string(), kind, name: z.string(), color: z.string() });
const transactionRow = z.object({
  id: z.string(), kind, amount_centavos: z.number(), occurred_on: z.string(), note: z.string(), category_id: z.string().nullable(),
}).transform((row): FinanceTransaction => ({
  id: row.id, kind: row.kind, amountCentavos: row.amount_centavos, occurredOn: row.occurred_on, note: row.note, categoryId: row.category_id,
}));

/** Parses user input, throwing the first issue's plain message rather than Zod's JSON dump of every issue. */
function validate<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? 'Check the details and try again');
  return result.data;
}

export class FinanceRepository {
  /** Lists the user's categories, creating the defaults the first time. */
  async categories(userId: string): Promise<FinanceCategory[]> {
    const load = async () => {
      const { data, error } = await getSupabase().from('finance_categories').select('id, kind, name, color')
        .eq('user_id', userId).order('created_at').order('name');
      if (error) throw error;
      return z.array(categoryRow).parse(data);
    };
    const existing = await load();
    if (existing.length) return existing;
    const { error } = await getSupabase().from('finance_categories')
      .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId })));
    // 23505: a concurrent first load already seeded them.
    if (error && error.code !== '23505') throw error;
    return load();
  }

  async saveCategory(userId: string, id: string | null, input: FinanceCategoryInput): Promise<void> {
    const value = validate(categorySchema, input);
    const query = id
      // Kind is fixed once transactions may use the category.
      ? getSupabase().from('finance_categories').update({ name: value.name, color: value.color }).eq('id', id).eq('user_id', userId)
      : getSupabase().from('finance_categories').insert({ ...value, user_id: userId });
    const { error } = await query;
    if (error) throw error.code === '23505' ? new Error('You already have a category with that name') : error;
  }

  async deleteCategory(userId: string, id: string): Promise<void> {
    const { error } = await getSupabase().from('finance_categories').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  /** Transactions dated within `month` ('YYYY-MM'), newest first. */
  async transactions(userId: string, month: string): Promise<FinanceTransaction[]> {
    const { from, to } = monthRange(month);
    const { data, error } = await getSupabase().from('finance_transactions')
      .select('id, kind, amount_centavos, occurred_on, note, category_id').eq('user_id', userId)
      .gte('occurred_on', from).lt('occurred_on', to)
      .order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(2000);
    if (error) throw error;
    return z.array(transactionRow).parse(data);
  }

  async saveTransaction(userId: string, id: string | null, input: FinanceTransactionInput): Promise<void> {
    const v = validate(transactionSchema, input);
    const row = { kind: v.kind, amount_centavos: v.amountCentavos, occurred_on: v.occurredOn, note: v.note, category_id: v.categoryId };
    const query = id
      ? getSupabase().from('finance_transactions').update(row).eq('id', id).eq('user_id', userId)
      : getSupabase().from('finance_transactions').insert({ ...row, user_id: userId });
    const { error } = await query;
    if (error) throw error;
  }

  async deleteTransaction(userId: string, id: string): Promise<void> {
    const { error } = await getSupabase().from('finance_transactions').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }
}
