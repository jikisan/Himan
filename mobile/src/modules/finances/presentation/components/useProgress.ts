import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/** 0 → 1 over `duration` ms each time `key` changes; jumps straight to 1 when reduce-motion is on. */
export function useProgress(key: unknown, duration = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) { setValue(1); return; }
      const v = new Animated.Value(0);
      const id = v.addListener(({ value: next }) => setValue(next));
      Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      stop = () => { v.stopAnimation(); v.removeListener(id); };
    });
    return () => { cancelled = true; stop(); };
  }, [key, duration]);
  return value;
}
