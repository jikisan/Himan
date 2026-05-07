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
  return (
    <View className="flex-1 min-w-0">
      <View className="flex flex-row items-center gap-2">
        <Text
          className={`text-sm font-medium ${
            checked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
          }`}
          numberOfLines={1}
        >
          {name}
        </Text>
        {(quantityLabel || (quantity != null && quantity > 0)) && (
          <Text className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {quantityLabel || (unit ? `${quantity} ${unit}` : quantity)}
          </Text>
        )}
      </View>
      {notes && (
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" numberOfLines={1}>
          {notes}
        </Text>
      )}
      {checked && price != null && (
        <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          ₱{price.toFixed(2)}
        </Text>
      )}
    </View>
  );
};
