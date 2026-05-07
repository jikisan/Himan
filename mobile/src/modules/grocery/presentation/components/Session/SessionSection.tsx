import { useEffect, useRef } from 'react';
import { View, Pressable, Text, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const remaining = totalCount - completedCount;
  const progressPercent = Math.round(progress * 100);

  return (
    <View className="mx-3 mt-3">
      <Pressable
        onPress={onViewSession}
        className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-2xl p-4"
      >
        {/* Live indicator + chevron */}
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 items-center justify-center">
              <Animated.View
                className="absolute w-3 h-3 rounded-full bg-green-400"
                style={{ opacity: pulseAnim }}
              />
              <View className="w-2 h-2 rounded-full bg-green-500" />
            </View>
            <Text className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">
              Live Session
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#16a34a" />
        </View>

        {/* Store name */}
        <Text className="text-gray-900 dark:text-gray-100 font-semibold text-base">
          {storeName}
        </Text>

      </Pressable>
    </View>
  );
}
