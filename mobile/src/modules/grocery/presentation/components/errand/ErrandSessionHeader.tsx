import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { GrocerySession } from '@himan/shared/grocery';
import { SectionHeading, SyncBadge } from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

interface ErrandSessionHeaderProps {
  errand: GrocerySession | null;
}

export function ErrandSessionHeader({ errand }: ErrandSessionHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <View className="px-5 pt-6 pb-6 border-b border-rule dark:border-rule-dark">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
          <Feather name="chevron-left" size={22} color={c.ink} />
          <Text className="text-ink dark:text-ink-dark font-serif">Lists</Text>
        </Pressable>
        <SyncBadge />
      </View>
      <SectionHeading size="xl" className="mt-6">
        {errand?.name || errand?.storeName || 'Errand'}
      </SectionHeading>
      {errand?.storeName && errand?.name ? (
        <Text className="text-ink-soft dark:text-ink-softdark font-serif">{errand.storeName}</Text>
      ) : null}
      <Text className="mt-0.5 text-ink-soft dark:text-ink-softdark font-serif">
        {errand ? `${errand.purchasedCount}/${errand.items.length} crossed off` : ''}
      </Text>
    </View>
  );
}
