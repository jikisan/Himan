import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { LOTTO_PRIZE_MATCHES, lottoGameLabel, matchesForDraw } from '@himan/shared/lotto';
import type { LottoDraw, LottoMatch, LottoNumbers } from '@himan/shared/lotto';
import { Button } from '@/components/ui/button';
import { LottoBalls } from './LottoBalls';

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MatchRow = ({ match }: { match: LottoMatch }) => <li className="space-y-1.5 rounded-xl border bg-muted/30 p-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <span className="font-medium">{match.set.label || 'Untitled numbers'}</span>
    <span className={match.wins ? 'inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400' : 'text-sm text-muted-foreground'}>
      {match.wins && <Trophy aria-hidden="true" className="h-4 w-4" />}{match.count} matched{match.wins ? ' · wins a prize' : ''}
    </span>
  </div>
  <LottoBalls size="sm" label="Your numbers" numbers={match.set.numbers} highlight={match.matched} />
</li>;

/** One draw: its numbers and prize, then how your maintained numbers did, winners first. */
/** The date is left out: the list groups draws under their day. */
export function DrawCard({ draw, sets }: { draw: LottoDraw; sets: LottoNumbers[] }) {
  const [others, setOthers] = useState(false);
  const matches = matchesForDraw(draw, sets);
  const winning = matches.filter((m) => m.count >= LOTTO_PRIZE_MATCHES);
  const rest = matches.filter((m) => m.count < LOTTO_PRIZE_MATCHES);
  return <article className="space-y-3 rounded-2xl border bg-card p-4">
    <h3 className="font-semibold">{lottoGameLabel(draw.game)}</h3>
    <LottoBalls numbers={draw.numbers} label={`${lottoGameLabel(draw.game)} winning numbers`} />
    <p className="text-sm text-muted-foreground">Jackpot {peso(draw.jackpot)} · {draw.winners === 0 ? 'no winner' : `${draw.winners} ${draw.winners === 1 ? 'winner' : 'winners'}`}</p>
    {matches.length > 0 && <section aria-label="Your numbers" className="space-y-2 border-t pt-3">
      <h4 className="text-sm font-medium">Your numbers</h4>
      {winning.length === 0 && <p className="text-sm text-muted-foreground">None of your numbers won this draw.</p>}
      <ul className="space-y-2">{winning.map((m) => <MatchRow key={m.set.id} match={m} />)}</ul>
      {rest.length > 0 && <>
        <Button type="button" variant="ghost" size="sm" className="h-10 px-2" aria-expanded={others} onClick={() => setOthers(!others)}>
          {others ? 'Hide other numbers' : `Show other numbers (${rest.length})`}</Button>
        {others && <ul className="space-y-2">{rest.map((m) => <MatchRow key={m.set.id} match={m} />)}</ul>}
      </>}
    </section>}
  </article>;
}
