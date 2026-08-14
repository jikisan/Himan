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
    <View className="mx-3 mt-5">
      <Text className="text-xs font-semibold text-ink-faint dark:text-ink-faintdark uppercase tracking-widest mb-2 px-1">
        Session
      </Text>
      <Pressable
        onPress={onViewSession}
        className=" border border-rule dark:border-rule-dark  rounded-2xl p-4"
      >
        {/* Live indicator + chevron */}
        <View className="flex-row items-center justify-between mb-2.5">
          <View className="flex-row items-center gap-2">
            <View className="w-3 h-3 items-center justify-center">
              <Animated.View
                className="absolute w-3 h-3 rounded-full bg-accent dark:bg-accent-dark"
                style={{ opacity: pulseAnim }}
              />
              <View className="w-2 h-2 rounded-full bg-accent dark:bg-accent-dark" />
            </View>
            <Text className="text-xs font-bold text-accent-text dark:text-accent-textdark uppercase tracking-widest">
              Live Session
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color="#16a34a" />
        </View>

        {/* Store name + progress count */}
        <View className="flex-row items-center justify-between">
          <Text className="text-ink dark:text-ink-dark font-semibold text-base flex-1" numberOfLines={1}>
            {storeName}
          </Text>
          {totalCount > 0 && (
            <Text className="text-xs text-accent-text dark:text-accent-textdark font-medium ml-2">
              {completedCount}/{totalCount}
            </Text>
          )}
        </View>

        {totalCount > 0 && (
          <View className="w-full bg-surface dark:bg-surface-dark rounded-full h-1 mt-2.5">
            <View
              className="bg-accent dark:bg-accent-dark rounded-full h-1"
              style={{ width: `${progressPercent}%` }}
            />
          </View>
        )}

      </Pressable>
    </View>
  );
}
