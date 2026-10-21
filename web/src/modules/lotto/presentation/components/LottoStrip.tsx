import { Link } from 'react-router-dom';
import { ChevronRight, Trophy } from 'lucide-react';
import { drawDateLabel, lottoGameLabel, matchesForDraw } from '@himan/shared/lotto';
import { useLottoLatest, useLottoNumbers } from '../hooks/useLotto';
import { LottoBalls } from './LottoBalls';

/** The latest result of each game, at the top of the dashboard. Shows nothing until there are results. */
export function LottoStrip() {
  const latest = useLottoLatest();
  const { sets } = useLottoNumbers();
  const draws = latest.data ?? [];
  if (draws.length === 0) return null;
  return <section aria-label="Lotto results" className="mx-auto mb-10 max-w-5xl">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold">Lotto results</h2>
      <Link to="/lotto" className="inline-flex items-center gap-1 rounded-md text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        All results<ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
    </div>
    <ul className="flex snap-x gap-3 overflow-x-auto [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible [&::-webkit-scrollbar]:hidden">
      {draws.map((draw) => {
        const best = matchesForDraw(draw, sets)[0];
        return <li key={draw.id} className="w-72 shrink-0 snap-start md:w-auto">
          <Link to="/lotto" className="block h-full space-y-2 rounded-2xl border bg-card p-4 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">{lottoGameLabel(draw.game)}</span>
              <span className="text-sm text-muted-foreground">{drawDateLabel(draw.drawDate)}</span>
            </div>
            <LottoBalls size="sm" numbers={draw.numbers} label={`${lottoGameLabel(draw.game)} winning numbers`} />
            {best?.wins && <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <Trophy aria-hidden="true" className="h-4 w-4" />You matched {best.count}</p>}
          </Link>
        </li>;
      })}
    </ul>
  </section>;
}
