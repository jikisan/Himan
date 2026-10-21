import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { LOTTO_GAMES, LOTTO_NUMBERS_LIMIT, drawDateLabel, lottoGameLabel } from '@himan/shared/lotto';
import type { LottoDraw, LottoGame, LottoNumbers } from '@himan/shared/lotto';
import { useToast } from '@/modules/shared/components/useToast';
import { useLottoDraws, useLottoNumbers } from '../hooks/useLotto';
import { DrawCard } from '../components/DrawCard';
import { LottoBalls } from '../components/LottoBalls';
import { NumbersSheet } from '../components/NumbersSheet';
import { Btn, DateButton, card, muted, text, useIconColor } from '../components/ui';

type Row = { type: 'day'; date: string } | { type: 'draw'; draw: LottoDraw };

function Results({ sets }: { sets: LottoNumbers[] }) {
  const [game, setGame] = useState<LottoGame | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filter = useMemo(() => ({ game: game || undefined, from: from || undefined, to: to || undefined }), [game, from, to]);
  const { draws, loading, error, more, loadingMore, loadMore, refetch, refreshing } = useLottoDraws(filter);
  const rows = useMemo(() => {
    const out: Row[] = [];
    let last = '';
    for (const draw of draws) {
      if (draw.drawDate !== last) { out.push({ type: 'day', date: draw.drawDate }); last = draw.drawDate; }
      out.push({ type: 'draw', draw });
    }
    return out;
  }, [draws]);
  const filtered = !!(game || from || to);
  const chip = (value: LottoGame | '', words: string) => {
    const on = value === game;
    return <Pressable key={value || 'all'} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={value ? lottoGameLabel(value) : 'All games'} onPress={() => setGame(value)}
      className={`min-h-11 justify-center rounded-xl px-4 active:opacity-70 ${on ? 'bg-indigo-600' : 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}>
      <Text className={`text-base ${on ? 'font-semibold text-white' : text}`}>{words}</Text></Pressable>;
  };
  return <FlatList<Row> data={rows} keyExtractor={(row) => (row.type === 'day' ? `day-${row.date}` : row.draw.id)} refreshing={refreshing} onRefresh={() => void refetch()}
    contentContainerStyle={{ padding: 16, gap: 12 }} onEndReached={() => { if (more && !loadingMore) void loadMore(); }} onEndReachedThreshold={0.5}
    ListHeaderComponent={<View className="mb-2 gap-4">
      <View accessibilityRole="radiogroup" accessibilityLabel="Game" className="flex-row flex-wrap gap-2">{[chip('', 'All'), ...LOTTO_GAMES.map((g) => chip(g, g))]}</View>
      <View className="flex-row gap-3"><DateButton label="From" value={from} max={to || undefined} onChange={setFrom} /><DateButton label="To" value={to} min={from || undefined} onChange={setTo} /></View>
      {filtered && <Btn small label="Clear filters" onPress={() => { setGame(''); setFrom(''); setTo(''); }} />}
    </View>}
    renderItem={({ item }) => item.type === 'day'
      ? <Text accessibilityRole="header" className={`mt-4 text-base font-semibold ${text}`}>{format(parseISO(item.date), 'EEEE, MMMM d, yyyy')}</Text>
      : <DrawCard draw={item.draw} sets={sets} />}
    ListFooterComponent={loadingMore ? <ActivityIndicator color="#4f46e5" /> : null}
    ListEmptyComponent={loading ? <ActivityIndicator color="#4f46e5" /> : error
      ? <View className={`${card} items-center gap-3`}><Text accessibilityRole="alert" className={text}>Couldn’t load the results. Check your connection and try again.</Text><Btn label="Try again" onPress={() => void refetch()} /></View>
      : <Text className={`rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600 ${muted}`}>{filtered ? 'No draws match these filters.' : 'No results yet. They appear after each night’s draw.'}</Text>} />;
}

function MyNumbers({ sets, loading, busy, run }: ReturnType<typeof useLottoNumbers>) {
  const { showToast, ToastView } = useToast();
  const [dialog, setDialog] = useState<{ set?: LottoNumbers } | null>(null);
  const full = sets.length >= LOTTO_NUMBERS_LIMIT;
  const act = async (task: Promise<unknown>, done: string) => { try { await task; showToast(done); } catch { showToast('Could not do that. Check your connection and try again.', 'error'); } };
  const remove = (set: LottoNumbers) => Alert.alert('Delete these numbers?', `${set.label || 'These numbers'} will no longer be checked against draws.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void act(run({ type: 'remove', id: set.id }), 'Deleted') }]);
  return <View className="flex-1">
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text className={muted}>Keep the numbers you play. We check them against every draw from the day you save them. {sets.length} of {LOTTO_NUMBERS_LIMIT} kept.</Text>
      <Btn primary icon="plus" label="Add numbers" disabled={full || busy} onPress={() => setDialog({})} />
      {full && <Text accessibilityRole="alert" className={`text-sm ${muted}`}>You’ve kept the most you can. Delete some to add more.</Text>}
      {loading ? <ActivityIndicator color="#4f46e5" />
        : sets.length === 0 ? <Text className={`rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-600 ${muted}`}>No numbers yet. Add the ones you play, and each result shows how many matched.</Text>
        : sets.map((set) => <View key={set.id} className={`${card} gap-3`}>
          <View className="flex-row flex-wrap items-baseline justify-between gap-2">
            <Text accessibilityRole="header" className={`text-base font-semibold ${text}`}>{set.label || 'Untitled numbers'}</Text>
            <Text className={`text-sm ${muted}`}>{lottoGameLabel(set.game)}{set.active ? '' : ' · Paused'}</Text></View>
          <LottoBalls label="Numbers" numbers={set.numbers} />
          <Text className={`text-sm ${muted}`}>{set.active ? `Counting from ${drawDateLabel(set.startsOn, true)}` : 'Paused: not checked against new draws.'}</Text>
          <View className="flex-row flex-wrap gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
            <Btn small icon="edit-2" label="Edit" disabled={busy} onPress={() => setDialog({ set })} />
            <Btn small icon={set.active ? 'pause' : 'play'} label={set.active ? 'Pause' : 'Resume'} disabled={busy}
              onPress={() => void act(run({ type: 'active', id: set.id, active: !set.active }), set.active ? 'Paused' : 'Resumed')} />
            <Btn small danger icon="trash-2" label="Delete" disabled={busy} onPress={() => remove(set)} />
          </View>
        </View>)}
    </ScrollView>
    <NumbersSheet open={!!dialog} set={dialog?.set} busy={busy} onClose={() => setDialog(null)}
      onSave={async (input) => { await run({ type: 'save', id: dialog?.set?.id ?? null, input }); setDialog(null); showToast(dialog?.set ? 'Numbers updated' : 'Numbers saved'); }} />
    {ToastView}
  </View>;
}

