import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

interface GroceryListDetailHeaderProps {
  listName: string;
  memberCount: number;
  onShare: () => void;
  onAddItem?: () => void;
}

export function GroceryListDetailHeader({
  listName,
  memberCount,
  onShare,
  onAddItem,
}: GroceryListDetailHeaderProps) {
  const router = useRouter();

  return (
    <View className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
      <View className="flex flex-row items-center gap-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <Feather name="arrow-left" size={20} color="#6b7280" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white" numberOfLines={1}>
            {listName}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {onAddItem && (
          <Pressable onPress={onAddItem} className="p-2">
            <Feather name="plus" size={22} color="#6366f1" />
          </Pressable>
        )}
        <Pressable onPress={onShare} className="p-2">
          <Feather name="share-2" size={20} color="#6b7280" />
        </Pressable>
      </View>
    </View>
  );
}
