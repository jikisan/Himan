import { useEffect } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, focusManager } from '@tanstack/react-query';

/**
 * Bridges device connectivity + app focus into React Query.
 * - NetInfo → onlineManager: pauses queries/mutations while offline and
 *   fires online/offline transitions the sync engine listens for.
 * - AppState → focusManager: refetch on foreground.
 * Mount once, high in the tree (inside QueryClientProvider).
 */
export function NetworkProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => {
        setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
      })
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  return <>{children}</>;
}
