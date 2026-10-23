import { getSupabase } from '../../../config/index.js';
import { z } from 'zod';
import { weightEntrySchema, weightSettingsSchema } from '../domain/index.js';
import type { WeightEntry, WeightEntryInput, WeightSettings } from '../domain/index.js';

const entryRow = z.object({ id: z.string(), entry_date: z.string(), kg: z.coerce.number() })
  .transform((row): WeightEntry => ({ id: row.id, entryDate: row.entry_date, kg: row.kg }));
const settingsRow = z.object({ height_cm: z.coerce.number().nullable(), goal_kg: z.coerce.number().nullable() })
  .transform((row): WeightSettings => ({ heightCm: row.height_cm, goalKg: row.goal_kg }));

export class WeightRepository {
  async findEntries(userId: string): Promise<WeightEntry[]> {
    const entries: WeightEntry[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await getSupabase().from('weight_entries').select('id, entry_date, kg')
        .eq('user_id', userId).order('entry_date').range(offset, offset + 999);
      if (error) throw error;
      const page = z.array(entryRow).parse(data);
      entries.push(...page);
      if (page.length < 1000) return entries;
    }
  }

  async findSettings(userId: string): Promise<WeightSettings> {
    const { data, error } = await getSupabase().from('weight_settings').select('height_cm, goal_kg')
      .eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? settingsRow.parse(data) : { heightCm: null, goalKg: null };
  }

  /** One entry per day: saving a date that already has an entry replaces its weight. */
  async saveEntry(userId: string, input: WeightEntryInput): Promise<WeightEntry> {
    const value = weightEntrySchema.parse(input);
    const { data, error } = await getSupabase().from('weight_entries')
      .upsert({ user_id: userId, entry_date: value.entryDate, kg: value.kg }, { onConflict: 'user_id,entry_date' })
      .select('id, entry_date, kg').single();
    if (error) throw error;
    return entryRow.parse(data);
  }

  async removeEntry(userId: string, id: string): Promise<void> {
    const { error } = await getSupabase().from('weight_entries').delete().eq('id', id).eq('user_id', userId)
      .select('id').single();
    if (error) throw error;
  }

  async saveSettings(userId: string, input: WeightSettings): Promise<WeightSettings> {
    const value = weightSettingsSchema.parse(input);
    const { data, error } = await getSupabase().from('weight_settings')
      .upsert({ user_id: userId, height_cm: value.heightCm, goal_kg: value.goalKg }, { onConflict: 'user_id' })
      .select('height_cm, goal_kg').single();
    if (error) throw error;
    return settingsRow.parse(data);
  }
}
