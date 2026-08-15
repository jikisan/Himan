import { memo, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { notebook } from '../../theme/notebook';
import { CategoryChip } from './CategoryChip';

export interface PurchaseRowProps {
  name: string;
  category: string | null;
  quantityLabel?: string | null; // e.g. "2 kg"
  aisleLabel?: string | null; // e.g. "A3"
  priceLabel?: string | null; // e.g. "₱120.00"
  purchased: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
}

/**
 * Signature row: tap to cross an item off the list. An ink line strikes
 * left-to-right across the name and the checkbox fills with a spring, the
 * way you'd score through a paper shopping list. Ruled bottom line + red
 * left-margin rule complete the notebook page.
 */
function PurchaseRowComponent({
  name,
  category,
  quantityLabel,
  aisleLabel,
  priceLabel,
  purchased,
  onToggle,
  onLongPress,
}: PurchaseRowProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const progress = useSharedValue(purchased ? 1 : 0);
  const pop = useSharedValue(purchased ? 1 : 0);
  const mounted = useRef(false);

  useEffect(() => {
    // Snap to state on first mount (e.g. expanding a category); only animate
    // on a real toggle so re-mounting many rows doesn't kick off N animations.
    if (!mounted.current) {
      mounted.current = true;
      progress.value = purchased ? 1 : 0;
      pop.value = purchased ? 1 : 0;
      return;
    }
    progress.value = withTiming(purchased ? 1 : 0, { duration: 260 });
    pop.value = withSpring(purchased ? 1 : 0, { damping: 12, stiffness: 180 });
  }, [purchased, progress, pop]);

  const strikeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progress.value }],
    opacity: progress.value,
  }));

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: pop.value > 0.5 ? c.accent : 'transparent',
    borderColor: pop.value > 0.5 ? c.accent : c.inkFaint,
    transform: [{ scale: 1 + pop.value * 0.12 }],
  }));

  const checkStyle = useAnimatedStyle(() => ({ opacity: pop.value }));

  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onLongPress}
      className="flex-row items-center justify-start gap-3 px-5 py-3.5 border-b border-rule dark:border-rule-dark active:bg-black/5"
    >
      <Animated.View
        style={boxStyle}
        className="h-6 w-6 rounded-3xl border-2 items-center justify-start"
      >
        <Animated.View style={checkStyle}>
          <Feather name="check" size={14} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>

      <View className="w-[50%]">
        <View className="self-start">
          <Text
            className={`text-[17px] font-serif ${purchased ? 'text-ink-faint dark:text-ink-faintdark' : 'text-ink dark:text-ink-dark'}`}
          >
            {name}
          </Text>
          <Animated.View
            pointerEvents="none"
            style={[
              strikeStyle,
              {
                position: 'absolute',
                left: 0,
                right: 0,
                top: '55%',
                height: 1.5,
                backgroundColor: c.ink,
                transformOrigin: 'left',
              },
            ]}
          />
        </View>
        <View className="flex-row items-center gap-2 mt-0.5">
          {category ? <CategoryChip category={category} /> : null}
          {quantityLabel ? (
            <Text className="text-[14px] font-serif text-ink-soft dark:text-ink-softdark">{quantityLabel}</Text>
          ) : null}
        </View>
      </View>

      {aisleLabel ? (
        <View className="items-center px-1">
          <Text className="text-[12px] font-serif text-ink-soft dark:text-ink-softdark mt-0.5">
            Aisle
          </Text>
          <Text className="text-[12px] font-serif text-ink-soft dark:text-ink-softdark mt-0.5">
            {aisleLabel}
          </Text>
        </View>
      ) : null}

      {priceLabel ? (
        <Text
          className="text-[14px] font-serif text-ink-faint dark:text-ink-faintdark"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {priceLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

export const PurchaseRow = memo(PurchaseRowComponent);
