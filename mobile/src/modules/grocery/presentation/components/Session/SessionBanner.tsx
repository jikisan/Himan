import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SessionBannerProps {
  storeName: string;
  progress: number;
  completedCount: number;
  totalCount: number;
  onEnd: () => void;
  onCancel: () => void;
}

export const SessionBanner = ({
  storeName,
  progress,
  completedCount,
  totalCount,
  onEnd,
  onCancel,
}: SessionBannerProps) => {
  return (

      <View className="mx-3 flex flex-row items-center gap-1.5">
        <View className="flex-1 bg-surface dark:bg-surface-dark rounded-full h-2">
          <View
              className="bg-accent dark:bg-accent-dark rounded-full h-2"
              style={{ width: `${progress * 100}%` }}
          />
        </View>
        <Text className="text-xs text-ink-soft dark:text-ink-softdark">
          {completedCount} of {totalCount}
        </Text>
      </View>

  );
};
