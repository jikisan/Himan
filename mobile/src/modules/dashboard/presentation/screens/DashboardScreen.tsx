import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { groupByLetter } from '@himan/shared/dashboard';
import type { BadgeCounts, DashboardAppId, DashboardLayout } from '@himan/shared/dashboard';
import { useToast } from '@/modules/shared/components/useToast';
import { useDashboardApps } from '../hooks/useDashboardApps';
import type { MobileApp } from './appCatalog';

const text = 'text-gray-900 dark:text-white';
const muted = 'text-gray-500 dark:text-gray-400';

function AppIcon({ app, size = 'lg' }: { app: MobileApp; size?: 'sm' | 'lg' }) {
  const lg = size === 'lg';
  return <View accessible={false} style={{ backgroundColor: app.color }}
    className={`items-center justify-center ${lg ? 'h-16 w-16 rounded-2xl' : 'h-9 w-9 rounded-lg'}`}>
    <Feather name={app.icon} size={lg ? 30 : 18} color="#fff" />
  </View>;
}

function Button({ label, icon, onPress, primary, disabled, grow }: {
  label: string; icon?: React.ComponentProps<typeof Feather>['name']; onPress(): void; primary?: boolean; disabled?: boolean; grow?: boolean;
}) {
  const { colorScheme } = useColorScheme();
  const color = primary ? '#fff' : colorScheme === 'dark' ? '#e5e7eb' : '#111827';
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-70 ${grow ? 'flex-1' : ''} ${disabled ? 'opacity-50' : ''}
      ${primary ? 'bg-indigo-600' : 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}>
    {icon && <Feather accessible={false} name={icon} size={18} color={color} />}
    <Text className={`text-base font-semibold ${primary ? 'text-white' : text}`}>{label}</Text>
  </Pressable>;
}

function AppGrid({ apps, badges, onOpen }: { apps: MobileApp[]; badges: BadgeCounts; onOpen(app: MobileApp): void }) {
  const reduce = useReducedMotion();
  return <View className="flex-row flex-wrap gap-y-6">
    {apps.map((app) => {
      const count = badges[app.id] ?? 0;
      return <Pressable key={app.id} accessibilityRole="link" onPress={() => onOpen(app)}
        accessibilityLabel={count ? `${app.label}, ${count} need${count === 1 ? 's' : ''} attention` : app.label}
        className="w-1/3 items-center gap-2 rounded-2xl p-2 active:opacity-70">
        <View>
          <AppIcon app={app} />
          {count > 0 && <Animated.View entering={reduce ? undefined : ZoomIn.springify()}
            className="absolute -right-2 -top-2 h-6 min-w-6 items-center justify-center rounded-full border-2 border-gray-50 bg-red-600 px-1.5 dark:border-gray-900">
            <Text className="text-xs font-bold text-white">{count > 99 ? '99+' : count}</Text>
          </Animated.View>}
        </View>
        <Text className={`text-center text-base ${text}`}>{app.label}</Text>
      </Pressable>;
    })}
  </View>;
}

const LAYOUT_OPTIONS: { value: DashboardLayout; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { value: 'letters', label: 'A–Z', icon: 'list' },
  { value: 'grid', label: 'Grid', icon: 'grid' },
];

