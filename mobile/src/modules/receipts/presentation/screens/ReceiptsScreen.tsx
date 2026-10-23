import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { format, parseISO } from 'date-fns';
import { expiringSoon, filterReceipts, tagCounts, todayISO } from '@himan/shared/receipts';
import type { Receipt } from '@himan/shared/receipts';
import { useReceipts } from '../hooks/useReceipts';
import { PhotoImage } from '../components/PhotoImage';
import { ReceiptForm } from '../components/ReceiptForm';
import { StatusChip } from '../components/StatusChip';

const text = 'text-gray-900 dark:text-white';
const muted = 'text-gray-500 dark:text-gray-400';
const peso = (n: number) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');
const pill = (on: boolean) => `min-h-12 justify-center rounded-full border px-4 ${on ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`;
const pillText = (on: boolean) => `font-medium ${on ? 'text-white' : text}`;

export default function ReceiptsScreen() {
  const receipts = useReceipts();
  return <ReceiptsContent key={receipts.userId ?? 'signed-out'} {...receipts} />;
}

function ReceiptsContent({ receipts, photoUrls, loading, error, online, busy, run, refetch, userId }: ReturnType<typeof useReceipts>) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#e5e7eb' : '#111827';
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'soon'>('all');
  // The sheet keeps its last content while it slides out, so closing is `setOpen(false)` and never clears `dialog`.
  const [dialog, setDialog_] = useState<{ id: string | null; editing: boolean }>({ id: null, editing: true });
  const [open, setOpen] = useState(false);
  const setDialog = (next: { id: string | null; editing: boolean } | null) => { if (next) { setDialog_(next); setOpen(true); } else setOpen(false); };
  const today = todayISO();
  const soon = useMemo(() => expiringSoon(receipts, today), [receipts, today]);
  const tags = useMemo(() => tagCounts(receipts), [receipts]);
  const activeTag = tag && tags.some((t) => t.tag === tag) ? tag : null;
  const shown = filterReceipts(view === 'soon' ? soon : receipts, search, activeTag);
  const selected = receipts.find((r) => r.id === dialog.id);
  const filtering = !!search.trim() || !!activeTag;

  const confirmDelete = (receipt: Receipt) => Alert.alert(`Delete the ${receipt.merchant} receipt?`, 'The receipt and its photo will be permanently deleted. This cannot be undone.',
    [{ text: 'Keep it', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await run({ type: 'remove', receipt }); setDialog(null); }
      catch { Alert.alert('Deletion did not finish', 'Retry when connected.'); }
    } }]);

  const renderItem = ({ item }: { item: Receipt }) => <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOut.duration(150)} layout={LinearTransition} className="mb-4">
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.merchant} receipt`} onPress={() => setDialog({ id: item.id, editing: false })}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white active:opacity-80 dark:border-gray-700 dark:bg-gray-800">
      <PhotoImage uri={photoUrls[item.photoPath]} label={`Photo of the ${item.merchant} receipt`} />
      <View className="gap-2 p-4">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className={`flex-1 text-lg font-semibold ${text}`}>{item.merchant}</Text>
          <Text className={`text-lg font-semibold ${text}`}>{peso(item.amount)}</Text>
        </View>
        <Text className={`text-sm ${muted}`}>{date(item.purchasedOn)}</Text>
        <StatusChip receipt={item} today={today} />
        {item.tags.length > 0 && <View className="flex-row flex-wrap gap-1.5">{item.tags.map((t) => <View key={t} className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-gray-700"><Text className={`text-xs font-medium ${text}`}>{t}</Text></View>)}</View>}
      </View>
    </Pressable>
  </Animated.View>;

  return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/(app)/dashboard')} className="min-h-12 flex-row items-center gap-2 pr-3">
        <Feather name="arrow-left" size={22} color={iconColor} /><Text className={`font-semibold ${text}`}>Back</Text></Pressable>
      <Text className={`text-lg font-bold ${text}`}>Receipts</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Add receipt" disabled={!online || !userId || busy} onPress={() => setDialog({ id: null, editing: true })}
        className={`min-h-12 flex-row items-center gap-1 pl-3 ${online ? '' : 'opacity-40'}`}><Feather name="plus" size={20} color="#4f46e5" /><Text className="font-semibold text-indigo-600 dark:text-indigo-400">Add</Text></Pressable>
    </View>
    {!online ? <Text className={`p-8 text-center ${muted}`}>Connect to the internet to see your receipts.</Text>
      : <FlatList data={shown} renderItem={renderItem} keyExtractor={(r) => r.id} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled"
        refreshing={loading} onRefresh={() => void refetch()}
        ListHeaderComponent={<View className="mb-4 gap-3">
          <View className="flex-row gap-2">
            <Pressable accessibilityRole="button" accessibilityState={{ selected: view === 'all' }} onPress={() => setView('all')} className={pill(view === 'all')}><Text className={pillText(view === 'all')}>All ({receipts.length})</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: view === 'soon' }} onPress={() => setView('soon')} className={pill(view === 'soon')}><Text className={pillText(view === 'soon')}>Expiring soon ({soon.length})</Text></Pressable>
          </View>
          <TextInput accessibilityLabel="Search receipts" value={search} onChangeText={setSearch} placeholder="Search store, note or tag" placeholderTextColor="#9ca3af" autoCorrect={false}
            className="min-h-12 rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          {tags.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {tags.map(({ tag: t, count }) => <Pressable key={t} accessibilityRole="button" accessibilityState={{ selected: activeTag === t }} onPress={() => setTag(activeTag === t ? null : t)} className={pill(activeTag === t)}>
              <Text className={pillText(activeTag === t)}>{t} ({count})</Text></Pressable>)}
          </ScrollView>}
          {error && <View className="gap-2 rounded-xl border border-red-300 p-4"><Text accessibilityRole="alert" className="text-red-600 dark:text-red-400">Could not load your receipts.</Text>
            <Pressable accessibilityRole="button" onPress={() => void refetch()} className="min-h-12 justify-center"><Text className="font-semibold text-indigo-600 dark:text-indigo-400">Retry</Text></Pressable></View>}
        </View>}
        ListEmptyComponent={loading ? <ActivityIndicator color="#4f46e5" /> : !error ? <View className="items-center gap-3 py-12">
          <Feather name="file-text" size={40} color="#9ca3af" />
          <Text className={`text-lg font-semibold ${text}`}>{filtering ? 'No matching receipts' : view === 'soon' ? 'Nothing is expiring soon' : 'No receipts yet'}</Text>
          <Text className={`text-center ${muted}`}>{filtering ? 'Try a different search or tag.' : view === 'soon' ? 'Warranties and expiry dates within 30 days show up here.' : 'Take a photo of a receipt to keep it safe.'}</Text>
          {!filtering && view === 'all' && <Pressable accessibilityRole="button" className="mt-2 min-h-12 justify-center rounded-xl bg-indigo-600 px-5" onPress={() => setDialog({ id: null, editing: true })}><Text className="font-semibold text-white">Add your first receipt</Text></Pressable>}
        </View> : null} />}

    <Modal visible={open && online && !!userId} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { if (!busy) setDialog(null); }}>
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-row items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-800">
          <View className="flex-1"><Text className={`text-lg font-semibold ${text}`}>{dialog.editing ? selected ? 'Edit receipt' : 'Add receipt' : selected?.merchant ?? 'Receipt unavailable'}</Text>
            {selected && !dialog.editing && <Text className={`text-sm ${muted}`}>{date(selected.purchasedOn)} · {peso(selected.amount)}</Text>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" disabled={busy} className="min-h-12 flex-row items-center gap-1 px-3"
            onPress={() => selected && dialog.editing ? setDialog({ id: selected.id, editing: false }) : setDialog(null)}>
            <Feather name="x" size={20} color={iconColor} /><Text className={`font-semibold ${text}`}>{selected && dialog.editing ? 'Cancel' : 'Close'}</Text></Pressable>
        </View>
        {dialog.editing ? <ReceiptForm key={dialog.id ?? 'new'} receipt={selected} existingPhotoUrl={selected && photoUrls[selected.photoPath]} knownTags={tags.map((t) => t.tag)} busy={busy}
          onSave={async (value, photo) => { const saved = await run({ type: 'save', id: dialog.id, input: value, photo }) as Receipt; setDialog({ id: saved.id, editing: false }); }} />
          : selected ? <>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <PhotoImage uri={photoUrls[selected.photoPath]} label={`Photo of the ${selected.merchant} receipt`} contain aspectRatio={3 / 4} />
              <StatusChip receipt={selected} today={today} />
              {([['Warranty ends', selected.warrantyEndsOn], ['Expires', selected.expiresOn]] as const).map(([label, d]) => <View key={label} className="flex-row justify-between">
                <Text className={muted}>{label}</Text><Text className={text}>{d ? date(d) : 'Not set'}</Text></View>)}
              {selected.tags.length > 0 && <View className="flex-row justify-between"><Text className={muted}>Tags</Text><Text className={`flex-1 pl-4 text-right ${text}`}>{selected.tags.join(', ')}</Text></View>}
              {selected.note ? <Text className={`rounded-xl bg-gray-100 p-3 dark:bg-gray-800 ${text}`}>{selected.note}</Text> : null}
            </ScrollView>
            <View className="flex-row items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => confirmDelete(selected)} className="min-h-12 justify-center px-3"><Text className="font-semibold text-red-600 dark:text-red-400">{busy ? 'Working…' : 'Delete receipt'}</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setDialog({ id: selected.id, editing: true })} className="min-h-12 justify-center rounded-xl border border-gray-300 px-4 dark:border-gray-600"><Text className={`font-semibold ${text}`}>Edit receipt</Text></Pressable>
            </View>
          </> : <Text className={`p-6 ${muted}`}>Close this and try again.</Text>}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
