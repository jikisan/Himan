import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LOTTO_GAMES, LOTTO_GAME_INFO, LOTTO_SET_SIZE, lottoGameLabel, lottoNumbersSchema } from '@himan/shared/lotto';
import type { LottoGame, LottoNumbers, LottoNumbersInput } from '@himan/shared/lotto';
import { Btn, muted, text, useIconColor } from './ui';

const input = 'min-h-12 rounded-xl border border-gray-300 bg-white px-3 text-base text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white';

function Form({ set, busy, onSave, onClose }: { set?: LottoNumbers; busy: boolean; onSave(input: LottoNumbersInput): Promise<void>; onClose(): void }) {
  const insets = useSafeAreaInsets();
  const [game, setGame] = useState<LottoGame>(set?.game ?? '6/45');
  const [label, setLabel] = useState(set?.label ?? '');
  const [numbers, setNumbers] = useState<number[]>(set?.numbers ?? []);
  const [error, setError] = useState('');
  const max = LOTTO_GAME_INFO[game].max;
  const toggle = (n: number) => {
    setError('');
    setNumbers((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < LOTTO_SET_SIZE ? [...prev, n].sort((a, b) => a - b) : prev);
  };
  const save = async () => {
    const result = lottoNumbersSchema.safeParse({ game, label, numbers });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    try { await onSave(result.data); } catch (e) { setError(e instanceof Error && e.message ? e.message : 'Could not save these numbers. Try again.'); }
  };
  return <>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 20 }}>
      <Text className={muted}>We check these against every draw of this game from the day you save them.</Text>
      {error ? <Text accessibilityRole="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-700">{error}</Text> : null}
      <View className="gap-2">
        <Text className={`text-base font-semibold ${text}`}>Game</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel="Game" className="flex-row flex-wrap gap-2">
          {LOTTO_GAMES.map((g) => {
            const on = g === game;
            return <Pressable key={g} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !!set }} disabled={!!set} accessibilityLabel={lottoGameLabel(g)}
              onPress={() => { setGame(g); setNumbers((prev) => prev.filter((n) => n <= LOTTO_GAME_INFO[g].max)); }}
              className={`min-h-12 justify-center rounded-xl px-4 active:opacity-70 ${on ? 'bg-indigo-600' : 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'} ${set && !on ? 'opacity-40' : ''}`}>
              <Text className={`text-base ${on ? 'font-semibold text-white' : text}`}>{g}</Text></Pressable>;
          })}
        </View>
        <Text className={`text-sm ${muted}`}>{lottoGameLabel(game)}{set ? '. The game can’t change; add new numbers to play another game.' : ''}</Text>
      </View>
      <View className="gap-2">
        <Text className={`text-base font-semibold ${text}`}>Name <Text className={`font-normal ${muted}`}>(optional)</Text></Text>
        <TextInput accessibilityLabel="Name" className={input} value={label} onChangeText={setLabel} maxLength={60} placeholder="e.g. Birthday" placeholderTextColor="#9ca3af" />
      </View>
      <View className="gap-2">
        <View className="flex-row items-baseline justify-between">
          <Text className={`text-base font-semibold ${text}`}>Pick {LOTTO_SET_SIZE} numbers</Text>
          <Text accessibilityLiveRegion="polite" className={`text-sm ${muted}`}>{numbers.length} of {LOTTO_SET_SIZE} chosen</Text></View>
        <View className="flex-row flex-wrap gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
            const on = numbers.includes(n);
            return <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n}`} accessibilityState={{ selected: on }} onPress={() => toggle(n)}
              className={`h-12 w-12 items-center justify-center rounded-full border active:opacity-70 ${on ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}>
              <Text className={`text-base font-semibold ${on ? 'text-white' : text}`} style={{ fontVariant: ['tabular-nums'] }}>{n}</Text></Pressable>;
          })}
        </View>
      </View>
    </ScrollView>
    <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="flex-row gap-2 border-t border-gray-200 bg-white px-4 pt-3 dark:border-gray-800 dark:bg-gray-900">
      <Btn grow label="Cancel" onPress={onClose} disabled={busy} />
      <Btn grow primary label={busy ? 'Saving…' : 'Save numbers'} onPress={() => void save()} disabled={busy} />
    </View>
  </>;
}

/** Add, or edit, a set of numbers to keep. `set` is the one being edited. */
export function NumbersSheet({ open, set, busy, onSave, onClose }: { open: boolean; set?: LottoNumbers; busy: boolean; onSave(input: LottoNumbersInput): Promise<void>; onClose(): void }) {
  const icon = useIconColor();
  return <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <Text accessibilityRole="header" className={`text-xl font-semibold ${text}`}>{set ? 'Edit numbers' : 'Add numbers'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} className="min-h-11 flex-row items-center gap-1 rounded-xl px-3 active:opacity-70">
          <Feather accessible={false} name="x" size={20} color={icon} /><Text className={`font-semibold ${text}`}>Close</Text></Pressable>
      </View>
      {open && <Form key={set?.id ?? 'new'} set={set} busy={busy} onSave={onSave} onClose={onClose} />}
    </SafeAreaView>
  </Modal>;
}
