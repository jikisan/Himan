import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryListType } from '@himan/shared/grocery';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface ListSelectorRowProps {
  c: NotebookColors;
  list: GroceryListType;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function ListSelectorRow({ c, list, selected, onToggle }: ListSelectorRowProps) {
  return (
    <Pressable
      onPress={() => onToggle(list.id)}
      className="flex-row items-center justify-between py-3 border-b border-rule dark:border-rule-dark"
    >
      <View>
        <Text className="text-ink dark:text-ink-dark font-serif">{list.name}</Text>
        <Text className="text-xs text-ink-soft dark:text-ink-softdark font-serif">
          {list.itemCount} item{list.itemCount === 1 ? '' : 's'}
        </Text>
      </View>
      <Feather name={selected ? 'check-circle' : 'circle'} size={22} color={selected ? c.accent : c.inkSoft} />
    </Pressable>
  );
}
