import { Pressable, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

interface CatalogAddRowProps {
  name: string;
  onPress: () => void;
}

export function CatalogAddRow({ name, onPress }: CatalogAddRowProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-2 px-6 py-4 border-b border-rule dark:border-rule-dark active:bg-black/5"
    >
      <Feather name="plus-circle" size={20} color={c.accent} />
      <Text style={{ color: c.accent }}>Add “{name}” to catalog</Text>
    </Pressable>
  );
}
