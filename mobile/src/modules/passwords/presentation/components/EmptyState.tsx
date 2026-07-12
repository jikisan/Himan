import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface EmptyStateProps {
  hasSearch: boolean;
  onAdd: () => void;
}

export const EmptyState = ({ hasSearch, onAdd }: EmptyStateProps) => (
  <View className="flex-1 items-center justify-center px-8 py-16 gap-4">
    <View className="w-16 h-16 rounded-2xl bg-indigo-500/10 items-center justify-center">
      <Feather name="key" size={28} color="#6366f1" />
    </View>
    <View className="items-center gap-1">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white text-center">
        {hasSearch ? 'No passwords found' : 'No passwords yet'}
      </Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
        {hasSearch
          ? 'Try a different search term or category'
          : 'Add your first password to get started'}
      </Text>
    </View>
    {!hasSearch && (
      <Pressable
        onPress={onAdd}
        className="flex-row items-center gap-2 px-5 py-3 bg-indigo-500 rounded-xl active:bg-indigo-600"
      >
        <Feather name="plus" size={16} color="#ffffff" />
        <Text className="text-white font-semibold text-sm">Add Password</Text>
      </Pressable>
    )}
  </View>
);
