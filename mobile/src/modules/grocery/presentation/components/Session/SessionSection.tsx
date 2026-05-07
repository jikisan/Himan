import { View, Pressable, Text } from 'react-native';
import { SessionBanner } from './SessionBanner';

interface SessionSectionProps {
  storeName: string;
  progress: number;
  completedCount: number;
  totalCount: number;
  onEnd: () => void;
  onCancel: () => void;
  onViewSession: () => void;
}

export function SessionSection({
  storeName,
  progress,
  completedCount,
  totalCount,
  onEnd,
  onCancel,
  onViewSession,
}: SessionSectionProps) {
  return (
    <View className="px-3 mt-2">
      <Pressable
        onPress={onViewSession}
        className="mt-2 bg-green-500 rounded-lg py-3 items-center"
      >
        <Text className="text-white font-medium">View Shopping Session</Text>
      </Pressable>
    </View>
  );
}