/** Two-way switch between letter groups and one plain grid. */
function ViewToggle({ layout, onChange }: { layout: DashboardLayout; onChange(next: DashboardLayout): void }) {
  const { colorScheme } = useColorScheme();
  return <View accessibilityRole="radiogroup" accessibilityLabel="View"
    className="min-h-12 flex-row rounded-xl border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-800">
    {LAYOUT_OPTIONS.map(({ value, label, icon }) => {
      const on = layout === value;
      return <Pressable key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }}
        onPress={() => onChange(value)} className={`flex-row items-center gap-1.5 rounded-lg px-3 active:opacity-70 ${on ? 'bg-indigo-600' : ''}`}>
        <Feather accessible={false} name={icon} size={16} color={on ? '#fff' : colorScheme === 'dark' ? '#e5e7eb' : '#111827'} />
        <Text className={`text-base font-semibold ${on ? 'text-white' : text}`}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}

/** The phone's home: a grid of the apps the user keeps here, the same choice as the web dashboard. */
export default function DashboardScreen() {
  const router = useRouter();
  const { available, visible, hidden, saving, save, badges, layout, saveLayout, name } = useDashboardApps();
  const { showToast, ToastView } = useToast();
  const [customizing, setCustomizing] = useState(false);
  const groups = groupByLetter(visible);
  const lettered = layout === 'letters' && visible.length > 0;
  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const jump = (letter: string) => scroll.current?.scrollTo({ y: offsets.current[letter] ?? 0, animated: false });
  const open = (app: MobileApp) => router.push(app.route as never);
  const changeLayout = (next: DashboardLayout) => {
    if (next !== layout) saveLayout(next).catch(() => showToast('Couldn’t save your view. It will reset next time you sign in.', 'error'));
  };
  // The scroll view's children are flat so each letter heading can stick to the top while its apps scroll under it.
  const body = !visible.length ? [<View key="empty" className="items-center gap-3 rounded-3xl border border-dashed border-gray-300 p-8 dark:border-gray-600">
    <Text className={`text-base font-semibold ${text}`}>Your dashboard is empty</Text>
    <Text className={`text-center ${muted}`}>Every app is hidden. Choose which ones to show here.</Text>
    <Button primary label="Choose apps" onPress={() => setCustomizing(true)} />
  </View>] : layout === 'grid' ? [<View key="grid" accessibilityLabel="Apps"><AppGrid apps={groups.flatMap((g) => g.apps)} badges={badges} onOpen={open} /></View>]
    : groups.flatMap(({ letter, apps }) => [
      <View key={`h-${letter}`} onLayout={(e) => { offsets.current[letter] = e.nativeEvent.layout.y; }} className="bg-gray-50 pt-2 dark:bg-gray-900">
        <Text accessibilityRole="header" className={`border-b border-gray-200 pb-1 text-lg font-semibold dark:border-gray-700 ${text}`}>{letter}</Text>
      </View>,
      <View key={`g-${letter}`} className="mb-4 mt-2"><AppGrid apps={apps} badges={badges} onOpen={open} /></View>,
    ]);
  const HEADER_CHILDREN = 2;
  const sticky = lettered ? groups.map((_, i) => HEADER_CHILDREN + i * 2) : undefined;
  return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
    <ScrollView ref={scroll} stickyHeaderIndices={sticky} contentContainerStyle={{ padding: 20, paddingRight: lettered ? 36 : 20, paddingBottom: 48 }}>
      <View className="flex-row justify-end">
        <Button icon="settings" label="Settings" onPress={() => router.push('/(app)/settings')} />
      </View>
      <View className="mb-6 mt-2 items-center">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-400">
          <Text className="text-3xl font-semibold uppercase text-white">{name[0]}</Text></View>
        <Text accessibilityRole="header" className={`text-center text-3xl font-semibold ${text}`}>Welcome back, {name}</Text>
        <Text className={`mt-1 text-center text-base ${muted}`}>Everything in Himan, at a glance.</Text>
        <View className="mt-4 flex-row flex-wrap justify-center gap-2">
          <Button icon="sliders" label="Customize" onPress={() => setCustomizing(true)} />
          <ViewToggle layout={layout} onChange={changeLayout} />
        </View>
      </View>
      {body}
    </ScrollView>
    {lettered && groups.length > 1 && <LetterBar letters={groups.map((g) => g.letter)} onLetter={jump} />}
    <Modal visible={customizing} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCustomizing(false)}>
      {customizing && <Customize apps={available} hidden={hidden} saving={saving} onCancel={() => setCustomizing(false)}
        onSave={async (next) => { await save(next); setCustomizing(false); showToast('Dashboard updated'); }} />}
    </Modal>
    {ToastView}
  </SafeAreaView>;
}

/**
 * The contacts-style index on the right edge: tap or drag along it to jump to a letter, which shows large in the middle while
 * the finger is down. Each letter is also its own button for screen readers.
 */
