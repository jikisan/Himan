import { z } from 'zod';

export const LOTTO_GAMES = ['6/58', '6/55', '6/49', '6/45', '6/42'] as const;
export type LottoGame = (typeof LOTTO_GAMES)[number];

/** PCSO's names, the highest number you can pick, and the days of the week (0 = Sunday) each game is drawn. */
export const LOTTO_GAME_INFO: Record<LottoGame, { name: string; max: number; days: number[]; schedule: string }> = {
  '6/58': { name: 'Ultra Lotto', max: 58, days: [0, 2, 4], schedule: 'Tue, Thu, Sun' },
  '6/55': { name: 'Grand Lotto', max: 55, days: [1, 3, 5], schedule: 'Mon, Wed, Fri' },
  '6/49': { name: 'Super Lotto', max: 49, days: [0, 2, 4], schedule: 'Tue, Thu, Sun' },
  '6/45': { name: 'Mega Lotto', max: 45, days: [1, 3, 5], schedule: 'Mon, Wed, Fri' },
  '6/42': { name: 'Lotto', max: 42, days: [2, 4, 6], schedule: 'Tue, Thu, Sat' },
};
/** Matching this many of the 6 numbers wins a prize in every 6-number game. */
export const LOTTO_PRIZE_MATCHES = 3;
export const LOTTO_NUMBERS_LIMIT = 20;
export const LOTTO_SET_SIZE = 6;

export const isLottoGame = (value: unknown): value is LottoGame => (LOTTO_GAMES as readonly unknown[]).includes(value);

export interface LottoDraw {
  id: string;
  game: LottoGame;
  /** YYYY-MM-DD, Philippine time. */
  drawDate: string;
  /** In the order they were drawn. */
  numbers: number[];
  jackpot: number;
  winners: number;
}

/** A set of 6 numbers the user keeps, checked against every draw of its game from `startsOn`. */
export interface LottoNumbers {
  id: string;
  game: LottoGame;
  label: string;
  /** Sorted. */
  numbers: number[];
  active: boolean;
  startsOn: string;
}

export const lottoNumbersSchema = z.object({
  game: z.enum(LOTTO_GAMES),
  label: z.string().trim().max(60, 'Keep the name to 60 characters'),
  numbers: z.array(z.number().int()).length(LOTTO_SET_SIZE, 'Choose 6 numbers'),
}).superRefine((value, ctx) => {
  const { max } = LOTTO_GAME_INFO[value.game];
  if (new Set(value.numbers).size !== value.numbers.length) ctx.addIssue({ code: 'custom', path: ['numbers'], message: 'Choose 6 different numbers' });
  if (value.numbers.some((n) => n < 1 || n > max)) ctx.addIssue({ code: 'custom', path: ['numbers'], message: `Pick numbers from 1 to ${max}` });
});
export type LottoNumbersInput = z.infer<typeof lottoNumbersSchema>;

export interface LottoMatch { set: LottoNumbers; matched: number[]; count: number; wins: boolean }

/** How a set did against a draw. */
export function matchDraw(set: LottoNumbers, draw: LottoDraw): LottoMatch {
  const drawn = new Set(draw.numbers);
  const matched = set.numbers.filter((n) => drawn.has(n));
  return { set, matched, count: matched.length, wins: matched.length >= LOTTO_PRIZE_MATCHES };
}

/** The user's active sets for the draw's game that were saved on or before the draw day, best match first. */
export function matchesForDraw(draw: LottoDraw, sets: LottoNumbers[]): LottoMatch[] {
  return sets.filter((s) => s.active && s.game === draw.game && draw.drawDate >= s.startsOn).map((s) => matchDraw(s, draw))
    .sort((a, b) => b.count - a.count);
}

/** The newest draw of each game, newest first (ties keep the order of LOTTO_GAMES). */
export function latestDraws(draws: LottoDraw[]): LottoDraw[] {
  const latest = new Map<LottoGame, LottoDraw>();
  for (const draw of draws) {
    const current = latest.get(draw.game);
    if (!current || draw.drawDate > current.drawDate) latest.set(draw.game, draw);
  }
  return [...latest.values()].sort((a, b) => b.drawDate.localeCompare(a.drawDate) || LOTTO_GAMES.indexOf(a.game) - LOTTO_GAMES.indexOf(b.game));
}

/** "Oct 21" style label for a YYYY-MM-DD draw date, without time zone surprises. */
export function drawDateLabel(drawDate: string, withYear = false): string {
  const [y, m, d] = drawDate.split('-').map(Number);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return withYear ? `${month} ${d}, ${y}` : `${month} ${d}`;
}

export const lottoGameLabel = (game: LottoGame) => `${LOTTO_GAME_INFO[game].name} ${game}`;
