import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

type EmptyStateType = 'no-items' | 'all-checked' | 'nothing-checked';

interface GroceryListEmptyStateProps {
  type: EmptyStateType;
  message?: string;
  subMessage?: string;
}

export function GroceryListEmptyState({ type, message, subMessage }: GroceryListEmptyStateProps) {
  if (type === 'no-items') {
    return (
      <View className="flex flex-col items-center justify-center py-16">
        <Feather name="shopping-bag" size={40} color="#9ca3af" opacity={0.2} />
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
          {message ?? 'No items yet'}
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {subMessage ?? 'Add items to get started'}
        </Text>
      </View>
    );
  }

  if (type === 'all-checked') {
    return (
      <View className="flex flex-col items-center justify-center py-16">
        <Feather name="check-circle" size={40} color="#9ca3af" opacity={0.2} />
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
          {message ?? 'All items checked'}
        </Text>
        <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
          {subMessage ?? 'Switch to Checked tab to review'}
        </Text>
      </View>
    );
  }

  // nothing-checked
  return (
    <View className="flex flex-col items-center justify-center py-16">
      <Feather name="shopping-bag" size={40} color="#9ca3af" opacity={0.2} />
      <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
        {message ?? 'Nothing checked yet'}
      </Text>
    </View>
  );
}
