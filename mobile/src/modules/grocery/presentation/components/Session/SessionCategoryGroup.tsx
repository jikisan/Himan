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
        className="flex flex-row items-center gap-2 px-3 py-2.5 bg-surface dark:bg-surface-dark dark:bg-surface-dark rounded-xl"
      >
        {isCollapsed ? (
          <Feather name="chevron-right" size={14} color="#7d7979" />
        ) : (
          <Feather name="chevron-down" size={14} color="#7d7979" />
        )}
        <Text className="text-xs font-semibold text-ink-soft dark:text-ink-softdark uppercase tracking-widest flex-1">
          {category}
        </Text>
        <Text className="text-xs text-ink-faint dark:text-ink-faintdark">{items.length}</Text>
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
