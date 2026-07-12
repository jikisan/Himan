import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function useToast() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(-120)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(anim, { toValue: -120, duration: 250, useNativeDriver: true }).start(() =>
        setToast(null)
      );
    }, 2500);
  }, [anim]);

  const ToastView = toast ? (
    <Animated.View
      style={{
        transform: [{ translateY: anim }],
        top: 0,
        paddingTop: insets.top + 10,
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 100,
      }}
      className={`px-4 pb-3 flex-row items-center gap-2 shadow-md ${
        toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
      }`}
    >
      <Feather
        name={toast.type === 'success' ? 'check-circle' : 'x-circle'}
        size={18}
        color="#ffffff"
      />
      <Text className="text-white font-medium flex-1">{toast.message}</Text>
    </Animated.View>
  ) : null;

  return { showToast, ToastView };
}
