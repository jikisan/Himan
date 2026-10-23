import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { BreakdownRow } from '@himan/shared/finances';

const R = 42;
const C = 2 * Math.PI * R;

/** Ring of category shares. A mask wipes clockwise to draw it in. */
export function Donut({ rows }: { rows: BreakdownRow[] }) {
  const reduce = useReducedMotion();
  const mask = useId();
  const starts = rows.map((_, i) => rows.slice(0, i).reduce((sum, r) => sum + r.share * C, 0));
  return <svg viewBox="0 0 100 100" className="h-44 w-44 -rotate-90" role="img" aria-label="Spending by category">
    <defs>
      <mask id={mask}>
        <motion.circle cx="50" cy="50" r={R} fill="none" stroke="white" strokeWidth="20" pathLength={1}
          initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      </mask>
    </defs>
    <circle cx="50" cy="50" r={R} fill="none" strokeWidth="14" className="stroke-muted" />
    <g mask={`url(#${mask})`}>
      {rows.map((row, i) => {
        const length = row.share * C;
        return <circle key={row.categoryId ?? 'none'} cx="50" cy="50" r={R} fill="none" stroke={row.color} strokeWidth="14"
          strokeDasharray={`${Math.max(length - 0.8, 0)} ${C}`} strokeDashoffset={-starts[i]} />;
      })}
    </g>
  </svg>;
}
