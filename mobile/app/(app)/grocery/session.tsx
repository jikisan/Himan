import { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { GrocerySession, UserPreferencesRepository } from '@himan/shared/grocery';
import type { SessionItemType } from '@himan/shared/grocery';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { useErrandSession } from '@/modules/grocery/presentation/hooks/useErrandSession';
import { groceryKeys } from '@/modules/grocery/presentation/hooks/queryKeys';
import {
  PaperSurface,
  SectionHeading,
  PurchaseRow,
  SyncBadge,
} from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export default function ErrandSessionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const { session, isLoading, togglePurchase, completeErrand, cancelErrand } =
    useErrandSession();

  const { data: currency = '₱' } = useQuery({
    queryKey: [...groceryKeys.all, 'currency'],
    queryFn: async () => (await new UserPreferencesRepository().get(user!.id)).currency,
    enabled: !!user?.id,
  });

  const errand = useMemo(() => (session ? new GrocerySession(session) : null), [session]);

  const groups = useMemo(() => {
    const map = new Map<string, SessionItemType[]>();
    for (const item of session?.items ?? []) {
      const key = item.category || 'Other';
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [session]);

  const money = (n: number) => `${currency}${n.toFixed(2)}`;

  if (!isLoading && !errand) {
    return (
      <PaperSurface>
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Feather name="book-open" size={40} color={c.inkSoft} />
          <Text className="mt-4 text-center text-ink-soft dark:text-ink-softdark">
            No errand in progress. Start one from your lists.
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-full px-5 py-2.5"
            style={{ backgroundColor: c.accent }}
          >
            <Text className="font-medium" style={{ color: colorScheme === 'dark' ? '#1C1B18' : '#F7F3E9' }}>
              Back to lists
            </Text>
          </Pressable>
        </SafeAreaView>
      </PaperSurface>
    );
  }

  const confirmComplete = () =>
    Alert.alert('Finish errand?', 'Records prices to your catalog and closes this errand.', [
      { text: 'Keep shopping', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          await completeErrand();
          router.back();
        },
      },
    ]);

  const confirmCancel = () =>
    Alert.alert('Discard errand?', 'This errand and its progress will be deleted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await cancelErrand();
          router.back();
        },
      },
    ]);

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-5 pt-2 pb-3 border-b border-rule dark:border-rule-dark">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
              <Feather name="chevron-left" size={22} color={c.ink} />
              <Text className="text-ink dark:text-ink-dark">Lists</Text>
            </Pressable>
            <SyncBadge />
          </View>
          <SectionHeading size="xl" className="mt-1">
            {errand?.name || errand?.storeName || 'Errand'}
          </SectionHeading>
          {errand?.storeName && errand?.name ? (
            <Text className="text-ink-soft dark:text-ink-softdark">{errand.storeName}</Text>
          ) : null}
          <Text className="mt-0.5 text-ink-soft dark:text-ink-softdark">
            {errand ? `${errand.purchasedCount}/${errand.items.length} crossed off` : ''}
          </Text>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 }}>
          {groups.map(([category, items]) => (
            <View key={category}>
              <Text className="px-6 pt-4 pb-1 text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark">
                {category}
              </Text>
              {items.map((item) => (
                <PurchaseRow
                  key={item.id}
                  name={item.name}
                  category={null}
                  quantityLabel={
                    item.quantity ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : null
                  }
                  priceLabel={
                    item.isPurchased && item.pricePaid != null
                      ? money(item.pricePaid * (item.quantityPurchased ?? item.quantity ?? 1))
                      : item.price != null
                        ? money(item.price)
                        : null
                  }
                  purchased={item.isPurchased}
                  onToggle={() => togglePurchase(item)}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        <View className="absolute left-0 right-0 bottom-0 px-5 pt-3 pb-6 border-t border-rule dark:border-rule-dark bg-paper dark:bg-paper-dark">
          <View className="flex-row justify-between">
            <Text className="text-ink-soft dark:text-ink-softdark">Estimated</Text>
            <Text className="text-ink-soft dark:text-ink-softdark" style={{ fontVariant: ['tabular-nums'] }}>
              {money(errand?.estimatedTotal ?? 0)}
            </Text>
          </View>
          <View className="flex-row justify-between mt-0.5">
            <Text className="text-ink dark:text-ink-dark font-medium">Actual so far</Text>
            <Text className="text-ink dark:text-ink-dark font-semibold text-base" style={{ fontVariant: ['tabular-nums'] }}>
              {money(errand?.actualTotal ?? 0)}
            </Text>
          </View>
          <View className="flex-row gap-3 mt-3">
            <Pressable onPress={confirmCancel} className="flex-1 rounded-full py-3 items-center border" style={{ borderColor: c.margin }}>
              <Text style={{ color: c.margin }} className="font-medium">Discard</Text>
            </Pressable>
            <Pressable onPress={confirmComplete} className="flex-1 rounded-full py-3 items-center" style={{ backgroundColor: c.accent }}>
              <Text className="font-semibold" style={{ color: colorScheme === 'dark' ? '#1C1B18' : '#F7F3E9' }}>
                Finish errand
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </PaperSurface>
  );
}
