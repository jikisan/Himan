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
      <Text className="text-xs font-semibold text-ink-soft dark:text-ink-softdark uppercase tracking-wide mb-2">
        Friends
      </Text>
      <ScrollView className="max-h-40" keyboardShouldPersistTaps="handled">
        {available.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => !disabled && onPick(f.email)}
            disabled={disabled}
            className="flex-row items-center justify-between py-2.5 border-b border-rule dark:border-rule-dark"
          >
            <View className="flex-row items-center gap-2 flex-1">
              <View className="h-7 w-7 rounded-full bg-sticky dark:bg-sticky-dark items-center justify-center">
                <Feather name="user" size={14} color="#0088b0" />
              </View>
              <Text className="text-sm text-ink dark:text-ink-dark flex-1" numberOfLines={1}>{f.email}</Text>
            </View>
            <Feather name="plus-circle" size={18} color="#0088b0" />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};
