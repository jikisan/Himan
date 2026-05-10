import { View, Text, Pressable, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface CardsHeaderProps {
  onBack: () => void;
  searchQuery: string;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onSearchChange: (text: string) => void;
  onAdd: () => void;
}

export const CardsHeader = ({
  onBack,
  searchQuery,
  isSearchOpen,
  onToggleSearch,
  onSearchChange,
  onAdd,
}: CardsHeaderProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <View className="flex-row items-center gap-3">
        <Pressable onPress={onBack} className="p-2 -ml-1">
          <Feather name="arrow-left" size={22} color={isDark ? '#e5e7eb' : '#111827'} />
        </Pressable>

        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-8 h-8 rounded-lg bg-indigo-500/10 items-center justify-center">
            <Feather name="credit-card" size={16} color="#6366f1" />
          </View>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">Cards</Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={onToggleSearch}
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <Feather
              name={isSearchOpen ? 'x' : 'search'}
              size={20}
              color={isDark ? '#9ca3af' : '#6b7280'}
            />
          </Pressable>
        </View>
      </View>

      {isSearchOpen && (
        <View className="mt-2 flex-row items-center border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-gray-50 dark:bg-gray-900 gap-2">
          <Feather name="search" size={16} color="#9ca3af" />
          <TextInput
            autoFocus
            placeholder="Search cards..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={onSearchChange}
            className="flex-1 text-gray-900 dark:text-white text-sm"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => onSearchChange('')}>
              <Feather name="x" size={14} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};
