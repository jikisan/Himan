import { View, Text, ScrollView } from 'react-native';
import type { SessionItemType } from '@himan/shared/grocery';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import { PurchaseRow } from '@/modules/grocery/presentation/components/notebook';

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
  onToggle: (item: SessionItemType) => void;
}

export function ErrandItemList({ groups, onToggle }: ErrandItemListProps) {
  const { format: money } = useCurrency();

  return (
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
              onToggle={() => onToggle(item)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
