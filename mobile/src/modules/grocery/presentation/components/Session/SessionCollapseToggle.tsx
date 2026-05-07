import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CollapseLevel } from './types';

interface SessionCollapseToggleProps {
  collapseLevel: CollapseLevel;
  onToggle: () => void;
  visible: boolean;
}

const getCollapseIcon = (level: CollapseLevel): keyof typeof Feather.glyphMap => {
  switch (level) {
    case 0:
      return 'maximize-2';
    case 1:
      return 'minimize-2';
    case 2:
      return 'chevrons-down';
  }
};

export const SessionCollapseToggle = ({
  collapseLevel,
  onToggle,
  visible,
}: SessionCollapseToggleProps) => {
  if (!visible) return null;

  return (
    <View className="px-3 py-2 flex-row justify-end">
      <Pressable onPress={onToggle} className="p-2">
        <Feather name={getCollapseIcon(collapseLevel)} size={18} color="#6b7280" />
      </Pressable>
    </View>
  );
};
