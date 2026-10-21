import { describe, expect, it } from 'vitest';
import { latestDraws, lottoNumbersSchema, matchDraw, matchesForDraw } from '@himan/shared/lotto';
import type { LottoDraw, LottoNumbers } from '@himan/shared/lotto';

const draw = (over: Partial<LottoDraw> = {}): LottoDraw => ({
  id: 'd1', game: '6/45', drawDate: '2026-10-19', numbers: [16, 3, 24, 34, 41, 31], jackpot: 15_000_000, winners: 0, ...over,
});
const set = (over: Partial<LottoNumbers> = {}): LottoNumbers => ({
  id: 's1', game: '6/45', label: 'Birthday', numbers: [3, 5, 12, 24, 31, 40], active: true, startsOn: '2026-10-01', ...over,
});

describe('matching', () => {
  it('counts matches whatever the drawn order and says which numbers hit', () => {
    const match = matchDraw(set(), draw());
    expect(match.matched).toEqual([3, 24, 31]);
    expect(match.count).toBe(3);
    expect(match.wins).toBe(true);
  });

  it('does not win below 3 matches', () => {
    expect(matchDraw(set({ numbers: [1, 2, 3, 4, 5, 24] }), draw())).toMatchObject({ count: 2, wins: false });
  });

  it('checks only active sets of the same game saved on or before the draw day, best match first', () => {
    const sets = [
      set({ id: 'low', numbers: [1, 2, 3, 4, 5, 6] }),
      set({ id: 'best', numbers: [16, 3, 24, 34, 41, 45] }),
      set({ id: 'paused', active: false }),
      set({ id: 'other game', game: '6/55' }),
      set({ id: 'later', startsOn: '2026-10-20' }),
      set({ id: 'same day', startsOn: '2026-10-19', numbers: [16, 3, 24, 1, 2, 5] }),
    ];
    expect(matchesForDraw(draw(), sets).map((m) => m.set.id)).toEqual(['best', 'same day', 'low']);
  });
});

describe('latestDraws', () => {
  it('keeps the newest draw of each game, newest day first', () => {
    const draws = [
      draw({ id: 'a', game: '6/45', drawDate: '2026-10-19' }), draw({ id: 'b', game: '6/45', drawDate: '2026-10-21' }),
      draw({ id: 'c', game: '6/58', drawDate: '2026-10-20' }), draw({ id: 'd', game: '6/55', drawDate: '2026-10-21' }),
    ];
    expect(latestDraws(draws).map((d) => d.id)).toEqual(['d', 'b', 'c']);
  });
});

describe('lottoNumbersSchema', () => {
  const input = { game: '6/42' as const, label: ' Lucky ', numbers: [1, 2, 3, 4, 5, 42] };
  it('accepts 6 different numbers in range and trims the name', () => {
    expect(lottoNumbersSchema.parse(input).label).toBe('Lucky');
  });
  it.each([
    ['five numbers', { numbers: [1, 2, 3, 4, 5] }, 'Choose 6 numbers'],
    ['a repeated number', { numbers: [1, 1, 2, 3, 4, 5] }, 'Choose 6 different numbers'],
    ['a number above the game’s highest', { numbers: [1, 2, 3, 4, 5, 43] }, 'Pick numbers from 1 to 42'],
    ['zero', { numbers: [0, 1, 2, 3, 4, 5] }, 'Pick numbers from 1 to 42'],
  ])('refuses %s', (_name, over, message) => {
    const result = lottoNumbersSchema.safeParse({ ...input, ...over });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(message);
  });
});
