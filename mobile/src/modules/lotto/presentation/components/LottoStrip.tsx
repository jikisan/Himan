import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { drawDateLabel, lottoGameLabel, matchesForDraw } from '@himan/shared/lotto';
import { useLottoLatest, useLottoNumbers } from '../hooks/useLotto';
import { LottoBalls } from './LottoBalls';
import { muted, text } from './ui';

/** The latest result of each game, at the top of the dashboard. Shows nothing until there are results. */
export function LottoStrip() {
  const router = useRouter();
  const latest = useLottoLatest();
  const { sets } = useLottoNumbers();
  const draws = latest.data ?? [];
  if (draws.length === 0) return null;
  return <View accessibilityLabel="Lotto results" className="mb-8 gap-3">
    <View className="flex-row items-center justify-between">
      <Text accessibilityRole="header" className={`text-lg font-semibold ${text}`}>Lotto results</Text>
      <Pressable accessibilityRole="link" accessibilityLabel="All lotto results" onPress={() => router.push('/(app)/lotto' as never)} className="min-h-11 justify-center active:opacity-70">
        <Text className="font-semibold text-indigo-600 dark:text-indigo-400">All results</Text></Pressable>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
      {draws.map((draw) => {
        const best = matchesForDraw(draw, sets)[0];
        return <Pressable key={draw.id} accessibilityRole="link" accessibilityLabel={`${lottoGameLabel(draw.game)}, ${drawDateLabel(draw.drawDate)}`} onPress={() => router.push('/(app)/lotto' as never)}
          className="w-72 gap-2 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-70 dark:border-gray-700 dark:bg-gray-800">
          <View className="flex-row items-baseline justify-between gap-2">
            <Text className={`font-semibold ${text}`}>{lottoGameLabel(draw.game)}</Text>
            <Text className={`text-sm ${muted}`}>{drawDateLabel(draw.drawDate)}</Text></View>
          <LottoBalls small numbers={draw.numbers} label={`${lottoGameLabel(draw.game)} winning numbers`} />
          {best?.wins && <View className="flex-row items-center gap-1"><Feather accessible={false} name="award" size={16} color="#059669" />
            <Text className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">You matched {best.count}</Text></View>}
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
