import Svg, { Circle, G } from 'react-native-svg';
import type { BreakdownRow } from '@himan/shared/finances';

const R = 42;
const C = 2 * Math.PI * R;

/** Ring of category shares; `progress` (0..1) draws it clockwise. */
export function Donut({ rows, progress, trackColor }: { rows: BreakdownRow[]; progress: number; trackColor: string }) {
  let start = 0;
  const arcs = rows.map((row) => {
    const length = row.share * C;
    const drawn = Math.min(Math.max(progress * C - start, 0), length);
    const arc = { row, start, drawn };
    start += length;
    return arc;
  });
  return <Svg width={176} height={176} viewBox="0 0 100 100" accessibilityLabel="Spending by category">
    <G rotation={-90} origin="50, 50">
      <Circle cx={50} cy={50} r={R} fill="none" stroke={trackColor} strokeWidth={14} />
      {arcs.map(({ row, start: s, drawn }) => drawn > 0 && <Circle key={row.categoryId ?? 'none'} cx={50} cy={50} r={R} fill="none"
        stroke={row.color} strokeWidth={14} strokeDasharray={`${Math.max(drawn - 0.8, 0)} ${C}`} strokeDashoffset={-s} />)}
    </G>
  </Svg>;
}
