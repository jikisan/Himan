import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { formatBillPesos, manilaToday, monthFigures, periodLabel, periodOf } from '@himan/shared/rentals';
import type { OverviewCtx, RentalSettlement } from '@himan/shared/rentals';
import { MonthBar } from './MonthBar';
import { cn } from '@core/presentation/utils';

const C = 2 * Math.PI * 30;

function Ring({ value, label, detail, color, center }: { value: number | null; label: string; detail: string; color: string; center: string }) {
  const filled = value === null ? 0 : Math.max(0, Math.min(1, value)) * C;
  return <div className="flex flex-col items-center gap-2 text-center">
    <span className="relative flex size-24 items-center justify-center">
      <svg viewBox="0 0 76 76" className="absolute inset-0 -rotate-90" role="img" aria-label={`${label}: ${center}, ${detail}`}>
        <circle cx="38" cy="38" r="30" fill="none" strokeWidth="7" className="stroke-muted" />
        {filled > 0 && <circle cx="38" cy="38" r="30" fill="none" strokeWidth="7" strokeLinecap="round" className={color}
          strokeDasharray={`${filled} ${C}`} />}
      </svg>
      <span aria-hidden className="text-xl font-bold tabular-nums">{center}</span>
    </span>
    <span aria-hidden className="text-sm font-medium">{label}</span>
    <span aria-hidden className="text-xs text-muted-foreground">{detail}</span>
  </div>;
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** A month in numbers: three rings, money tiles and six months of billed against collected. */
export function AnalyticsView({ ctx, settlements }: { ctx: OverviewCtx; settlements: RentalSettlement[] }) {
  const today = manilaToday();
  const [period, setPeriod] = useState(periodOf(today));
  const f = monthFigures(ctx, period, settlements);
  const month = periodLabel(period).split(' ')[0];
  const top = Math.max(1, ...f.trend.flatMap((m) => [m.billedCentavos, m.collectedCentavos]));
  const earliest = ctx.tenancies.map((t) => periodOf(t.moveIn)).sort()[0] ?? periodOf(today);
  const money: { label: string; value: string; tone?: string; extra?: string }[] = [
    { label: 'Monthly rent', value: formatBillPesos(f.rentCentavos) },
    { label: 'Unpaid', value: formatBillPesos(f.unpaidCentavos), tone: f.unpaidCentavos > 0 ? 'text-destructive' : '' },
    { label: 'Deposits held', value: formatBillPesos(f.depositsCentavos),
      extra: f.depositsPendingCentavos > 0 ? `${formatBillPesos(f.depositsPendingCentavos)} pending` : undefined },
  ];
  return <div className="space-y-5">
    <MonthBar period={period} onChange={setPeriod} min={earliest} max={periodOf(today)} />
    <div className="flex flex-wrap gap-5">
      <section aria-label={`${periodLabel(period)} in rings`} className="grid min-w-0 flex-[3_1_420px] grid-cols-3 gap-3 rounded-2xl border bg-card px-4 py-6 shadow-sm">
        <Ring label="Collected" value={f.billedCentavos ? f.collectedCentavos / f.billedCentavos : null} color="stroke-red-400"
          center={f.billedCentavos ? `${pct(f.collectedCentavos, f.billedCentavos)}%` : '—'}
          detail={`${formatBillPesos(f.collectedCentavos)} of ${formatBillPesos(f.billedCentavos)}`} />
        <Ring label={`${month} SOAs`} value={f.soasToBill ? f.soasIssued / f.soasToBill : null} color="stroke-indigo-400"
          center={`${f.soasIssued}/${f.soasToBill}`}
          detail={!f.soasToBill ? 'None this month' : f.soasIssued >= f.soasToBill ? 'All generated' : `${f.soasToBill - f.soasIssued} to generate`} />
        <Ring label="Occupancy" value={f.beds ? f.bedsTaken / f.beds : null} color="stroke-sky-400"
          center={`${pct(f.bedsTaken, f.beds)}%`} detail={`${f.bedsTaken} of ${f.beds} beds`} />
      </section>
      <dl className="flex min-w-0 flex-[1_1_220px] flex-col gap-3">
        {money.map((m) => <div key={m.label} className="flex flex-1 items-center justify-between gap-3 rounded-2xl border bg-card px-5 py-4 shadow-sm">
          <dt className="text-sm text-muted-foreground">{m.label}</dt>
          <dd className={cn('text-right text-lg font-bold tabular-nums', m.tone)}>{m.value}
            {m.extra && <span className="block text-xs font-medium text-muted-foreground">{m.extra}</span>}</dd>
        </div>)}
      </dl>
    </div>
    <section aria-labelledby="rentals-trend" className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="rentals-trend" className="font-semibold">Billed vs collected · last 6 months</h2>
        <span className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-indigo-500" />Billed</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm bg-emerald-400" />Collected</span>
        </span>
      </div>
      <ul className="flex h-44 items-end gap-2 border-b pb-0">
        {f.trend.map((m) => <li key={m.period} className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          aria-label={`${periodLabel(m.period)}: ${formatBillPesos(m.billedCentavos)} billed, ${formatBillPesos(m.collectedCentavos)} collected`}>
          <span aria-hidden className="flex h-full w-full items-end justify-center gap-1">
            <span className="w-full max-w-7 rounded-t bg-indigo-500" style={{ height: `${(m.billedCentavos / top) * 100}%` }} />
            <span className="w-full max-w-7 rounded-t bg-emerald-400" style={{ height: `${(m.collectedCentavos / top) * 100}%` }} />
          </span>
        </li>)}
      </ul>
      <div aria-hidden className="flex gap-2">
        {f.trend.map((m) => <span key={m.period} className={cn('flex-1 text-center text-xs text-muted-foreground', m.period === period && 'font-semibold text-foreground')}>
          {format(parseISO(`${m.period}-01`), 'MMM')}</span>)}
      </div>
    </section>
  </div>;
}
