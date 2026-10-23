import { type ReactNode, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardSafe } from '@/modules/shared/components/KeyboardSafe';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CATEGORY_COLORS, breakdown, centavosToInput, filterTransactions, formatPesos, manilaToday, monthLabel, monthOf,
  parsePesos, percentLabel, shiftMonth, summarize, transactionSchema } from '@himan/shared/finances';
import type { FinanceCategory, FinanceKind, FinanceTransaction } from '@himan/shared/finances';
import { useFinances } from '../hooks/useFinances';
import { useProgress } from '../components/useProgress';
import { Donut } from '../components/Donut';

const inputClass = 'rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white';
const textClass = 'text-gray-900 dark:text-white';
const mutedClass = 'text-gray-500 dark:text-gray-400';
const GREEN = '#16a34a';
const ROSE = '#e11d48';

const toDate = (iso: string) => new Date(`${iso}T12:00:00`);
const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (iso: string) => toDate(iso).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

function Total({ label, centavos, color, progress }: { label: string; centavos: number; color?: string; progress: number }) {
  return <View className="min-w-[30%] flex-1 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
    <Text className={`text-xs font-medium ${mutedClass}`}>{label}</Text>
    <Text accessibilityLabel={`${label} ${formatPesos(centavos)}`} adjustsFontSizeToFit numberOfLines={1}
      className={`mt-1 text-lg font-bold ${color ? '' : textClass}`} style={color ? { color } : undefined}>
      {formatPesos(Math.round(centavos * progress))}</Text>
  </View>;
}

