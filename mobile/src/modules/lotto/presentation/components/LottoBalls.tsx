import { Text, View } from 'react-native';

/** The numbers as balls. Highlighted ones (the ones you matched) are filled. */
export function LottoBalls({ numbers, highlight, small, label = 'Numbers' }: { numbers: number[]; highlight?: number[]; small?: boolean; label?: string }) {
  const hit = new Set(highlight);
  return <View accessible accessibilityLabel={`${label}: ${numbers.join(', ')}`} className={`flex-row flex-wrap ${small ? 'gap-1.5' : 'gap-2'}`}>
    {numbers.map((n) => <View key={n} accessible={false} className={`items-center justify-center rounded-full border ${small ? 'h-9 w-9' : 'h-11 w-11'}
      ${hit.has(n) ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`}>
      <Text className={`font-semibold ${small ? 'text-sm' : 'text-base'} ${hit.has(n) ? 'text-white' : 'text-gray-900 dark:text-white'}`}
        style={{ fontVariant: ['tabular-nums'] }}>{String(n).padStart(2, '0')}</Text></View>)}
  </View>;
}
