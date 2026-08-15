import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { SessionItemType } from '@himan/shared/grocery';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import type { PurchaseDetails } from '@/modules/grocery/presentation/hooks/useErrandSession';
import { PurchaseRow } from '@/modules/grocery/presentation/components/notebook';
import { ErrandItemEditModal, type ErrandItemEdits } from './ErrandItemEditModal';

type CurrencyFormat = ReturnType<typeof useCurrency>['format'];

function quantityLabel(item: SessionItemType): string | null {
  if (!item.quantity) return null;
  return `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`;
}

function priceLabel(item: SessionItemType, money: CurrencyFormat): string | null {
  if (item.pricePaid != null) {
    return money(item.pricePaid * (item.quantityPurchased ?? item.quantity ?? 1));
  }
  if (item.price != null) return money(item.price);
  return null;
}

interface ErrandItemListProps {
  groups: [string, SessionItemType[]][];
  onToggle: (item: SessionItemType, details?: PurchaseDetails) => void;
  onUpdate: (
    itemId: string,
    patch: Pick<Partial<SessionItemType>, 'name' | 'category' | 'quantity' | 'aisle' | 'price'>
  ) => void;
}

// Broadcast from the collapse-all button. `n` bumps each press so groups
// re-sync even when the target state matches their last synced value.
interface CollapseSignal {
  collapsed: boolean;
  n: number;
}

interface ErrandCategoryGroupProps {
  category: string;
  items: SessionItemType[];
  money: CurrencyFormat;
  signal: CollapseSignal;
  onPress: (item: SessionItemType) => void;
}

function ErrandCategoryGroup({ category, items, money, signal, onPress }: ErrandCategoryGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { colorScheme } = useColorScheme();
  const prevN = useRef(signal.n);

  useEffect(() => {
    if (signal.n !== prevN.current) {
      prevN.current = signal.n;
      setCollapsed(signal.collapsed);
    }
  }, [signal]);

  return (
    <View>
      <Pressable
        onPress={() => setCollapsed((c) => !c)}
        className="flex-row items-center gap-2 px-6 pt-4 pb-1"
      >
        <Text className="flex-1 text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark font-serif">
          {category}
        </Text>
        <Text className="text-xs font-serif text-ink-faint dark:text-ink-faintdark">
          {items.length}
        </Text>
        <Feather
          name={collapsed ? 'chevron-right' : 'chevron-down'}
          size={16}
          color={colorScheme === 'dark' ? '#736e69' : '#9b9797'}
        />
      </Pressable>

      {!collapsed &&
        items.map((item) => (
          <PurchaseRow
            key={item.id}
            name={item.name}
            category={null}
            quantityLabel={quantityLabel(item)}
            aisleLabel={item.aisle || null}
            priceLabel={priceLabel(item, money)}
            purchased={item.isPurchased}
            onToggle={() => onPress(item)}
          />
        ))}
    </View>
  );
}

export function ErrandItemList({ groups, onToggle, onUpdate }: ErrandItemListProps) {
  const { format: money } = useCurrency();
  const { colorScheme } = useColorScheme();
  const [editing, setEditing] = useState<SessionItemType | null>(null);
  const [signal, setSignal] = useState<CollapseSignal>({ collapsed: false, n: 0 });

  const toggleAll = () =>
    setSignal((s) => ({ collapsed: !s.collapsed, n: s.n + 1 }));

  const handlePress = (item: SessionItemType) => {
    // Crossed-off items un-cross on tap; pending items open the editor first.
    if (item.isPurchased) {
      onToggle(item);
      return;
    }
    setEditing(item);
  };

  const handleSave = (edits: ErrandItemEdits) => {
    if (!editing) return;
    onUpdate(editing.id, { name: edits.name, quantity: edits.quantity });
    onToggle(editing, {
      pricePaid: edits.pricePaid,
      category: edits.category,
      aisle: edits.aisle,
    });
    setEditing(null);
  };

  const handleSkip = () => {
    if (!editing) return;
    onToggle(editing);
    setEditing(null);
  };

  return (
    <>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 150 }}>
        {groups.length > 0 && (
          <View className="flex-row justify-end px-4 pt-2">
            <Pressable onPress={toggleAll} className="flex-row items-center gap-1.5 p-2">
              <Feather
                name={signal.collapsed ? 'chevrons-down' : 'chevrons-up'}
                size={14}
                color={colorScheme === 'dark' ? '#736e69' : '#9b9797'}
              />
              <Text className="text-xs uppercase tracking-wider text-ink-faint dark:text-ink-faintdark font-serif">
                {signal.collapsed ? 'Expand all' : 'Collapse all'}
              </Text>
            </Pressable>
          </View>
        )}
        {groups.map(([category, items]) => (
          <ErrandCategoryGroup
            key={category}
            category={category}
            items={items}
            money={money}
            signal={signal}
            onPress={handlePress}
          />
        ))}
      </ScrollView>

      <ErrandItemEditModal
        item={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        onSkip={handleSkip}
      />
    </>
  );
}
