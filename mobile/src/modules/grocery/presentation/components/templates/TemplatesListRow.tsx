import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryListType } from '@himan/shared/grocery';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface TemplatesListRowProps {
  c: NotebookColors;
  item: GroceryListType;
  onPress: () => void;
  onOpenMenu: (target: any) => void;
}

export function TemplatesListRow({ c, item, onPress, onOpenMenu }: TemplatesListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={(e) => onOpenMenu(e.currentTarget)}
      className="flex-row items-center gap-3 pl-6 pr-4 py-4 border-b border-rule dark:border-rule-dark active:bg-black/5"
    >
      <View className="flex-1">
        <Text className="text-lg font-hand text-ink dark:text-ink-dark">{item.name}</Text>
        <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-0.5 font-serif">
          {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
          {item.memberCount > 1 ? ' · shared' : ''}
        </Text>
      </View>
      <Pressable onPress={(e) => onOpenMenu(e.currentTarget)} hitSlop={10} className="p-1">
        <Feather name="more-vertical" size={20} color={c.inkSoft} />
      </Pressable>
    </Pressable>
  );
}
