import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { SessionItemType } from '@himan/shared/grocery';

interface SessionItemRowProps {
  item: SessionItemType;
  onTogglePurchase: (sessionItemId: string, groceryItemId: string | null) => void;
}

export const SessionItemRow = ({
  item,
  onTogglePurchase,
}: SessionItemRowProps) => {
  return (
    <Pressable
      onPress={() => onTogglePurchase(item.id, item.groceryItemId)}
      className={`flex flex-row items-center gap-3 px-3 py-3 rounded-xl ${
        item.isPurchased ? 'opacity-60' : 'bg-white dark:bg-gray-800'
      }`}
    >
      <View
        className={`flex-shrink-0 h-[22px] w-[22px] rounded-full border-2 flex items-center justify-center ${
          item.isPurchased
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {item.isPurchased && <Feather name="check" size={12} color="#ffffff" />}
      </View>

      <View className="flex-1 min-w-0">
        <View className="flex flex-row items-center gap-2">
          <Text
            className={`text-sm font-medium ${
              item.isPurchased ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
            }`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          {item.quantity > 0 && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {item.unit ? `${item.quantity} ${item.unit}` : item.quantity}
            </Text>
          )}
        </View>
        {item.notes && (
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" numberOfLines={1}>
            {item.notes}
          </Text>
        )}
        {item.isPurchased && item.price != null && (
          <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            ₱{item.price.toFixed(2)}
          </Text>
        )}
      </View>
    </Pressable>
  );
};
