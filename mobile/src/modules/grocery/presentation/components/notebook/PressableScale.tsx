import { forwardRef } from 'react';
import { Pressable, type PressableProps, type View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Strong ease-out — built-in curves lack punch.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export interface PressableScaleProps extends PressableProps {
  /** Scale at full press. Keep subtle (0.95–0.98). */
  activeScale?: number;
}

/**
 * Pressable that scales down on press for instant tactile feedback. Uses a
 * spring-free timing so rapid taps retarget cleanly. 120ms in, 160ms settle.
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(
  function PressableScale({ activeScale = 0.97, style, onPressIn, onPressOut, ...rest }, ref) {
    const pressed = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: 1 - pressed.value * (1 - activeScale) }],
    }));

    return (
      <AnimatedPressable
        ref={ref as never}
        style={[animatedStyle, style as never]}
        onPressIn={(e) => {
          pressed.value = withTiming(1, { duration: 120, easing: EASE_OUT });
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          pressed.value = withTiming(0, { duration: 160, easing: EASE_OUT });
          onPressOut?.(e);
        }}
        {...rest}
      />
    );
  }
);
