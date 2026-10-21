import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LOTTO_PRIZE_MATCHES, lottoGameLabel, matchesForDraw } from '@himan/shared/lotto';
import type { LottoDraw, LottoMatch, LottoNumbers } from '@himan/shared/lotto';
import { LottoBalls } from './LottoBalls';
import { card, muted, text } from './ui';

const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MatchRow = ({ match }: { match: LottoMatch }) => <View className="gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900">
  <View className="flex-row flex-wrap items-center justify-between gap-2">
    <Text className={`font-semibold ${text}`}>{match.set.label || 'Untitled numbers'}</Text>
    <View className="flex-row items-center gap-1">
      {match.wins && <Feather accessible={false} name="award" size={16} color="#059669" />}
      <Text className={match.wins ? 'text-sm font-semibold text-emerald-700 dark:text-emerald-400' : `text-sm ${muted}`}>
        {match.count} matched{match.wins ? ' · wins a prize' : ''}</Text></View>
  </View>
  <LottoBalls small label="Your numbers" numbers={match.set.numbers} highlight={match.matched} />
</View>;

/** One draw: its numbers and prize, then how your maintained numbers did, winners first. The date is left out: the list groups draws by day. */
export function DrawCard({ draw, sets }: { draw: LottoDraw; sets: LottoNumbers[] }) {
  const [others, setOthers] = useState(false);
  const matches = matchesForDraw(draw, sets);
  const winning = matches.filter((m) => m.count >= LOTTO_PRIZE_MATCHES);
  const rest = matches.filter((m) => m.count < LOTTO_PRIZE_MATCHES);
  return <View accessibilityLabel={lottoGameLabel(draw.game)} className={`${card} gap-3`}>
    <Text accessibilityRole="header" className={`text-base font-semibold ${text}`}>{lottoGameLabel(draw.game)}</Text>
    <LottoBalls numbers={draw.numbers} label={`${lottoGameLabel(draw.game)} winning numbers`} />
    <Text className={`text-sm ${muted}`}>Jackpot {peso(draw.jackpot)} · {draw.winners === 0 ? 'no winner' : `${draw.winners} ${draw.winners === 1 ? 'winner' : 'winners'}`}</Text>
    {matches.length > 0 && <View className="gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
      <Text className={`text-sm font-semibold ${text}`}>Your numbers</Text>
      {winning.length === 0 && <Text className={`text-sm ${muted}`}>None of your numbers won this draw.</Text>}
      {winning.map((m) => <MatchRow key={m.set.id} match={m} />)}
      {rest.length > 0 && <>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: others }} onPress={() => setOthers(!others)} className="min-h-11 justify-center active:opacity-70">
          <Text className="font-semibold text-indigo-600 dark:text-indigo-400">{others ? 'Hide other numbers' : `Show other numbers (${rest.length})`}</Text></Pressable>
        {others && rest.map((m) => <MatchRow key={m.set.id} match={m} />)}
      </>}
    </View>}
  </View>;
}
