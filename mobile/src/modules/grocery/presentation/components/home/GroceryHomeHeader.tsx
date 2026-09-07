import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SectionHeading, SyncBadge } from '@/modules/grocery/presentation/components/notebook';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface GroceryHomeHeaderProps {
  c: NotebookColors;
}

export function GroceryHomeHeader({ c }: GroceryHomeHeaderProps) {
  const router = useRouter();

  return (
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
  );
}
