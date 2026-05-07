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
    <View className="mx-3 mt-2 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
      <View className="flex flex-row items-center justify-between mb-2">
        <View className="flex flex-row items-center gap-2">
          <Feather name="shopping-bag" size={18} color="#22c55e" />
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            Shopping at {storeName}
          </Text>
        </View>
        <View className="flex flex-row items-center gap-2">
          {/*<Pressable onPress={onCancel} className="p-1">*/}
          {/*  <Feather name="x-circle" size={18} color="#ef4444" />*/}
          {/*</Pressable>*/}
          {/*<Pressable onPress={onEnd} className="p-1">*/}
          {/*  <Feather name="check-circle" size={18} color="#22c55e" />*/}
          {/*</Pressable>*/}
        </View>
      </View>

      <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
        <View
          className="bg-green-500 rounded-full h-2"
          style={{ width: `${progress * 100}%` }}
        />
      </View>
      <Text className="text-xs text-gray-500 dark:text-gray-400">
        {completedCount} of {totalCount} items purchased
      </Text>
    </View>
  );
};
