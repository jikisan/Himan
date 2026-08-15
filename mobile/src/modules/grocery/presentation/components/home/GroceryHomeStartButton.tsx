import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface GroceryHomeStartButtonProps {
  c: NotebookColors;
  insetsBottom: number;
  onPress: () => void;
}

export function GroceryHomeStartButton({ c, insetsBottom, onPress }: GroceryHomeStartButtonProps) {
  const { colorScheme } = useColorScheme();
  const foreground = colorScheme === 'dark' ? '#201e1d' : '#ffffff';

  return (
    <View className="px-5" style={{ paddingBottom: Math.max(insetsBottom, 16) }}>
      <Pressable
        onPress={onPress}
        className="rounded-full py-4 items-center flex-row justify-center gap-2"
        style={{ backgroundColor: c.accent }}
      >
        <Feather name="shopping-cart" size={18} color={foreground} />
        <Text className="font-semibold text-base" style={{ color: foreground }}>
          Start an errand
        </Text>
      </Pressable>
    </View>
  );
}
