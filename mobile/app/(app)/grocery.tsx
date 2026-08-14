import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { GrocerySessionRepository } from '@himan/shared/grocery';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { useGroceryLists } from '@/modules/grocery/presentation/hooks/useGroceryLists';
import { useErrandSession } from '@/modules/grocery/presentation/hooks/useErrandSession';
import { groceryKeys } from '@/modules/grocery/presentation/hooks/queryKeys';
import {
  PaperSurface,
  SectionHeading,
  SyncBadge,
} from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export default function GroceryHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const { session } = useErrandSession();
  const [startOpen, setStartOpen] = useState(false);

  const shelves: { label: string; hint: string; icon: keyof typeof Feather.glyphMap; href: string }[] = [
    { label: 'Lists', hint: 'Reusable templates', icon: 'clipboard', href: '/grocery/templates' },
    { label: 'Catalog', hint: 'Products & prices', icon: 'book', href: '/grocery/catalog' },
    { label: 'History', hint: 'Past trips & totals', icon: 'archive', href: '/grocery/history' },
  ];

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-5 pt-8 pb-3">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
              <Feather name="chevron-left" size={22} color={c.ink} />
              <Text className="text-ink dark:text-ink-dark font-serif">Home</Text>
            </Pressable>
            <SyncBadge />
          </View>
          <SectionHeading size="xl" className="mt-8">Shopping Notebook</SectionHeading>
        </View>

        <ScrollView className="flex-1 px-5 mt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {session ? (
            <Pressable
              onPress={() => router.push('/grocery/session')}
              className="rounded-2xl p-4 mb-5 active:opacity-90"
              style={{ backgroundColor: c.sticky }}
            >
              <Text className="text-xs uppercase tracking-wider" style={{ color: c.ink }}>
                Errand in progress
              </Text>
              <Text className="font-hand text-3xl mt-1" style={{ color: c.ink }}>
                {session.name || session.storeName || 'Errand'}
              </Text>
              <View className="flex-row items-center gap-1 mt-1">
                <Text style={{ color: c.ink }}>
                  {session.items.filter((i) => i.isPurchased).length}/{session.items.length} crossed off
                </Text>
                <Feather name="arrow-right" size={16} color={c.ink} />
              </View>
            </Pressable>
          ) : null}

          <View className="flex-row flex-wrap justify-between gap-y-3">
            {shelves.map((s) => (
              <Pressable
                key={s.href}
                onPress={() => router.push(s.href as never)}
                className="w-[48%] rounded-2xl p-4 border border-rule dark:border-rule-dark active:bg-black/5"
              >
                <View
                  className="h-11 w-11 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: `${c.accent}22` }}
                >
                  <Feather name={s.icon} size={20} color={c.accent} />
                </View>
                <Text className="text-lg text-ink dark:text-ink-dark font-serif">{s.label}</Text>
                <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-0.5 font-serif">{s.hint}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {!session ? (
          <View className="px-5" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
            <Pressable
              onPress={() => setStartOpen(true)}
              className="rounded-full py-4 items-center flex-row justify-center gap-2"
              style={{ backgroundColor: c.accent }}
            >
              <Feather name="shopping-cart" size={18} color={colorScheme === 'dark' ? '#201e1d' : '#ffffff'} />
              <Text className="font-semibold text-base" style={{ color: colorScheme === 'dark' ? '#201e1d' : '#ffffff' }}>
                Start an errand
              </Text>
            </Pressable>
          </View>
        ) : null}
      </SafeAreaView>

      <StartErrandModal
        visible={startOpen}
        onClose={() => setStartOpen(false)}
        userId={user?.id ?? ''}
        onStarted={() => {
          setStartOpen(false);
          router.push('/grocery/session');
        }}
        insetsBottom={insets.bottom}
      />
    </PaperSurface>
  );
}

