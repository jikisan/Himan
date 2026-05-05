import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SessionItemType } from '@himan/shared/grocery';
import { SessionCategoryGroup, CollapseStamp } from './SessionCategoryGroup';

interface SessionListGroupProps {
  listName: string;
  items: SessionItemType[];
  collapseStamp?: CollapseStamp | null;
  onTogglePurchase: (sessionItemId: string, groceryItemId: string | null) => void;
}

export const SessionListGroup = ({
  listName,
  items,
  collapseStamp,
  onTogglePurchase,
}: SessionListGroupProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevStampRef = useRef<number | null>(null);

  useEffect(() => {
    if (collapseStamp !== null && collapseStamp !== undefined && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      setIsCollapsed(collapseStamp.collapsed);
    }
  }, [collapseStamp]);

  // Group by category
  const groupedByCategory = items.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, SessionItemType[]>);

  return (
    <View className="mt-4">
      <Pressable
        onPress={() => setIsCollapsed(!isCollapsed)}
        className="flex flex-row items-center gap-2 px-3 py-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl mb-2"
      >
        {isCollapsed ? (
          <Feather name="chevron-right" size={16} color="#6366f1" />
        ) : (
          <Feather name="chevron-down" size={16} color="#6366f1" />
        )}
        <Text className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex-1">
          {listName}
        </Text>
        <Text className="text-xs text-indigo-500 dark:text-indigo-400">{items.length} items</Text>
      </Pressable>

      {!isCollapsed && (
        <View className="space-y-2">
          {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
            <SessionCategoryGroup
              key={category}
              category={category}
              items={categoryItems}
              onTogglePurchase={onTogglePurchase}
            />
          ))}
        </View>
      )}
    </View>
  );
};