function LetterBar({ letters, onLetter }: { letters: string[]; onLetter(letter: string): void }) {
  const reduce = useReducedMotion();
  const bar = useRef<View>(null);
  const top = useRef(0);
  const [active, setActive] = useState<string | null>(null);
  const ROW = 28;
  const pick = (pageY: number) => {
    const letter = letters[Math.min(letters.length - 1, Math.max(0, Math.floor((pageY - top.current) / ROW)))];
    if (letter !== active) { setActive(letter); onLetter(letter); }
  };
  return <>
    <View pointerEvents="box-none" className="absolute bottom-0 right-0 top-0 justify-center">
      <View ref={bar} onLayout={() => bar.current?.measureInWindow((_x, y) => { top.current = y + 4; })}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.pageY)} onResponderMove={(e) => pick(e.nativeEvent.pageY)}
        onResponderRelease={() => setActive(null)} onResponderTerminate={() => setActive(null)}
        className="mr-1 rounded-full bg-white/80 py-1 dark:bg-gray-800/80">
        {letters.map((letter) => <View key={letter} accessible accessibilityRole="button" accessibilityLabel={`Jump to ${letter}`}
          onAccessibilityTap={() => onLetter(letter)} style={{ height: ROW }} className="w-8 items-center justify-center">
          <Text className={`text-sm font-bold ${active === letter ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{letter}</Text>
        </View>)}
      </View>
    </View>
    {active && <Animated.View pointerEvents="none" entering={reduce ? undefined : ZoomIn.duration(150)} exiting={reduce ? undefined : FadeOut.duration(120)}
      className="absolute inset-0 items-center justify-center">
      <Animated.View key={active} entering={reduce ? undefined : FadeIn.duration(100)}
        className="h-24 w-24 items-center justify-center rounded-3xl bg-indigo-600/90">
        <Text className="text-5xl font-bold text-white">{active}</Text>
      </Animated.View>
    </Animated.View>}
  </>;
}

/** Edits a draft of the hidden apps; nothing is saved until Save. Apps only on the web keep whatever was chosen there. */
function Customize({ apps, hidden, saving, onSave, onCancel }: {
  apps: MobileApp[]; hidden: DashboardAppId[]; saving: boolean; onSave(next: DashboardAppId[]): Promise<void>; onCancel(): void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(hidden);
  const [error, setError] = useState('');
  const mobileHidden = apps.filter((a) => draft.includes(a.id));
  return <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-gray-50 dark:bg-gray-900" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
    <View className="gap-1 border-b border-gray-200 p-5 dark:border-gray-800">
      <Text accessibilityRole="header" className={`text-xl font-semibold ${text}`}>Customize dashboard</Text>
      <Text className={muted}>Choose which apps appear on your dashboard. It changes on the web too.</Text>
    </View>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 8 }}>
      {error ? <Text accessibilityRole="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-700">{error}</Text> : null}
      {apps.map((app) => {
        const shown = !draft.includes(app.id);
        return <Pressable key={app.id} accessibilityRole="switch" accessibilityLabel={app.label} accessibilityState={{ checked: shown }}
          onPress={() => setDraft((d) => (shown ? [...d, app.id] : d.filter((x) => x !== app.id)))}
          className="min-h-14 flex-row items-center gap-3 rounded-2xl bg-white px-3 py-2 active:opacity-70 dark:bg-gray-800">
          <AppIcon app={app} size="sm" />
          <Text className={`flex-1 text-base font-semibold ${text}`}>{app.label}</Text>
          <Text className={`text-sm font-semibold ${shown ? 'text-indigo-600 dark:text-indigo-400' : muted}`}>{shown ? 'Shown' : 'Hidden'}</Text>
          <View className={`h-7 w-12 justify-center rounded-full px-0.5 ${shown ? 'items-end bg-indigo-600' : 'items-start bg-gray-300 dark:bg-gray-600'}`}>
            <View className="h-6 w-6 rounded-full bg-white" /></View>
        </Pressable>;
      })}
    </ScrollView>
    <View className="gap-2 border-t border-gray-200 px-5 pt-3 dark:border-gray-800">
      <Button label="Show all" disabled={!mobileHidden.length} onPress={() => setDraft((d) => d.filter((id) => !apps.some((a) => a.id === id)))} />
      <View className="flex-row gap-2">
        <Button grow label="Cancel" onPress={onCancel} />
        <Button grow primary label={saving ? 'Saving…' : 'Save'} disabled={saving} onPress={() => {
          setError('');
          onSave(draft).catch(() => setError('Couldn’t save your dashboard. Check your connection and try again.'));
        }} />
      </View>
    </View>
  </SafeAreaView>;
}