function StartErrandModal({
  visible,
  onClose,
  userId,
  onStarted,
  insetsBottom,
}: {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onStarted: () => void;
  insetsBottom: number;
}) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const queryClient = useQueryClient();
  const { lists } = useGroceryLists();
  const repo = useMemo(() => new GrocerySessionRepository(), []);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [store, setStore] = useState('');
  const [errandName, setErrandName] = useState('');

  const { data: recentStores = [] } = useQuery({
    queryKey: groceryKeys.recentStores(),
    queryFn: () => repo.getRecentStoreNames(userId),
    enabled: !!userId && visible,
  });

  const startMutation = useMutation({
    mutationFn: () =>
      repo.create(
        {
          listIds: Array.from(selected),
          storeName: store.trim(),
          name: errandName.trim() || undefined,
        },
        userId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.recentStores() });
      setSelected(new Set());
      setStore('');
      setErrandName('');
      onStarted();
    },
    onError: () => Alert.alert('Error', 'Failed to start errand'),
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const canStart = store.trim().length > 0 && selected.size > 0;
  const templates = lists.filter((l) => !l.isArchived);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="rounded-t-3xl bg-paper dark:bg-paper-dark px-5 pt-4"
            style={{ paddingBottom: Math.max(insetsBottom, 24), maxHeight: '85%' }}
          >
            <View className="flex-row items-center justify-between mb-2">
              <SectionHeading size="lg">Start an errand</SectionHeading>
              <Pressable onPress={onClose} hitSlop={8}>
                <Feather name="x" size={22} color={c.inkSoft} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mt-2 mb-1 font-serif">
                Store
              </Text>
              <TextInput
                value={store}
                onChangeText={setStore}
                placeholder="Where are you shopping?"
                placeholderTextColor={c.inkSoft}
                className="rounded-xl px-3 py-2.5 border border-rule dark:border-rule-dark text-ink dark:text-ink-dark font-serif"
              />
              {recentStores.length > 0 ? (
                <View className="flex-row flex-wrap gap-2 mt-2">
                  {recentStores.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setStore(s)}
                      className="rounded-full px-3 py-1 border border-rule dark:border-rule-dark"
                    >
                      <Text className="text-xs text-ink-soft dark:text-ink-softdark font-serif">{s}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mt-5 mb-1 font-serif">
                Errand name (optional)
              </Text>
              <TextInput
                value={errandName}
                onChangeText={setErrandName}
                placeholder="e.g. Weekend Shopping"
                placeholderTextColor={c.inkSoft}
                className="rounded-xl px-3 py-2.5 border border-rule dark:border-rule-dark text-ink dark:text-ink-dark font-serif"
              />

              <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mt-5 mb-1 font-serif">
                Lists to shop
              </Text>
              {templates.length === 0 ? (
                <Text className="text-ink-soft dark:text-ink-softdark py-2 font-serif">
                  No lists yet. Create one first.
                </Text>
              ) : (
                templates.map((t) => {
                  const on = selected.has(t.id);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => toggle(t.id)}
                      className="flex-row items-center justify-between py-3 border-b border-rule dark:border-rule-dark"
                    >
                      <View>
                        <Text className="text-ink dark:text-ink-dark font-serif">{t.name}</Text>
                        <Text className="text-xs text-ink-soft dark:text-ink-softdark font-serif">
                          {t.itemCount} item{t.itemCount === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <Feather
                        name={on ? 'check-circle' : 'circle'}
                        size={22}
                        color={on ? c.accent : c.inkSoft}
                      />
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <Pressable
              disabled={!canStart || startMutation.isPending}
              onPress={() => startMutation.mutate()}
              className="rounded-full py-3.5 items-center mt-4"
              style={{ backgroundColor: canStart ? c.accent : c.inkSoft, opacity: canStart ? 1 : 0.5 }}
            >
              <Text className="font-semibold" style={{ color: colorScheme === 'dark' ? '#201e1d' : '#ffffff' }}>
                {startMutation.isPending ? 'Starting…' : 'Start shopping'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
