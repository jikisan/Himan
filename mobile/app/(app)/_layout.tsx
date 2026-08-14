import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { Redirect, Stack } from 'expo-router';
import {
  useFonts,
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  SourceSerif4_400Regular_Italic,
} from '@expo-google-fonts/source-serif-4';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ThemeProvider } from '../../contexts/ThemeProvider';
import { NetworkProvider } from '@/modules/shared/infrastructure/network/NetworkProvider';
import { SyncProvider } from '@/modules/grocery/presentation/contexts/SyncProvider';
import { sqlitePersister } from '@/modules/grocery/infrastructure/syncPersister';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep cache long enough to survive cold starts via the persister.
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      staleTime: 1000 * 30,
      networkMode: 'offlineFirst',
      retry: 2,
    },
  },
});

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [fontsLoaded] = useFonts({
    SourceSerif4_400Regular,
    SourceSerif4_600SemiBold,
    SourceSerif4_400Regular_Italic,
  });
  if (loading || !fontsLoaded) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: sqlitePersister, maxAge: Infinity }}
    >
      <NetworkProvider>
        <SyncProvider>
          <ThemeProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </SyncProvider>
      </NetworkProvider>
    </PersistQueryClientProvider>
  );
}
