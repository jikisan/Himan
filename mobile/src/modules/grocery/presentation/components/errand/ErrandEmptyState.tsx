import { Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { PaperSurface } from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export function ErrandEmptyState() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1 items-center justify-center px-8">
        <Feather name="book-open" size={40} color={c.inkSoft} />
        <Text className="mt-4 text-center text-ink-soft dark:text-ink-softdark font-serif">
          No errand in progress. Start one from your lists.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 rounded-full px-5 py-2.5"
          style={{ backgroundColor: c.accent }}
        >
          <Text className="font-medium" style={{ color: colorScheme === 'dark' ? '#201e1d' : '#ffffff' }}>
            Back to lists
          </Text>
        </Pressable>
      </SafeAreaView>
    </PaperSurface>
  );
}
