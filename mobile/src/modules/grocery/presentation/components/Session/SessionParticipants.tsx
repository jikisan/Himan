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
        <Feather name="users" size={14} color="#6b7280" />
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          {count} shopper{count !== 1 ? 's' : ''} active
        </Text>
      </View>
    </View>
  );
};