function TransactionForm({ transaction, categories, defaultDate, busy, onSave }: {
  transaction?: FinanceTransaction; categories: FinanceCategory[]; defaultDate: string; busy: boolean;
  onSave: (input: ReturnType<typeof transactionSchema.parse>) => Promise<void>;
}) {
  const [kind, setKind] = useState<FinanceKind>(transaction?.kind ?? 'expense');
  const [amount, setAmount] = useState(transaction ? centavosToInput(transaction.amountCentavos) : '');
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.categoryId ?? null);
  const [date, setDate] = useState(transaction?.occurredOn ?? defaultDate);
  const [note, setNote] = useState(transaction?.note ?? '');
  const [picker, setPicker] = useState(false);
  const [error, setError] = useState('');
  const chip = (active: boolean) => `min-h-12 justify-center rounded-xl px-4 py-3 active:opacity-70 ${active ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-800'}`;
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View className="flex-row gap-2">
        {(['expense', 'income'] as const).map((k) => <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: kind === k }}
          onPress={() => { setKind(k); setCategoryId(null); }}
          className={`min-h-12 flex-1 items-center justify-center rounded-xl border active:opacity-70 ${kind !== k ? 'border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800' : k === 'income' ? 'border-green-600 bg-green-600' : 'border-rose-600 bg-rose-600'}`}>
          <Text className={kind === k ? 'font-semibold text-white' : `font-semibold ${textClass}`}>{k === 'income' ? 'Income' : 'Expense'}</Text>
        </Pressable>)}
      </View>
      <View><Text className={`mb-2 text-sm font-semibold ${textClass}`}>Amount (₱)</Text>
        <TextInput accessibilityLabel="Amount" className={`${inputClass} text-xl`} keyboardType="decimal-pad" value={amount} onChangeText={setAmount}
          placeholder="0.00" placeholderTextColor="#9ca3af" /></View>
      <View><Text className={`mb-2 text-sm font-semibold ${textClass}`}>Category</Text>
        <View className="flex-row flex-wrap gap-2">
          {[{ id: null, name: 'Uncategorized' }, ...categories.filter((c) => c.kind === kind)].map((c) => <Pressable key={c.id ?? 'none'} accessibilityRole="button"
            accessibilityState={{ selected: categoryId === c.id }} onPress={() => setCategoryId(c.id)} className={chip(categoryId === c.id)}>
            <Text className={categoryId === c.id ? 'text-white' : textClass}>{c.name}</Text></Pressable>)}
        </View></View>
      <View><Text className={`mb-2 text-sm font-semibold ${textClass}`}>Date</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Date ${dayLabel(date)}. Change`} onPress={() => setPicker(true)} className={inputClass}>
          <Text className={textClass}>{dayLabel(date)}</Text></Pressable>
        {picker && <DateTimePicker value={toDate(date)} mode="date" maximumDate={new Date()} onChange={(_, d) => { setPicker(Platform.OS === 'ios'); if (d) setDate(toIso(d)); }} />}</View>
      <View><Text className={`mb-2 text-sm font-semibold ${textClass}`}>Note (optional)</Text>
        <TextInput accessibilityLabel="Note" className={inputClass} value={note} onChangeText={setNote} maxLength={200} placeholder="e.g. Lunch at the market" placeholderTextColor="#9ca3af" /></View>
      {error ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} className={`items-center rounded-xl bg-indigo-600 px-4 py-4 ${busy ? 'opacity-50' : ''}`}
        onPress={async () => {
          let amountCentavos: number;
          try { amountCentavos = parsePesos(amount); } catch (e) { setError((e as Error).message); return; }
          const result = transactionSchema.safeParse({ kind, amountCentavos, occurredOn: date, note, categoryId });
          if (!result.success) { setError(result.error.issues[0].message); return; }
          setError('');
          try { await onSave(result.data); } catch { setError('Could not save. Your changes are still here; try again.'); }
        }}><Text className="font-semibold text-white">{busy ? 'Saving…' : 'Save'}</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

/**
 * The bottom sheet a tappable row opens, with Edit, Delete and Cancel. The chosen action runs once the sheet has
 * closed: iOS will not present another modal or an alert while this one is still animating away.
 */
function RowActions<T>({ item, title, subtitle, trailing, onEdit, onDelete, onClose }: {
  item: T | null; title: string; subtitle?: string; trailing?: ReactNode;
  onEdit: (item: T) => void; onDelete: (item: T) => void; onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const pending = useRef<(() => void) | null>(null);
  const runPending = () => { const next = pending.current; pending.current = null; next?.(); };
  const choose = (next: () => void) => {
    pending.current = next;
    onClose();
    if (Platform.OS !== 'ios') runPending();
  };
  return <Modal visible={item !== null} transparent animationType="slide" onRequestClose={onClose} onDismiss={runPending}>
    <Pressable accessibilityRole="button" accessibilityLabel="Close" className="flex-1 justify-end bg-black/40" onPress={onClose}>
      {item !== null && <Pressable className="gap-3 rounded-t-3xl bg-white dark:bg-gray-800 px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="mb-1 h-1.5 w-10 self-center rounded-full bg-gray-300 dark:bg-gray-600" />
        <View className="flex-row items-center justify-between gap-3 px-1">
          <View className="flex-1">
            <Text className={`text-lg font-semibold ${textClass}`}>{title}</Text>
            {subtitle ? <Text className={`text-sm ${mutedClass}`}>{subtitle}</Text> : null}
          </View>
          {trailing}
        </View>
        <Pressable accessibilityRole="button" className="min-h-14 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 active:bg-indigo-700"
          onPress={() => choose(() => onEdit(item))}>
          <Feather accessible={false} name="edit-2" size={18} color="#fff" /><Text className="text-base font-semibold text-white">Edit</Text></Pressable>
        <Pressable accessibilityRole="button" className="min-h-14 flex-row items-center justify-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 active:bg-red-100"
          onPress={() => choose(() => onDelete(item))}>
          <Feather accessible={false} name="trash-2" size={18} color={ROSE} /><Text className="text-base font-semibold text-red-600 dark:text-red-400">Delete</Text></Pressable>
        <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl" onPress={onClose}>
          <Text className={`text-base font-semibold ${mutedClass}`}>Cancel</Text></Pressable>
      </Pressable>}
    </Pressable>
  </Modal>;
}

function CategoriesSheet({ categories, busy, onSave, onDelete }: {
  categories: FinanceCategory[]; busy: boolean;
  onSave: (id: string | null, input: { kind: FinanceKind; name: string; color: string }) => Promise<void>;
  onDelete: (category: FinanceCategory) => void;
}) {
  const [kind, setKind] = useState<FinanceKind>('expense');
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[6]);
  const [editing, setEditing] = useState<{ id: string; kind: FinanceKind; name: string; color: string } | null>(null);
  // Which form the last save error belongs to: 'new', or the id of the category being edited.
  const [error, setError] = useState<{ form: string; message: string } | null>(null);
  const [actions, setActions] = useState<FinanceCategory | null>(null);
  const [adding, setAdding] = useState(false);
  const insets = useSafeAreaInsets();
  const closeAdding = () => { setAdding(false); setName(''); if (error?.form === 'new') setError(null); };
  const submit = async (id: string | null, input: { kind: FinanceKind; name: string; color: string }, done: () => void) => {
    try { setError(null); await onSave(id, input); done(); }
    catch (e) { setError({ form: id ?? 'new', message: e instanceof Error ? e.message : 'Could not save' }); }
  };
  const nameField = (form: string, value: string, onChange: (v: string) => void) => {
    const message = error?.form === form ? error.message : '';
    return <View className="gap-1.5">
      <Text className={`text-sm font-semibold ${textClass}`}>Name</Text>
      <TextInput accessibilityLabel="Category name" accessibilityHint={message || undefined} value={value} maxLength={40}
        onChangeText={(v) => { onChange(v); if (message) setError(null); }} placeholder="e.g. Pets" placeholderTextColor="#9ca3af"
        className={`${inputClass} ${message ? 'border-red-500 dark:border-red-400' : ''}`} />
      {message ? <Text accessibilityRole="alert" className="text-sm text-red-600 dark:text-red-400">{message}</Text> : null}
    </View>;
  };
  const colorField = (value: string, set: (c: string) => void) => <View className="gap-1.5">
    <Text className={`text-sm font-semibold ${textClass}`}>Color</Text>
    <View className="flex-row flex-wrap gap-3">
      {CATEGORY_COLORS.map((c) => <Pressable key={c} accessibilityRole="button" accessibilityLabel={`Color ${c}`} accessibilityState={{ selected: value === c }}
        onPress={() => set(c)} className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: c }}>
        {value === c ? <Feather accessible={false} name="check" size={20} color="#fff" /> : null}
      </Pressable>)}
    </View>
  </View>;
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 16 }}>
    <Text className={mutedClass}>Removing a category keeps its transactions as Uncategorized.</Text>
    <View className="flex-row justify-end">
      <Pressable accessibilityRole="button" onPress={() => { setError(null); setAdding(true); }}
        className="min-h-12 flex-row items-center gap-2 rounded-xl bg-indigo-600 px-4 active:bg-indigo-700">
        <Feather accessible={false} name="plus" size={18} color="#fff" /><Text className="font-semibold text-white">Add category</Text></Pressable>
    </View>
    {(['expense', 'income'] as const).map((k) => <View key={k} className="gap-2">
      <Text className={`text-sm font-semibold uppercase ${mutedClass}`}>{k === 'expense' ? 'Expenses' : 'Income'}</Text>
      {categories.filter((c) => c.kind === k).map((c) => <View key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        {editing?.id === c.id ? <View className="gap-4">
          {nameField(c.id, editing.name, (v) => setEditing({ ...editing, name: v }))}
          {colorField(editing.color, (v) => setEditing({ ...editing, color: v }))}
          <View className="flex-row gap-2">
            <Pressable accessibilityRole="button" disabled={busy} className="min-h-12 flex-1 items-center justify-center rounded-xl bg-indigo-600" onPress={() => void submit(c.id, editing, () => setEditing(null))}><Text className="font-semibold text-white">Save</Text></Pressable>
            <Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700" onPress={() => { setEditing(null); setError(null); }}><Text className={textClass}>Cancel</Text></Pressable>
          </View>
        </View> : <Pressable accessibilityRole="button" accessibilityLabel={c.name} accessibilityHint="Opens edit and delete"
          onPress={() => setActions(c)} className="min-h-12 flex-row items-center gap-3">
          <View className="h-4 w-4 rounded-full" style={{ backgroundColor: c.color }} />
          <Text className={`flex-1 text-base ${textClass}`}>{c.name}</Text>
          <Feather accessible={false} name="chevron-right" size={20} color="#9ca3af" />
        </Pressable>}
      </View>)}
    </View>)}
    <Modal visible={adding} transparent animationType="slide" onRequestClose={closeAdding}>
      <KeyboardSafe>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" className="flex-1 justify-end bg-black/40" onPress={closeAdding}>
          <Pressable className="rounded-t-3xl bg-white dark:bg-gray-800" style={{ maxHeight: '90%' }}>
            <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 20, paddingTop: 12, gap: 20, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
              <View className="h-1.5 w-10 self-center rounded-full bg-gray-300 dark:bg-gray-600" />
              <Text className={`text-lg font-semibold ${textClass}`}>New category</Text>
              <View className="flex-row gap-2">
                {(['expense', 'income'] as const).map((k) => <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: kind === k }} onPress={() => setKind(k)}
                  className={`min-h-12 flex-1 items-center justify-center rounded-xl ${kind === k ? 'bg-indigo-600' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  <Text className={kind === k ? 'font-semibold text-white' : textClass}>{k === 'income' ? 'Income' : 'Expense'}</Text></Pressable>)}
              </View>
              {nameField('new', name, setName)}
              {colorField(color, setColor)}
              <View className="gap-2">
                <Pressable accessibilityRole="button" disabled={busy} className="min-h-14 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 active:bg-indigo-700"
                  onPress={() => void submit(null, { kind, name, color }, closeAdding)}>
                  <Feather accessible={false} name="plus" size={18} color="#fff" /><Text numberOfLines={1} className="text-base font-semibold text-white">Add category</Text></Pressable>
                <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl" onPress={closeAdding}>
                  <Text className={`text-base font-semibold ${mutedClass}`}>Cancel</Text></Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardSafe>
    </Modal>
    <RowActions item={actions} title={actions?.name ?? ''} subtitle={actions ? (actions.kind === 'income' ? 'Income category' : 'Expense category') : ''}
      trailing={actions ? <View className="h-5 w-5 rounded-full" style={{ backgroundColor: actions.color }} /> : null}
      onClose={() => setActions(null)}
      onEdit={(c) => { setError(null); setEditing({ id: c.id, kind: c.kind, name: c.name, color: c.color }); }} onDelete={onDelete} />
  </ScrollView>;
}

