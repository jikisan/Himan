import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { SectionHeading, SyncBadge } from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';
import { SearchBar } from './SearchBar';

interface CatalogHeaderProps {
  search: string;
  onSearchChange: (text: string) => void;
}

export function CatalogHeader({ search, onSearchChange }: CatalogHeaderProps) {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <View className="px-5 pt-2 pb-3 border-b border-rule dark:border-rule-dark">
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
          <Feather name="chevron-left" size={22} color={c.ink} />
          <Text className="text-ink dark:text-ink-dark font-serif">Notebook</Text>
        </Pressable>
        <SyncBadge />
      </View>
      <SectionHeading size="xl" className="mt-6">
        Catalog
      </SectionHeading>
      <SearchBar value={search} onChangeText={onSearchChange} />
    </View>
  );
}
