import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { GroceryItemType } from '@himan/shared/grocery';
import type { CollapseStamp } from '../Session/SessionCategoryGroup';
import { GroceryItemRow } from './GroceryItemRow';

interface CategoryGroupProps {
  category: string;
  items: GroceryItemType[];
  isSessionActive: boolean;
  collapseStamp?: CollapseStamp | null;
  onCheck: (itemId: string, price?: number | null) => void;
  onUncheck: (itemId: string) => void;
  onEditItem: (item: GroceryItemType) => void;
  onDeleteItem: (itemId: string) => void;
}

export const CategoryGroup = ({
  category,
  items,
  isSessionActive,
  collapseStamp,
  onCheck,
  onUncheck,
  onEditItem,
  onDeleteItem,
}: CategoryGroupProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { colorScheme } = useColorScheme();
  const prevStampRef = useRef<number | null>(null);

  useEffect(() => {
    if (collapseStamp !== null && collapseStamp !== undefined && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      // Level 0: collapse all, Level 1: collapse level 2, Level 2: expand all
      setIsCollapsed(collapseStamp.level < 2);
    }
  }, [collapseStamp]);

  const tag = category.toLowerCase().replace(/\s+/g, '');

  return (
    <View>
      <Pressable
        onPress={() => setIsCollapsed(!isCollapsed)}
        className="flex flex-row items-center gap-2 px-5 pt-5 pb-1.5"
      >
        <Text className="text-[15px] font-serif text-accent-text dark:text-accent-textdark flex-1">
          {tag}
        </Text>
        <Text className="text-[14px] font-serif text-ink-faint dark:text-ink-faintdark">{items.length}</Text>
        <Feather
          name={isCollapsed ? 'chevron-right' : 'chevron-down'}
          size={16}
          color={colorScheme === 'dark' ? '#736e69' : '#9b9797'}
        />
      </Pressable>

      {!isCollapsed && (
        <View>
          {items.map((item) => (
            <GroceryItemRow
              key={item.id}
              item={item}
              isSessionActive={isSessionActive}
              onCheck={onCheck}
              onUncheck={onUncheck}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
            />
          ))}
        </View>
      )}
    </View>
  );
};
