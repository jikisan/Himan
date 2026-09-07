import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SessionParticipantsProps {
  count: number;
}

export const SessionParticipants = ({ count }: SessionParticipantsProps) => {
  if (count <= 1) return null;

  return (
    <View className="px-3 mt-3">
      <View className="flex flex-row items-center gap-2">
        <Feather name="users" size={14} color="#7d7979" />
        <Text className="text-xs text-ink-soft dark:text-ink-softdark">
          {count} shopper{count !== 1 ? 's' : ''} active
        </Text>
      </View>
    </View>
  );
};
