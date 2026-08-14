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
      // Level 0: collapse all, Level 1: expand level 1, Level 2: expand all
      setIsCollapsed(collapseStamp.level < 1);
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
        className="flex flex-row items-center gap-2 px-3 py-3 bg-sticky dark:bg-sticky-dark rounded-xl mb-2"
      >
        {isCollapsed ? (
          <Feather name="chevron-right" size={16} color="#0088b0" />
        ) : (
          <Feather name="chevron-down" size={16} color="#0088b0" />
        )}
        <Text className="text-sm font-semibold text-accent-text dark:text-accent-textdark flex-1">
          {listName}
        </Text>
        <Text className="text-xs text-accent-text dark:text-accent-textdark">{items.length} items</Text>
      </Pressable>

      {!isCollapsed && (
        <View className="space-y-2 pl-4">
          {Object.entries(groupedByCategory).map(([category, categoryItems]) => (
            <SessionCategoryGroup
              key={category}
              category={category}
              items={categoryItems}
              collapseStamp={collapseStamp}
              onTogglePurchase={onTogglePurchase}
            />
          ))}
        </View>
      )}
    </View>
  );
};
