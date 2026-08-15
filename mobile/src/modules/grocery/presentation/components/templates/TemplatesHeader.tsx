import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SectionHeading, SyncBadge } from '@/modules/grocery/presentation/components/notebook';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface TemplatesHeaderProps {
  c: NotebookColors;
}

export function TemplatesHeader({ c }: TemplatesHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center justify-between">
      <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
        <Feather name="chevron-left" size={22} color={c.ink} />
        <Text className="text-ink dark:text-ink-dark font-serif">Notebook</Text>
      </Pressable>
      <SyncBadge />
    </View>
  );
}
