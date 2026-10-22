import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { calcBmi, lastChange, sortEntries, todayIso, weightEntrySchema, weightProgress, weightSettingsSchema } from '@himan/shared/weight';
import type { WeightEntry } from '@himan/shared/weight';
import { useWeight } from '../hooks/useWeight';
import { useCountUp } from '../hooks/useCountUp';
import { BmiGauge } from '../components/BmiGauge';
import { WeightChart } from '../components/WeightChart';

const inputClass = 'rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-lg text-gray-900 dark:text-white';
const textClass = 'text-gray-900 dark:text-white';
const mutedClass = 'text-gray-500 dark:text-gray-400';
const cardClass = 'rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/60 p-5';

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const shiftDay = (iso: string, by: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + by * 86400000).toISOString().slice(0, 10);
const num = (text: string) => text.trim() === '' ? null : Number(text.replace(',', '.'));

function Button({ label, onPress, kind = 'primary', disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'outline' | 'danger'; disabled?: boolean }) {
  const style = kind === 'primary' ? 'bg-indigo-600' : 'border border-gray-300 dark:border-gray-600';
  const color = kind === 'primary' ? 'text-white' : kind === 'danger' ? 'text-red-600 dark:text-red-400' : textClass;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    className={`min-h-12 items-center justify-center rounded-xl px-4 py-3 active:opacity-70 ${style} ${disabled ? 'opacity-50' : ''}`}>
    <Text className={`text-base font-semibold ${color}`}>{label}</Text></Pressable>;
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-3">
        <Text className={`text-lg font-bold ${textClass}`}>{title}</Text>
        <Pressable accessibilityRole="button" onPress={onClose} className="px-3 py-3"><Text className="text-base font-semibold text-indigo-600 dark:text-indigo-400">Close</Text></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 20 }}>{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

function EntryForm({ entry, busy, onSave }: { entry: WeightEntry | null; busy: boolean; onSave: (date: string, kg: number) => Promise<void> }) {
  const [date, setDate] = useState(entry?.entryDate ?? todayIso());
  const [kg, setKg] = useState(entry ? String(entry.kg) : '');
  const [error, setError] = useState('');
  const today = todayIso();
  return <>
    <View className="gap-2">
      <Text className={`text-sm font-semibold ${textClass}`}>Date</Text>
      {entry ? <Text className={`text-lg ${textClass}`}>{fmtDate(entry.entryDate)}</Text> : <>
        <Text className={`text-lg ${textClass}`}>{fmtDate(date)}</Text>
        <View className="flex-row gap-3">
          <View className="flex-1"><Button kind="outline" label="Previous day" onPress={() => setDate(shiftDay(date, -1))} /></View>
          <View className="flex-1"><Button kind="outline" label="Next day" disabled={date >= today} onPress={() => setDate(shiftDay(date, 1))} /></View>
        </View>
        <Text className={`text-sm ${mutedClass}`}>Saving a day that already has a weight replaces it.</Text></>}
    </View>
    <View className="gap-2">
      <Text className={`text-sm font-semibold ${textClass}`}>Weight (kg)</Text>
      <TextInput accessibilityLabel="Weight in kilograms" className={inputClass} value={kg} onChangeText={(v) => { setKg(v); setError(''); }}
        keyboardType="decimal-pad" placeholder="e.g. 72.5" placeholderTextColor="#9ca3af" editable={!busy} autoFocus />
    </View>
    {error ? <Text accessibilityRole="alert" className="text-base text-red-600 dark:text-red-400">{error}</Text> : null}
    <Button label={busy ? 'Saving…' : 'Save weight'} disabled={busy} onPress={async () => {
      const result = weightEntrySchema.safeParse({ entryDate: date, kg: num(kg) ?? NaN });
      if (!result.success) { setError(result.error.issues[0].code === 'invalid_type' ? 'Enter your weight in kg' : result.error.issues[0].message); return; }
      try { await onSave(result.data.entryDate, result.data.kg); } catch { setError('Could not save. Try again.'); }
    }} />
  </>;
}

function SettingsForm({ heightCm, goalKg, busy, onSave }: { heightCm: number | null; goalKg: number | null; busy: boolean; onSave: (h: number | null, g: number | null) => Promise<void> }) {
  const [height, setHeight] = useState(heightCm?.toString() ?? '');
  const [goal, setGoal] = useState(goalKg?.toString() ?? '');
  const [error, setError] = useState('');
  return <>
    <View className="gap-2">
      <Text className={`text-sm font-semibold ${textClass}`}>Height (cm)</Text>
      <TextInput accessibilityLabel="Height in centimetres" className={inputClass} value={height} onChangeText={(v) => { setHeight(v); setError(''); }}
        keyboardType="decimal-pad" placeholder="e.g. 165" placeholderTextColor="#9ca3af" editable={!busy} autoFocus />
      <Text className={`text-sm ${mutedClass}`}>Used to work out your BMI.</Text>
    </View>
    <View className="gap-2">
      <Text className={`text-sm font-semibold ${textClass}`}>Goal weight (kg)</Text>
      <TextInput accessibilityLabel="Goal weight in kilograms" className={inputClass} value={goal} onChangeText={(v) => { setGoal(v); setError(''); }}
        keyboardType="decimal-pad" placeholder="e.g. 65" placeholderTextColor="#9ca3af" editable={!busy} />
      <Text className={`text-sm ${mutedClass}`}>Optional. Leave empty for no goal.</Text>
    </View>
    {error ? <Text accessibilityRole="alert" className="text-base text-red-600 dark:text-red-400">{error}</Text> : null}
    <Button label={busy ? 'Saving…' : 'Save settings'} disabled={busy} onPress={async () => {
      const result = weightSettingsSchema.safeParse({ heightCm: num(height), goalKg: num(goal) });
      if (!result.success) { setError(result.error.issues[0].code === 'invalid_type' ? 'Enter a number' : result.error.issues[0].message); return; }
      try { await onSave(result.data.heightCm, result.data.goalKg); } catch { setError('Could not save. Try again.'); }
    }} />
  </>;
}

function LatestStat({ value }: { value: number }) {
  const shown = useCountUp(value);
  return <Text className={`text-5xl font-semibold ${textClass}`}>{shown.toFixed(1)}<Text className={`text-xl font-normal ${mutedClass}`}> kg</Text></Text>;
}

function GoalCard({ start, current, goal, onEdit }: { start: number; current: number; goal: number | null; onEdit: () => void }) {
  const reduce = useReducedMotion();
  const fill = useSharedValue(reduce ? 1 : 0);
  const progress = goal === null ? null : weightProgress(start, current, goal);
  const target = progress?.fraction ?? 0;
  const barStyle = useAnimatedStyle(() => ({ width: `${(reduce ? target : fill.value * target) * 100}%` }));
  useEffect(() => { if (!reduce) fill.value = withTiming(1, { duration: 900 }); }, [reduce, fill]);
  if (goal === null || !progress) return <View className={cardClass}><Text className={`text-lg font-semibold ${textClass}`}>Goal</Text>
    <Text className={`mt-1 mb-4 text-base ${mutedClass}`}>Set a goal weight to see how far along you are.</Text><Button kind="outline" label="Set a goal" onPress={onEdit} /></View>;
  const percent = Math.round(progress.fraction * 100);
  return <View className={cardClass} accessible accessibilityLabel={`Goal ${goal} kilograms, ${percent} percent of the way. ${progress.reached ? 'Goal reached' : `${progress.remainingKg.toFixed(1)} kilograms to go`}`}>
    <View className="flex-row items-baseline justify-between"><Text className={`text-lg font-semibold ${textClass}`}>Goal: {goal} kg</Text><Text className={`text-2xl font-semibold ${textClass}`}>{percent}%</Text></View>
    <View className="mt-3 h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><Animated.View className="h-full rounded-full bg-emerald-500" style={barStyle} /></View>
    <Text className={`mt-3 text-base ${textClass}`}>{progress.reached ? 'You reached your goal. Well done!' : `${progress.remainingKg.toFixed(1)} kg to go`}</Text>
    <Text className={`text-sm ${mutedClass}`}>Started at {start} kg</Text>
  </View>;
}

export default function WeightScreen() {
  const weight = useWeight();
  return <WeightContent key={weight.userId ?? 'signed-out'} {...weight} />;
}

function WeightContent({ entries, settings, loading, error, refetch, userId, busy, saveEntry, removeEntry, saveSettings }: ReturnType<typeof useWeight>) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const reduce = useReducedMotion();
  const iconColor = colorScheme === 'dark' ? '#e5e7eb' : '#111827';
  const [dialog, setDialog] = useState<'log' | 'settings' | { edit: WeightEntry } | null>(null);
  const sorted = sortEntries(entries);
  const latest = sorted[sorted.length - 1];
  const change = lastChange(sorted);
  const bmi = latest && settings.heightCm ? calcBmi(latest.kg, settings.heightCm) : null;
  const editing = typeof dialog === 'object' && dialog ? dialog.edit : null;

  const confirmDelete = (entry: WeightEntry) => Alert.alert('Delete this entry?', `${entry.kg} kg on ${fmtDate(entry.entryDate)} will be removed.`, [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => {
      if (!reduce) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      removeEntry(entry.id).catch(() => Alert.alert('Could not delete', 'Try again.'));
    } },
  ]);

  return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <View className="flex-row items-center border-b border-gray-200 dark:border-gray-800 px-2 py-2">
      <Pressable accessibilityRole="button" onPress={() => router.replace('/(app)/dashboard')} className="flex-row items-center gap-1 px-3 py-3">
        <Feather name="arrow-left" size={20} color={iconColor} /><Text className={`text-base ${textClass}`}>Dashboard</Text></Pressable>
      <Text className={`flex-1 text-center text-lg font-bold ${textClass}`}>Weight</Text>
      <View className="w-28" />
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View className="flex-row gap-3">
        <View className="flex-1"><Button label="Log weight" disabled={!userId} onPress={() => setDialog('log')} /></View>
        <View className="flex-1"><Button kind="outline" label="Height & goal" disabled={!userId} onPress={() => setDialog('settings')} /></View>
      </View>
      {!userId ? <Text className={textClass}>Sign in to track your weight.</Text>
        : error ? <View className="gap-3 rounded-xl border border-red-300 p-4"><Text accessibilityRole="alert" className="text-red-600 dark:text-red-400">Could not load your weight.</Text>
          <Button kind="outline" label="Retry" onPress={() => void refetch()} /></View>
        : loading ? <ActivityIndicator color="#4f46e5" />
        : !latest ? <View className="items-center gap-3 py-12"><Feather name="activity" size={40} color="#9ca3af" />
          <Text className={`text-lg font-semibold ${textClass}`}>Start your weight log</Text>
          <Text className={`text-center ${mutedClass}`}>Add today’s weight. Add your height too and we will show your BMI.</Text></View>
        : <>
          <Animated.View entering={reduce ? undefined : FadeInDown.duration(400)} className={cardClass}>
            <Text className={`text-sm ${mutedClass}`}>Latest · {fmtDate(latest.entryDate)}</Text>
            <LatestStat value={latest.kg} />
            {change !== null && <Text className={`mt-1 mb-3 text-base font-medium ${textClass}`}>{change === 0 ? 'No change since last entry' : `${change > 0 ? '+' : '−'}${Math.abs(change)} kg since last entry`}</Text>}
            <WeightChart entries={sorted} goalKg={settings.goalKg} />
          </Animated.View>
          <Animated.View entering={reduce ? undefined : FadeInDown.delay(120).duration(400)} className={cardClass}>
            <Text className={`mb-2 text-lg font-semibold ${textClass}`}>BMI</Text>
            {bmi !== null ? <BmiGauge bmi={bmi} /> : <><Text className={`mb-4 text-base ${mutedClass}`}>Add your height to see your BMI.</Text>
              <Button kind="outline" label="Add height" onPress={() => setDialog('settings')} /></>}
          </Animated.View>
          <Animated.View entering={reduce ? undefined : FadeInDown.delay(240).duration(400)}>
            <GoalCard start={sorted[0].kg} current={latest.kg} goal={settings.goalKg} onEdit={() => setDialog('settings')} />
          </Animated.View>
          <View className={cardClass}>
            <Text className={`mb-2 text-lg font-semibold ${textClass}`}>History</Text>
            {[...sorted].reverse().map((entry) => <Animated.View key={entry.id} layout={reduce ? undefined : LinearTransition}
              entering={reduce ? undefined : FadeInDown.duration(250)} className="gap-3 border-t border-gray-200 dark:border-gray-700 py-3">
              <View className="flex-row items-center justify-between"><Text className={`flex-1 text-base ${textClass}`}>{fmtDate(entry.entryDate)}</Text>
                <Text className={`text-lg font-semibold ${textClass}`}>{entry.kg} kg</Text></View>
              <View className="flex-row gap-3">
                <View className="flex-1"><Button kind="outline" label="Edit" onPress={() => setDialog({ edit: entry })} /></View>
                <View className="flex-1"><Button kind="danger" label="Delete" disabled={busy} onPress={() => confirmDelete(entry)} /></View>
              </View>
            </Animated.View>)}
          </View>
        </>}
    </ScrollView>
    {dialog === 'settings' && <Sheet title="Height & goal" onClose={() => !busy && setDialog(null)}>
      <SettingsForm heightCm={settings.heightCm} goalKg={settings.goalKg} busy={busy} onSave={async (heightCm, goalKg) => { await saveSettings({ heightCm, goalKg }); setDialog(null); }} /></Sheet>}
    {dialog && dialog !== 'settings' && <Sheet title={editing ? 'Edit weight' : 'Log weight'} onClose={() => !busy && setDialog(null)}>
      <EntryForm entry={editing} busy={busy} onSave={async (entryDate, kg) => { await saveEntry({ entryDate, kg }); setDialog(null); }} /></Sheet>}
  </SafeAreaView>;
}
