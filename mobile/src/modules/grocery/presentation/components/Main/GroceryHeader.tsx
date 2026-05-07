import { View, Pressable, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface GroceryHeaderProps {
  onBack: () => void;
  onStartShopping: () => void;
  showShoppingButton: boolean;
  shoppingButtonDisabled: boolean;
}

export function GroceryHeader({
  onBack,
  onStartShopping,
  showShoppingButton,
  shoppingButtonDisabled,
}: GroceryHeaderProps) {
  return (
    <View className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <View className="flex flex-row items-center gap-3">
        <Pressable onPress={onBack} className="p-1">
          <Feather name="arrow-left" size={20} color="#6b7280" />
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-gray-900 dark:text-white">Grocery</Text>
        {showShoppingButton && (
          <Pressable
            onPress={onStartShopping}
            disabled={shoppingButtonDisabled}
            className={`p-2 rounded-lg ${
              shoppingButtonDisabled
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'bg-indigo-500'
            }`}
          >
            <Feather name="shopping-cart" size={20} color="#ffffff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}
