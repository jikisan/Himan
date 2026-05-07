import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

type EmptyStateType = 'no-items' | 'all-checked' | 'nothing-checked';

interface GroceryListEmptyStateProps {
  type: EmptyStateType;
}

export function GroceryListEmptyState({ type }: GroceryListEmptyStateProps) {
  if (type === 'no-items') {
    return (
      <View className="flex flex-col items-center justify-center py-16">
        <Feather name="shopping-bag" size={40} color="#9ca3af" opacity={0.2} />
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
          No items yet
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Add items to get started
        </Text>
      </View>
    );
  }

  if (type === 'all-checked') {
    return (
      <View className="flex flex-col items-center justify-center py-16">
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          All items checked
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          Switch to Checked tab to review
        </Text>
      </View>
    );
  }

  // nothing-checked
  return (
    <View className="flex flex-col items-center justify-center py-16">
      <Feather name="shopping-bag" size={40} color="#9ca3af" opacity={0.2} />
      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
        Nothing checked yet
      </Text>
    </View>
  );
}
