import { View, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface GroceryListCollapseToggleProps {
  collapseLevel: 0 | 1 | 2;
  onToggle: () => void;
  visible: boolean;
}

export function GroceryListCollapseToggle({
  collapseLevel,
  onToggle,
  visible,
}: GroceryListCollapseToggleProps) {
  if (!visible) return null;

  const iconName = collapseLevel === 2 ? 'minimize-2' : 'maximize-2';

  return (
    <View className="px-3 py-2 flex-row justify-end">
      <Pressable onPress={onToggle} className="p-2">
        <Feather name={iconName} size={18} color="#7d7979" />
      </Pressable>
    </View>
  );
}
