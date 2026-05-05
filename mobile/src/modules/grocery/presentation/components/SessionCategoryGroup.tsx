import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SessionItemType } from '@himan/shared/grocery';
import { SessionItemRow } from './SessionItemRow';

export interface CollapseStamp {
  collapsed: boolean;
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
