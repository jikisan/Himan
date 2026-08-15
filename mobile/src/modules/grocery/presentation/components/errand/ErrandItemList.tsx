import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
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
  if (item.isPurchased && item.pricePaid != null) {
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

export function ErrandItemList({ groups, onToggle, onUpdate }: ErrandItemListProps) {
  const { format: money } = useCurrency();
  const [editing, setEditing] = useState<SessionItemType | null>(null);

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
        {groups.map(([category, items]) => (
          <View key={category}>
            <Text className="px-6 pt-4 pb-1 text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark font-serif">
              {category}
            </Text>
            {items.map((item) => (
              <PurchaseRow
                key={item.id}
                name={item.name}
                category={null}
                quantityLabel={quantityLabel(item)}
                priceLabel={priceLabel(item, money)}
                purchased={item.isPurchased}
                onToggle={() => handlePress(item)}
              />
            ))}
          </View>
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
