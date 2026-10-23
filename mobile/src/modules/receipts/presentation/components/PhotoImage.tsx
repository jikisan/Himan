import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/** An image that fades in once loaded (instant with reduce-motion on). */
export function PhotoImage({ uri, label, contain, aspectRatio = 4 / 3 }: { uri?: string; label: string; contain?: boolean; aspectRatio?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  useEffect(() => { opacity.setValue(0); }, [uri, opacity]);
  return <View className="overflow-hidden bg-gray-200 dark:bg-gray-700" style={{ aspectRatio }}>
    {uri ? <Animated.Image accessibilityLabel={label} source={{ uri }} resizeMode={contain ? 'contain' : 'cover'} style={{ width: '100%', height: '100%', opacity }}
      onLoad={() => Animated.timing(opacity, { toValue: 1, duration: reduced ? 0 : 450, useNativeDriver: true }).start()} /> : null}
  </View>;
}
