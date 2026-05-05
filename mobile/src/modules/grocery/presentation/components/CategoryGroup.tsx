import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryItemType } from '@himan/shared/grocery';
import type { CollapseStamp } from './SessionCategoryGroup';
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
  const prevStampRef = useRef<number | null>(null);

  useEffect(() => {
    if (collapseStamp !== null && collapseStamp !== undefined && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      setIsCollapsed(collapseStamp.collapsed);
    }
  }, [collapseStamp]);

  return (
    <View>
      <Pressable
        onPress={() => setIsCollapsed(!isCollapsed)}
        className="flex flex-row items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
      >
        {isCollapsed ? (
          <Feather name="chevron-right" size={14} color="#6b7280" />
        ) : (
          <Feather name="chevron-down" size={14} color="#6b7280" />
        )}
        <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex-1">
          {category}
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500">{items.length}</Text>
      </Pressable>

      {!isCollapsed && (
        <View className="mt-0.5 space-y-0.5">
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
