import { Text, Pressable } from 'react-native';
import { useColorScheme } from 'nativewind';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface StartShoppingButtonProps {
  c: NotebookColors;
  canStart: boolean;
  isStarting: boolean;
  onPress: () => void;
}

export function StartShoppingButton({ c, canStart, isStarting, onPress }: StartShoppingButtonProps) {
  const { colorScheme } = useColorScheme();
  const foreground = colorScheme === 'dark' ? '#201e1d' : '#ffffff';

  return (
    <Pressable
      disabled={!canStart || isStarting}
      onPress={onPress}
      className="rounded-full py-3.5 items-center mt-4"
      style={{ backgroundColor: canStart ? c.accent : c.inkSoft, opacity: canStart ? 1 : 0.5 }}
    >
      <Text className="font-semibold" style={{ color: foreground }}>
        {isStarting ? 'Starting…' : 'Start shopping'}
      </Text>
    </Pressable>
  );
}