/** PCSO 6-number results and the user's maintained numbers. */
export default function LottoScreen() {
  const router = useRouter();
  const icon = useIconColor();
  const numbers = useLottoNumbers();
  const [tab, setTab] = useState<'results' | 'numbers'>('results');
  const tabButton = (value: typeof tab, words: string) => {
    const on = tab === value;
    return <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(value)}
      className={`min-h-12 flex-1 items-center justify-center rounded-xl active:opacity-70 ${on ? 'bg-white dark:bg-gray-700' : ''}`}>
      <Text className={`text-base ${on ? 'font-semibold' : ''} ${on ? text : muted}`}>{words}</Text></Pressable>;
  };
  return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <View className="flex-row items-center border-b border-gray-200 px-2 py-2 dark:border-gray-800">
      <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/(app)/dashboard')} className="min-h-12 flex-row items-center gap-1 rounded-xl px-3 active:opacity-70">
        <Feather accessible={false} name="arrow-left" size={22} color={icon} /><Text className={`text-base font-semibold ${text}`}>Dashboard</Text></Pressable>
      <Text accessibilityRole="header" className={`absolute inset-x-0 -z-10 text-center text-lg font-bold ${text}`}>Lotto</Text>
    </View>
    <View accessibilityRole="tablist" className="m-4 mb-0 flex-row gap-1 rounded-2xl bg-gray-200 p-1 dark:bg-gray-800">{[tabButton('results', 'Results'), tabButton('numbers', 'My numbers')]}</View>
    <View className="flex-1">{tab === 'results' ? <Results sets={numbers.sets} /> : <MyNumbers {...numbers} />}</View>
  </SafeAreaView>;
}