export default function FinancesScreen() {
  const today = manilaToday();
  const [month, setMonth] = useState(monthOf(today));
  const finances = useFinances(month);
  return <FinancesContent key={finances.userId ?? 'signed-out'} month={month} setMonth={setMonth} today={today} {...finances} />;
}

function FinancesContent({ month, setMonth, today, userId, categories, transactions, loading, error, refetch, busy, run }:
  ReturnType<typeof useFinances> & { month: string; setMonth: (m: string) => void; today: string }) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const dark = colorScheme === 'dark';
  const iconColor = dark ? '#e5e7eb' : '#111827';
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<{ transaction?: FinanceTransaction } | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [actions, setActions] = useState<FinanceTransaction | null>(null);
  const totals = useMemo(() => summarize(transactions), [transactions]);
  const rows = useMemo(() => breakdown(transactions, categories), [transactions, categories]);
  const visible = useMemo(() => filterTransactions(transactions, categories, search), [transactions, categories, search]);
  const names = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const progress = useProgress(`${month}:${totals.income}:${totals.expense}`);
  const atLatest = month >= monthOf(today);

  const confirm = (title: string, message: string, action: Parameters<typeof run>[0]) => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => void run(action).catch(() => Alert.alert('Could not delete', 'Try again.')) },
  ]);

  const header = <View className="mb-4 gap-4">
    <View className="flex-row items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
      <Pressable accessibilityRole="button" className="min-h-12 flex-row items-center gap-1 px-3" onPress={() => setMonth(shiftMonth(month, -1))}>
        <Feather accessible={false} name="chevron-left" size={18} color={iconColor} /><Text className={textClass}>Previous</Text></Pressable>
      <Text accessibilityLiveRegion="polite" className={`text-base font-semibold ${textClass}`}>{monthLabel(month)}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: atLatest }} disabled={atLatest} className={`min-h-12 flex-row items-center gap-1 px-3 ${atLatest ? 'opacity-40' : ''}`}
        onPress={() => setMonth(shiftMonth(month, 1))}><Text className={textClass}>Next</Text><Feather accessible={false} name="chevron-right" size={18} color={iconColor} /></Pressable>
    </View>
    {error ? <View className="gap-3 rounded-xl border border-red-300 p-4"><Text accessibilityRole="alert" className="text-red-600 dark:text-red-400">Could not load your finances.</Text>
      <Pressable accessibilityRole="button" onPress={refetch} className="py-2"><Text className="font-semibold text-indigo-600 dark:text-indigo-400">Retry</Text></Pressable></View> : null}
    <View className="flex-row gap-2">
      <Total label="Money in" centavos={totals.income} color={GREEN} progress={progress} />
      <Total label="Money out" centavos={totals.expense} color={ROSE} progress={progress} />
      <Total label="Left over" centavos={totals.balance} color={totals.balance < 0 ? ROSE : undefined} progress={progress} />
    </View>
    {rows.length > 0 && <View className="items-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <View className="items-center justify-center">
        <Donut rows={rows} progress={progress} trackColor={dark ? '#374151' : '#e5e7eb'} />
        <View className="absolute items-center"><Text className={`text-xs ${mutedClass}`}>Spent</Text><Text className={`font-bold ${textClass}`}>{formatPesos(totals.expense)}</Text></View>
      </View>
      <View className="w-full gap-3">
        {rows.map((row) => <View key={row.categoryId ?? 'none'}>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2"><View className="h-3 w-3 rounded-full" style={{ backgroundColor: row.color }} /><Text numberOfLines={1} className={`flex-1 ${textClass}`}>{row.name}</Text></View>
            <Text className={textClass}>{formatPesos(row.total)} <Text className={`text-xs ${mutedClass}`}>{percentLabel(row.share)}</Text></Text>
          </View>
          <View className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"><View className="h-full rounded-full" style={{ backgroundColor: row.color, width: `${row.share * 100 * progress}%` }} /></View>
        </View>)}
      </View>
    </View>}
    <TextInput accessibilityLabel="Search transactions" className={inputClass} value={search} onChangeText={setSearch} placeholder="Search notes or categories" placeholderTextColor="#9ca3af" autoCorrect={false} />
  </View>;

  const renderItem = ({ item: t, index }: { item: FinanceTransaction; index: number }) => {
    const category = t.categoryId ? names.get(t.categoryId) : undefined;
    const name = category?.name ?? 'Uncategorized';
    return <View>
      {(index === 0 || visible[index - 1].occurredOn !== t.occurredOn) && <Text className={`mb-2 mt-3 text-sm font-semibold ${mutedClass}`}>{dayLabel(t.occurredOn)}</Text>}
      <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${t.kind === 'income' ? 'income' : 'expense'} ${formatPesos(t.amountCentavos)}`}
        accessibilityHint="Opens edit and delete" onPress={() => setActions(t)}
        className="mb-2 flex-row items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 active:bg-gray-100 dark:active:bg-gray-700">
        <View className="h-10 w-1.5 rounded-full" style={{ backgroundColor: category?.color ?? '#94a3b8' }} />
        <View className="flex-1"><Text className={`text-base font-medium ${textClass}`}>{name}</Text>{t.note ? <Text numberOfLines={1} className={`text-sm ${mutedClass}`}>{t.note}</Text> : null}</View>
        <Text className="text-lg font-bold" style={{ color: t.kind === 'income' ? GREEN : ROSE }}>
          {t.kind === 'income' ? '+' : '−'}{formatPesos(t.amountCentavos)}</Text>
        <Feather accessible={false} name="chevron-right" size={20} color="#9ca3af" />
      </Pressable>
    </View>;
  };

  const sheetHeader = (title: string, onClose: () => void) => <View className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
    <Text className={`text-lg font-semibold ${textClass}`}>{title}</Text>
    <Pressable accessibilityRole="button" className="min-h-12 justify-center px-3" onPress={onClose}><Text className="font-semibold text-indigo-600 dark:text-indigo-400">Close</Text></Pressable>
  </View>;

  return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <View className="flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-3">
      <Pressable accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/(app)/dashboard')} className="p-3"><Feather name="arrow-left" size={22} color={iconColor} /></Pressable>
      <Text className={`text-lg font-bold ${textClass}`}>Finances</Text>
      <Pressable accessibilityRole="button" onPress={() => setCategoriesOpen(true)} className="min-h-12 justify-center px-3"><Text className="font-semibold text-indigo-600 dark:text-indigo-400">Categories</Text></Pressable>
    </View>
    <FlatList data={visible} renderItem={renderItem} keyExtractor={(t) => t.id} contentContainerStyle={{ padding: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled"
      refreshing={loading} onRefresh={refetch} ListHeaderComponent={header}
      ListEmptyComponent={loading ? <ActivityIndicator color="#4f46e5" /> : !error ? <View className="items-center gap-3 py-10">
        <Feather name="dollar-sign" size={40} color="#9ca3af" />
        <Text className={`text-lg font-semibold ${textClass}`}>{search ? 'Nothing matches your search' : `No transactions in ${monthLabel(month)}`}</Text>
        <Text className={`text-center ${mutedClass}`}>{search ? 'Try a different word.' : 'Add what you earned or spent to see your totals.'}</Text>
      </View> : null} />
    <View className="absolute inset-x-0 bottom-0 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
      <Pressable accessibilityRole="button" disabled={!userId} className="min-h-14 flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600" onPress={() => setEditor({})}>
        <Feather accessible={false} name="plus" size={20} color="#fff" /><Text className="text-base font-semibold text-white">Add transaction</Text></Pressable>
    </View>

    <Modal visible={!!editor} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditor(null)}>
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        {sheetHeader(editor?.transaction ? 'Edit transaction' : 'Add transaction', () => setEditor(null))}
        {editor && <TransactionForm key={editor.transaction?.id ?? 'new'} transaction={editor.transaction} categories={categories} busy={busy}
          defaultDate={month === monthOf(today) ? today : `${month}-01`}
          onSave={async (input) => {
            await run({ type: 'saveTransaction', id: editor.transaction?.id ?? null, input });
            if (input.occurredOn.slice(0, 7) !== month) setMonth(input.occurredOn.slice(0, 7));
            setEditor(null);
          }} />}
      </SafeAreaView>
    </Modal>
    <RowActions item={actions} onClose={() => setActions(null)}
      title={actions ? (actions.categoryId ? names.get(actions.categoryId)?.name ?? 'Uncategorized' : 'Uncategorized') : ''}
      subtitle={actions ? `${dayLabel(actions.occurredOn)}${actions.note ? ` · ${actions.note}` : ''}` : ''}
      trailing={actions ? <Text className="text-lg font-bold" style={{ color: actions.kind === 'income' ? GREEN : ROSE }}>
        {actions.kind === 'income' ? '+' : '−'}{formatPesos(actions.amountCentavos)}</Text> : null}
      onEdit={(t) => setEditor({ transaction: t })}
      onDelete={(t) => confirm('Delete this transaction?', 'This cannot be undone.', { type: 'deleteTransaction', id: t.id })} />
    <Modal visible={categoriesOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCategoriesOpen(false)}>
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        {sheetHeader('Categories', () => setCategoriesOpen(false))}
        <CategoriesSheet categories={categories} busy={busy} onSave={(id, input) => run({ type: 'saveCategory', id, input })}
          onDelete={(c) => confirm(`Delete ${c.name}?`, 'Its transactions stay, as Uncategorized.', { type: 'deleteCategory', id: c.id })} />
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}
