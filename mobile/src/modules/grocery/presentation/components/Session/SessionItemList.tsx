import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SessionItemType } from '@himan/shared/grocery';
import { SessionListGroup } from './SessionListGroup';
import { SessionCollapseToggle } from './SessionCollapseToggle';
import { TabType, CollapseStamp, CollapseLevel } from './types';

interface SessionItemListProps {
  activeTab: TabType;
  sessionItemsByList: Record<string, SessionItemType[]>;
  unpurchasedItems: SessionItemType[];
  purchasedItems: SessionItemType[];
  collapseLevel: CollapseLevel;
  collapseStamp: CollapseStamp;
  onToggleCollapse: () => void;
  onTogglePurchase: (sessionItemId: string, groceryItemId: string | null) => void;
}

export const SessionItemList = ({
  activeTab,
  sessionItemsByList,
  unpurchasedItems,
  purchasedItems,
  collapseLevel,
  collapseStamp,
  onToggleCollapse,
  onTogglePurchase,
}: SessionItemListProps) => {
  const allPurchased = unpurchasedItems.length === 0 && purchasedItems.length > 0;
  const hasPurchasedItems = purchasedItems.length > 0;
  const isToGet = activeTab === 'to-get';

  return (
    <>
      {/* to-get tab — always mounted to preserve collapse state */}
      <View style={{ display: isToGet ? 'flex' : 'none' }}>
        <View className="flex flex-row items-center justify-end px-2">
          <SessionCollapseToggle
            collapseLevel={collapseLevel}
            onToggle={onToggleCollapse}
            visible={Object.keys(sessionItemsByList).length > 0}
          />
        </View>

        {Object.entries(sessionItemsByList).map(([listName, listItems]) => {
          const items = listItems.filter((i) => !i.isPurchased);
          if (items.length === 0) return null;
          return (
            <SessionListGroup
              key={listName}
              listName={listName}
              items={items}
              collapseStamp={collapseStamp}
              onTogglePurchase={onTogglePurchase}
            />
          );
        })}

        {allPurchased && (
          <View className="flex flex-col items-center justify-center py-16">
            <Feather name="check-circle" size={40} color="#9b9797" opacity={0.2} />
            <Text className="text-sm font-medium text-ink-soft dark:text-ink-softdark mt-3">
              All items purchased!
            </Text>
          </View>
        )}
      </View>

      {/* purchased tab — always mounted to preserve collapse state */}
      <View style={{ display: isToGet ? 'none' : 'flex' }}>
        <View className="flex flex-row items-center justify-end px-2">
          <SessionCollapseToggle
            collapseLevel={collapseLevel}
            onToggle={onToggleCollapse}
            visible={hasPurchasedItems}
          />
        </View>

        {!hasPurchasedItems ? (
          <View className="flex flex-col items-center justify-center py-16">
            <Feather name="shopping-cart" size={40} color="#9b9797" opacity={0.2} />
            <Text className="text-sm text-ink-soft dark:text-ink-softdark mt-3">Nothing purchased yet</Text>
          </View>
        ) : (
          Object.entries(sessionItemsByList).map(([listName, listItems]) => {
            const items = listItems.filter((i) => i.isPurchased);
            if (items.length === 0) return null;
            return (
              <SessionListGroup
                key={listName}
                listName={listName}
                items={items}
                collapseStamp={collapseStamp}
                onTogglePurchase={onTogglePurchase}
              />
            );
          })
        )}
      </View>
    </>
  );
};
