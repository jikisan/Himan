import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export function CatalogEmptyState() {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <View className="items-center px-8 py-20">
      <Feather name="book" size={36} color={c.inkSoft} />
      <Text className="mt-3 text-center text-ink-soft dark:text-ink-softdark font-serif">
        Your catalog is empty. Search a product name and add it.
      </Text>
    </View>
  );
}
