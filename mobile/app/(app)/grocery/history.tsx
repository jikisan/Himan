import { View, Text, Pressable, SectionList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { GrocerySession } from '@himan/shared/grocery';
import { useErrandHistory } from '@/modules/grocery/presentation/hooks/useErrandHistory';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import {
  PaperSurface,
  SectionHeading,
  SyncBadge,
} from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export default function HistoryScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const { days } = useErrandHistory();
  const { format } = useCurrency();

  const sections = days.map((d) => ({
    title: d.dateLabel,
    total: d.total,
    data: d.errands,
  }));

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <View className="px-5 pt-8 pb-3 border-b border-rule dark:border-rule-dark">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
              <Feather name="chevron-left" size={22} color={c.ink} />
              <Text className="text-ink dark:text-ink-dark font-serif">Notebook</Text>
            </Pressable>
            <SyncBadge />
          </View>
          <SectionHeading size="xl" className="mt-6">History</SectionHeading>
        </View>

        <SectionList<GrocerySession, { title: string; total: number }>
          sections={sections}
          keyExtractor={(errand) => errand.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center justify-between px-6 pt-5 pb-1">
              <Text className="font-hand text-2xl text-ink dark:text-ink-dark">{section.title}</Text>
              <Text className="text-sm text-ink-soft dark:text-ink-softdark font-serif" style={{ fontVariant: ['tabular-nums'] }}>
                {format(section.total)}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 pl-6 pr-4 py-3 border-b border-rule dark:border-rule-dark">
              <View className="absolute left-3 top-0 bottom-0 w-px" style={{ backgroundColor: c.margin }} />
              <View className="flex-1">
                <Text className="text-ink dark:text-ink-dark font-serif">
                  {item.name || item.storeName || 'Errand'}
                </Text>
                <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-0.5 font-serif">
                  {item.purchasedCount} item{item.purchasedCount === 1 ? '' : 's'} · {item.duration}
                </Text>
              </View>
              <Text className="text-ink dark:text-ink-dark font-serif" style={{ fontVariant: ['tabular-nums'] }}>
                {format(item.actualTotal)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center px-8 py-20">
              <Feather name="archive" size={36} color={c.inkSoft} />
              <Text className="mt-3 text-center text-ink-soft dark:text-ink-softdark font-serif">
                No completed errands yet. Finish one to see it here.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </PaperSurface>
  );
}
