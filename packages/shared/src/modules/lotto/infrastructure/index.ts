import { z } from 'zod';
import { getSupabase } from '../../../config/index.js';
import { LOTTO_GAMES, latestDraws, lottoNumbersSchema } from '../domain/index.js';
import type { LottoDraw, LottoGame, LottoNumbers, LottoNumbersInput } from '../domain/index.js';

const game = z.enum(LOTTO_GAMES);
const drawRow = z.object({
  id: z.string(), game, draw_date: z.string(), numbers: z.array(z.number()), jackpot: z.coerce.number(), winners: z.number(),
}).transform((row): LottoDraw => ({
  id: row.id, game: row.game, drawDate: row.draw_date, numbers: row.numbers, jackpot: row.jackpot, winners: row.winners,
}));
const setRow = z.object({
  id: z.string(), game, label: z.string(), numbers: z.array(z.number()), active: z.boolean(), starts_on: z.string(),
}).transform((row): LottoNumbers => ({
  id: row.id, game: row.game, label: row.label, numbers: row.numbers, active: row.active, startsOn: row.starts_on,
}));

export interface LottoDrawFilter {
  game?: LottoGame;
  /** YYYY-MM-DD, inclusive. */
  from?: string;
  to?: string;
  /** Only draws on or before this day, for loading the next page. */
  through?: string;
}

export class LottoRepository {
  /** Newest first. Page with `through`, passing the last draw date you have (that day's draws repeat; de-duplicate by id). */
  async draws(filter: LottoDrawFilter = {}, limit = 30): Promise<LottoDraw[]> {
    let query = getSupabase().from('lotto_draws').select('*').order('draw_date', { ascending: false }).order('game').limit(limit);
    if (filter.game) query = query.eq('game', filter.game);
    if (filter.from) query = query.gte('draw_date', filter.from);
    if (filter.to) query = query.lte('draw_date', filter.to);
    if (filter.through) query = query.lte('draw_date', filter.through);
    const { data, error } = await query;
    if (error) throw error;
    return z.array(drawRow).parse(data);
  }

  /** The newest draw of each game. */
  async latest(): Promise<LottoDraw[]> {
    // 5 games draw 3 times a week each, so the newest 40 rows always include every game's latest.
    return latestDraws(await this.draws({}, 40));
  }

  async numbers(userId: string): Promise<LottoNumbers[]> {
    const { data, error } = await getSupabase().from('lotto_numbers').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return z.array(setRow).parse(data);
  }

  async saveNumbers(userId: string, id: string | null, input: LottoNumbersInput): Promise<LottoNumbers> {
    const value = lottoNumbersSchema.parse(input);
    const row = { game: value.game, label: value.label, numbers: value.numbers };
    const query = id
      ? getSupabase().from('lotto_numbers').update(row).eq('id', id).eq('user_id', userId)
      : getSupabase().from('lotto_numbers').insert({ ...row, user_id: userId });
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    return setRow.parse(data);
  }

  async setActive(userId: string, id: string, active: boolean): Promise<void> {
    const { error } = await getSupabase().from('lotto_numbers').update({ active }).eq('id', id).eq('user_id', userId).select('id').single();
    if (error) throw error;
  }

  async removeNumbers(userId: string, id: string): Promise<void> {
    const { error } = await getSupabase().from('lotto_numbers').delete().eq('id', id).eq('user_id', userId).select('id').single();
    if (error) throw error;
  }
}
