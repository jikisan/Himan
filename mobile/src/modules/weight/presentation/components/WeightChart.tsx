import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useColorScheme } from 'nativewind';
import type { WeightEntry } from '@himan/shared/weight';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const W = 520; const H = 300;
const PAD = { l: 46, r: 16, t: 20, b: 34 };
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** Weight over time with the goal as a dashed reference line. `entries` must be sorted by date. */
export function WeightChart({ entries, goalKg }: { entries: WeightEntry[]; goalKg: number | null }) {
  const dark = useColorScheme().colorScheme === 'dark';
  const reduce = useReducedMotion();
  const draw = useSharedValue(reduce ? 1 : 0);
  const fade = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) { draw.value = 1; fade.value = 1; return; }
    draw.value = 0; fade.value = 0;
    draw.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) });
    fade.value = withDelay(700, withTiming(1, { duration: 500 }));
  }, [entries.length, reduce, draw, fade]);

  const stroke = dark ? '#818cf8' : '#4f46e5';
  const muted = dark ? '#9ca3af' : '#6b7280';
  const values = [...entries.map((e) => e.kg), ...(goalKg ? [goalKg] : [])];
  const lo = Math.floor(Math.min(...values) - 1);
  // Whole-number gridlines: three equal steps of at least 1 kg.
  const step = Math.max(1, Math.ceil((Math.ceil(Math.max(...values) + 1) - lo) / 3)); const hi = lo + step * 3;
  const t0 = day(entries[0].entryDate); const span = day(entries[entries.length - 1].entryDate) - t0;
  const x = (iso: string) => PAD.l + (span ? ((day(iso) - t0) / span) * (W - PAD.l - PAD.r) : (W - PAD.l - PAD.r) / 2);
  const y = (kg: number) => PAD.t + (1 - (kg - lo) / (hi - lo)) * (H - PAD.t - PAD.b);
  const pts = entries.map((e) => [x(e.entryDate), y(e.kg)] as const);
  const length = pts.slice(1).reduce((sum, [px, py], i) => sum + Math.hypot(px - pts[i][0], py - pts[i][1]), 0) + 1;
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.value) }));
  const fadeProps = useAnimatedProps(() => ({ opacity: fade.value }));
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const base = H - PAD.b;
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${base} L${pts[0][0].toFixed(1)} ${base} Z`;
  const ticks = [0, 1, 2, 3].map((i) => lo + step * i);
  const last = entries[entries.length - 1];
  return <View accessible accessibilityRole="image"
    accessibilityLabel={`Weight chart: ${entries.length} entries, latest ${last.kg} kilograms on ${shortDate(last.entryDate)}${goalKg ? `, goal ${goalKg} kilograms` : ''}`}>
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={230}>
      <Defs><LinearGradient id="wf" x1="0" x2="0" y1="0" y2="1">
        <Stop offset="0" stopColor={stroke} stopOpacity={0.28} /><Stop offset="1" stopColor={stroke} stopOpacity={0} />
      </LinearGradient></Defs>
      {ticks.map((t) => <GridLine key={t} y={y(t)} label={Math.round(t)} muted={muted} dark={dark} />)}
      {entries.length > 1 && <AnimatedPath d={area} fill="url(#wf)" animatedProps={fadeProps} />}
      {goalKg && <>
        <Line x1={PAD.l} x2={W - PAD.r} y1={y(goalKg)} y2={y(goalKg)} stroke="#10b981" strokeWidth={2} strokeDasharray="7 6" />
        <SvgText x={W - PAD.r} y={y(goalKg) - 7} textAnchor="end" fontSize={15} fontWeight="600" fill="#10b981">{`Goal ${goalKg} kg`}</SvgText>
      </>}
      {entries.length > 1 && <AnimatedPath d={line} fill="none" stroke={stroke} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={`${length} ${length}`} animatedProps={lineProps} />}
      {pts.map(([px, py], i) => <Circle key={entries[i].id} cx={px} cy={py} r={i === pts.length - 1 ? 6 : 4} fill={dark ? '#1f2937' : '#fff'} stroke={stroke} strokeWidth={3} />)}
      <SvgText x={PAD.l} y={H - 8} fontSize={15} fill={muted}>{shortDate(entries[0].entryDate)}</SvgText>
      {entries.length > 1 && <SvgText x={W - PAD.r} y={H - 8} textAnchor="end" fontSize={15} fill={muted}>{shortDate(last.entryDate)}</SvgText>}
    </Svg>
  </View>;
}

function GridLine({ y, label, muted, dark }: { y: number; label: number; muted: string; dark: boolean }) {
  return <>
    <Line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke={dark ? '#374151' : '#e5e7eb'} strokeDasharray="2 5" />
    <SvgText x={PAD.l - 8} y={y + 5} textAnchor="end" fontSize={15} fill={muted}>{String(label)}</SvgText>
  </>;
}
