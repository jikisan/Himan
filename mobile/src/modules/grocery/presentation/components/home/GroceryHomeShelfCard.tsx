import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';
import type { GroceryHomeShelf } from './GroceryHomeShelves';

interface GroceryHomeShelfCardProps {
  shelf: GroceryHomeShelf;
  c: NotebookColors;
}

export function GroceryHomeShelfCard({ shelf, c }: GroceryHomeShelfCardProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(shelf.href as never)}
      className="w-[48%] rounded-2xl p-4 border border-rule dark:border-rule-dark active:bg-black/5"
    >
      <View
        className="h-11 w-11 rounded-full items-center justify-center mb-3"
        style={{ backgroundColor: `${c.accent}22` }}
      >
        <Feather name={shelf.icon} size={20} color={c.accent} />
      </View>
      <Text className="text-lg text-ink dark:text-ink-dark font-serif">{shelf.label}</Text>
      <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-0.5 font-serif">{shelf.hint}</Text>
    </Pressable>
  );
}
