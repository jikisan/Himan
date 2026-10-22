import { motion, useReducedMotion } from 'motion/react';
import type { WeightEntry } from '@himan/shared/weight';

const W = 520; const H = 280;
const PAD = { l: 46, r: 16, t: 20, b: 34 };
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Weight over time as a hand-drawn SVG line, with the goal as a dashed reference line. `entries` must be sorted by date. */
export function WeightChart({ entries, goalKg }: { entries: WeightEntry[]; goalKg: number | null }) {
  const reduce = useReducedMotion();
  const values = [...entries.map((e) => e.kg), ...(goalKg ? [goalKg] : [])];
  const lo = Math.floor(Math.min(...values) - 1);
  // Whole-number gridlines: three equal steps of at least 1 kg.
  const step = Math.max(1, Math.ceil((Math.ceil(Math.max(...values) + 1) - lo) / 3)); const hi = lo + step * 3;
  const t0 = day(entries[0].entryDate); const span = day(entries[entries.length - 1].entryDate) - t0;
  const x = (iso: string) => PAD.l + (span ? ((day(iso) - t0) / span) * (W - PAD.l - PAD.r) : (W - PAD.l - PAD.r) / 2);
  const y = (kg: number) => PAD.t + (1 - (kg - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const pts = entries.map((e) => [x(e.entryDate), y(e.kg)] as const);
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const base = H - PAD.b;
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z`;
  const ticks = [0, 1, 2, 3].map((i) => lo + step * i);
  const last = entries[entries.length - 1];
  const anim = (delay: number) => reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay, duration: 0.5 } };
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img"
    aria-label={`Weight chart: ${entries.length} entries, latest ${last.kg} kilograms on ${shortDate(last.entryDate)}${goalKg ? `, goal ${goalKg} kilograms` : ''}`}>
    <defs><linearGradient id="weight-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stopColor="var(--primary)" stopOpacity="0.28" /><stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
    </linearGradient></defs>
    {ticks.map((t) => <g key={t}>
      <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeDasharray="2 5" />
      <text x={PAD.l - 8} y={y(t) + 5} textAnchor="end" className="fill-muted-foreground text-[14px] tabular-nums">{Math.round(t)}</text>
    </g>)}
    {entries.length > 1 && <motion.path d={area} fill="url(#weight-fill)" {...anim(0.5)} />}
    {goalKg && <motion.g {...anim(0.3)}>
      <line x1={PAD.l} x2={W - PAD.r} y1={y(goalKg)} y2={y(goalKg)} stroke="#10b981" strokeWidth={2} strokeDasharray="7 6" />
      <text x={W - PAD.r} y={y(goalKg) - 7} textAnchor="end" className="text-[14px] font-semibold" fill="#10b981">Goal {goalKg} kg</text>
    </motion.g>}
    {entries.length > 1 && <motion.path d={line} fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
      initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />}
    {pts.map(([px, py], i) => <motion.circle key={entries[i].id} cx={px} cy={py} r={i === pts.length - 1 ? 6 : 4}
      fill="var(--card)" stroke="var(--primary)" strokeWidth={3} {...anim(0.9)} />)}
    <text x={PAD.l} y={H - 8} className="fill-muted-foreground text-[14px]">{shortDate(entries[0].entryDate)}</text>
    {entries.length > 1 && <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[14px]">{shortDate(last.entryDate)}</text>}
  </svg>;
}
