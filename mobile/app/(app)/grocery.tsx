import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { useErrandSession } from '@/modules/grocery/presentation/hooks/useErrandSession';
import { PaperSurface } from '@/modules/grocery/presentation/components/notebook';
import {
  GroceryHomeHeader,
  GroceryHomeErrandBanner,
  GroceryHomeShelfGrid,
  GroceryHomeStartButton,
  StartErrandModal,
} from '@/modules/grocery/presentation/components/home';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export default function GroceryHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const { session } = useErrandSession();
  const [startOpen, setStartOpen] = useState(false);

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <GroceryHomeHeader c={c} />

        <ScrollView className="flex-1 px-5 mt-4" contentContainerStyle={{ paddingBottom: 40 }}>
          {session ? <GroceryHomeErrandBanner session={session} c={c} /> : null}
          <GroceryHomeShelfGrid c={c} />
        </ScrollView>

        {!session ? (
          <GroceryHomeStartButton c={c} insetsBottom={insets.bottom} onPress={() => setStartOpen(true)} />
        ) : null}
      </SafeAreaView>

      <StartErrandModal
        visible={startOpen}
        onClose={() => setStartOpen(false)}
        userId={user?.id ?? ''}
        onStarted={() => {
          setStartOpen(false);
          router.push('/grocery/session');
        }}
        insetsBottom={insets.bottom}
      />
    </PaperSurface>
  );
}
