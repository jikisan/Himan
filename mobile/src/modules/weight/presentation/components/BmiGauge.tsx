import { Text, View } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
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
const COLOR: Record<BmiCategory, string> = { underweight: '#0ea5e9', normal: '#10b981', overweight: '#f59e0b', obese: '#f43f5e' };

const point = (bmi: number) => {
  const angle = Math.PI * (1 - (Math.min(MAX, Math.max(MIN, bmi)) - MIN) / (MAX - MIN));
  return { x: C + R * Math.cos(angle), y: C - R * Math.sin(angle) };
};
const arc = (from: number, to: number) => {
  const a = point(from); const b = point(to);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
};

export function BmiGauge({ bmi }: { bmi: number }) {
  const dark = useColorScheme().colorScheme === 'dark';
  const shown = useCountUp(bmi);
  const marker = point(shown);
  const category = bmiCategory(bmi);
  return <View className="items-center" accessible accessibilityLabel={`BMI ${bmi.toFixed(1)}, ${BMI_LABELS[category]}`}>
    <Svg viewBox="0 0 200 120" width="100%" height={190}>
      <Path d={arc(MIN, MAX)} fill="none" stroke={dark ? '#374151' : '#e5e7eb'} strokeWidth={16} strokeLinecap="round" />
      {SEGMENTS.map((s) => <Path key={s.category} d={arc(s.from + 0.15, s.to - 0.15)} fill="none" stroke={COLOR[s.category]}
        strokeWidth={12} opacity={s.category === category ? 1 : 0.35} />)}
      <Circle cx={marker.x} cy={marker.y} r={9} fill={dark ? '#1f2937' : '#fff'} stroke={COLOR[category]} strokeWidth={4} />
      <G>
        <SvgText x={C} y={C - 8} textAnchor="middle" fontSize={34} fontWeight="600" fill={dark ? '#fff' : '#111827'}>{shown.toFixed(1)}</SvgText>
        <SvgText x={C} y={C + 12} textAnchor="middle" fontSize={11} fill="#9ca3af">BMI</SvgText>
      </G>
    </Svg>
    <View className="rounded-full px-4 py-1.5" style={{ backgroundColor: COLOR[category] }}><Text className="text-base font-semibold text-white">{BMI_LABELS[category]}</Text></View>
    <Text className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">Healthy range is 18.5 to 24.9 (WHO).</Text>
  </View>;
}
