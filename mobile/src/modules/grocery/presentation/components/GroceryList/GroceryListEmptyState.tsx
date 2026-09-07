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
        <Feather name="shopping-bag" size={40} color="#9b9797" opacity={0.4} />
        <Text className="text-[15px] font-serif text-ink-soft dark:text-ink-softdark mt-3">
          {message ?? 'No items yet'}
        </Text>
        <Text className="text-[14px] font-serifitalic text-ink-faint dark:text-ink-faintdark mt-1">
          {subMessage ?? 'Add an item to get started'}
        </Text>
      </View>
    );
  }

  if (type === 'all-checked') {
    return (
      <View className="flex flex-col items-center justify-center py-16">
        <Feather name="check-circle" size={40} color="#9b9797" opacity={0.4} />
        <Text className="text-[15px] font-serif text-ink-soft dark:text-ink-softdark mt-3">
          {message ?? 'All crossed off'}
        </Text>
      </View>
    );
  }

  // nothing-checked
  return (
    <View className="flex flex-col items-center justify-center py-16">
      <Feather name="shopping-bag" size={40} color="#9b9797" opacity={0.4} />
      <Text className="text-[15px] font-serif text-ink-soft dark:text-ink-softdark mt-3">
        {message ?? 'Nothing crossed off yet'}
      </Text>
    </View>
  );
}
