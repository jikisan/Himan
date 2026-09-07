import { View, Text } from 'react-native';

interface ItemRowContentProps {
  name: string;
  quantity?: number;
  unit?: string;
  quantityLabel?: string;
  notes?: string | null;
  price?: number | null;
  checked: boolean;
}

export const ItemRowContent = ({
  name,
  quantity,
  unit,
  quantityLabel,
  notes,
  price,
  checked,
}: ItemRowContentProps) => {
  const meta = checked
    ? 'text-ink-faint dark:text-ink-faintdark'
    : 'text-ink-soft dark:text-ink-softdark';
  return (
    <View className="flex-1 min-w-0">
      <View className="flex flex-row items-center gap-2">
        <Text
          className={`text-[17px] font-serif ${
            checked ? 'line-through text-ink-faint dark:text-ink-faintdark' : 'text-ink dark:text-ink-dark'
          }`}
          numberOfLines={1}
        >
          {name}
        </Text>
        {(quantityLabel || (quantity != null && quantity > 0)) && (
          <Text className={`text-[14px] font-serif flex-shrink-0 ${meta}`}>
            {quantityLabel || (unit ? `${quantity} ${unit}` : quantity)}
          </Text>
        )}
      </View>
      {notes && (
        <Text className={`text-[14px] font-serif mt-0.5 ${meta}`} numberOfLines={1}>
          {notes}
        </Text>
      )}
      {checked && price != null && (
        <Text
          className="text-[14px] font-serif text-ink-faint dark:text-ink-faintdark mt-0.5"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          ₱{price.toFixed(2)}
        </Text>
      )}
    </View>
  );
};
