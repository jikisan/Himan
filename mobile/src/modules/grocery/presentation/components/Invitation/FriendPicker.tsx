import { View, Text, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFriends } from '@/modules/grocery/presentation/hooks';

interface FriendPickerProps {
  excludeUserIds?: string[];
  onPick: (email: string) => void;
  disabled?: boolean;
}

export const FriendPicker = ({ excludeUserIds = [], onPick, disabled }: FriendPickerProps) => {
  const { friends } = useFriends();
  const available = friends.filter((f) => !excludeUserIds.includes(f.userId));

  if (available.length === 0) return null;

  return (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
        Friends
      </Text>
      <ScrollView className="max-h-40" keyboardShouldPersistTaps="handled">
        {available.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => !disabled && onPick(f.email)}
            disabled={disabled}
            className="flex-row items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800"
          >
            <View className="flex-row items-center gap-2 flex-1">
              <View className="h-7 w-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 items-center justify-center">
                <Feather name="user" size={14} color="#6366f1" />
              </View>
              <Text className="text-sm text-gray-900 dark:text-white flex-1" numberOfLines={1}>{f.email}</Text>
            </View>
            <Feather name="plus-circle" size={18} color="#6366f1" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
