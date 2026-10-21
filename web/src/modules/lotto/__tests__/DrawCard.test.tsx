import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { LottoDraw, LottoNumbers } from '@himan/shared/lotto';
import { DrawCard } from '../presentation/components/DrawCard';

const draw: LottoDraw = { id: 'd', game: '6/45', drawDate: '2026-10-19', numbers: [16, 3, 24, 34, 41, 31], jackpot: 15_000_000, winners: 0 };
const set = (id: string, label: string, numbers: number[]): LottoNumbers => ({ id, game: '6/45', label, numbers, active: true, startsOn: '2026-10-01' });

describe('DrawCard', () => {
  it('shows the result, winners first, and keeps sets that matched 0 to 2 behind a button', () => {
    render(<DrawCard draw={draw} sets={[
      set('1', 'Nothing', [1, 2, 4, 5, 6, 7]), set('2', 'Birthday', [3, 5, 12, 24, 31, 40]), set('3', 'Lucky', [3, 16, 24, 34, 8, 9]),
    ]} />);
    expect(screen.getByText('Mega Lotto 6/45')).toBeInTheDocument();
    expect(screen.getByText(/Jackpot ₱15,000,000\.00 · no winner/)).toBeInTheDocument();
    const winners = screen.getAllByRole('listitem').filter((li) => /wins a prize/.test(li.textContent ?? ''));
    expect(winners.map((li) => li.textContent)).toEqual([expect.stringContaining('Lucky'), expect.stringContaining('Birthday')]);
    expect(screen.getByText(/4 matched · wins a prize/)).toBeInTheDocument();
    expect(screen.queryByText('Nothing')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show other numbers (1)' }));
    expect(screen.getByText('Nothing')).toBeInTheDocument();
    expect(screen.getByText('0 matched')).toBeInTheDocument();
  });

  it('says so when none of your numbers won, and shows nothing about numbers when you keep none', () => {
    const { unmount } = render(<DrawCard draw={draw} sets={[set('1', 'Nothing', [1, 2, 4, 5, 6, 7])]} />);
    expect(screen.getByText('None of your numbers won this draw.')).toBeInTheDocument();
    unmount();
    render(<DrawCard draw={draw} sets={[]} />);
    expect(screen.queryByText('Your numbers')).not.toBeInTheDocument();
  });
});
