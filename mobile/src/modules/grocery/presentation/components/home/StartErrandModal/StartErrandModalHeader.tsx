import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SectionHeading } from '@/modules/grocery/presentation/components/notebook';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface StartErrandModalHeaderProps {
  c: NotebookColors;
  onClose: () => void;
}

export function StartErrandModalHeader({ c, onClose }: StartErrandModalHeaderProps) {
  return (
    <View className="flex-row items-center justify-between mb-2">
      <SectionHeading size="lg">Start an errand</SectionHeading>
      <Pressable onPress={onClose} hitSlop={8}>
        <Feather name="x" size={22} color={c.inkSoft} />
      </Pressable>
    </View>
  );
}
