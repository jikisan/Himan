import { View, Pressable, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface GroceryListCollapseToggleProps {
  collapseLevel: 0 | 1 | 2;
  onToggle: () => void;
  visible: boolean;
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
}

export function GroceryListCollapseToggle({
  collapseLevel,
  onToggle,
  visible,
  allSelected = false,
  onToggleSelectAll,
}: GroceryListCollapseToggleProps) {
  if (!visible) return null;

  const iconName = collapseLevel === 2 ? 'minimize-2' : 'maximize-2';

  return (
    <View className="px-3 py-2 flex-row items-center justify-between">
      {onToggleSelectAll ? (
        <Pressable onPress={onToggleSelectAll} className="px-2 py-1">
          <Text className="text-[13px] font-serif text-accent-text dark:text-accent-textdark">
            {allSelected ? 'Uncheck all' : 'Check all'}
          </Text>
        </Pressable>
      ) : (
        <View />
      )}
      <Pressable onPress={onToggle} className="p-2">
        <Feather name={iconName} size={18} color="#7d7979" />
      </Pressable>
    </View>
  );
}
