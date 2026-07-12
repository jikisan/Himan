import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SessionItemType } from '@himan/shared/grocery';
import { SessionItemRow } from './SessionItemRow';

export interface CollapseStamp {
  level: 0 | 1 | 2; // 0: collapse all, 1: expand level 1 only, 2: expand all
  n: number;
}

interface SessionCategoryGroupProps {
  category: string;
  items: SessionItemType[];
  collapseStamp?: CollapseStamp | null;
  onTogglePurchase: (sessionItemId: string, groceryItemId: string | null) => void;
}

export const SessionCategoryGroup = ({
  category,
  items,
  collapseStamp,
  onTogglePurchase,
}: SessionCategoryGroupProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevStampRef = useRef<number | null>(null);

  useEffect(() => {
    if (collapseStamp !== null && collapseStamp !== undefined && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      // Level 0: collapse all, Level 1: expand level 1, collapse level 2, Level 2: expand all
      setIsCollapsed(collapseStamp.level < 2);
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
        <View className="mt-0.5 space-y-0.5 pl-4">
          {items.map((item) => (
            <SessionItemRow
              key={item.id}
              item={item}
              onTogglePurchase={onTogglePurchase}
            />
          ))}
        </View>
      )}
    </View>
  );
};
