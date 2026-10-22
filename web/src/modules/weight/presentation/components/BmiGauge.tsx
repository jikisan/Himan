import { BMI_LABELS, bmiCategory } from '@himan/shared/weight';
import type { BmiCategory } from '@himan/shared/weight';
import { useCountUp } from '../hooks/useCountUp';

const MIN = 15;
const MAX = 40;
const R = 80;
const C = 100;
const SEGMENTS: { category: BmiCategory; from: number; to: number }[] = [
  { category: 'underweight', from: MIN, to: 18.5 },
  { category: 'normal', from: 18.5, to: 25 },
  { category: 'overweight', from: 25, to: 30 },
  { category: 'obese', from: 30, to: MAX },
];
const CATEGORY_COLOR: Record<BmiCategory, string> = {
  underweight: '#0ea5e9', normal: '#10b981', overweight: '#f59e0b', obese: '#f43f5e',
};

/** Point on the half-circle for a BMI: MIN is the left end, MAX the right end. */
const point = (bmi: number, radius = R) => {
  const angle = Math.PI * (1 - (Math.min(MAX, Math.max(MIN, bmi)) - MIN) / (MAX - MIN));
  return { x: C + radius * Math.cos(angle), y: C - radius * Math.sin(angle) };
};
const arc = (from: number, to: number) => {
  const a = point(from); const b = point(to);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
};

export function BmiGauge({ bmi }: { bmi: number }) {
  const shown = useCountUp(bmi);
  const marker = point(shown);
  const category = bmiCategory(bmi);
  return <div className="flex flex-col items-center">
    <svg viewBox="0 0 200 120" className="w-full max-w-[18rem]" role="img" aria-label={`BMI ${bmi.toFixed(1)}, ${BMI_LABELS[category]}`}>
      <path d={arc(MIN, MAX)} fill="none" stroke="currentColor" strokeWidth={16} strokeLinecap="round" className="text-muted" />
      {SEGMENTS.map((s) => <path key={s.category} d={arc(s.from + 0.15, s.to - 0.15)} fill="none" stroke={CATEGORY_COLOR[s.category]}
        strokeWidth={12} opacity={s.category === category ? 1 : 0.35} />)}
      <circle cx={marker.x} cy={marker.y} r={9} fill="var(--card)" stroke={CATEGORY_COLOR[category]} strokeWidth={4} />
      <text x={C} y={C - 8} textAnchor="middle" className="fill-foreground text-[34px] font-semibold tabular-nums">{shown.toFixed(1)}</text>
      <text x={C} y={C + 12} textAnchor="middle" className="fill-muted-foreground text-[11px]">BMI</text>
    </svg>
    <p className="mt-1 rounded-full px-4 py-1.5 text-base font-semibold text-white" style={{ background: CATEGORY_COLOR[category] }}>{BMI_LABELS[category]}</p>
    <p className="mt-3 text-center text-sm text-muted-foreground">Healthy range is 18.5 to 24.9 (WHO).</p>
  </div>;
}
