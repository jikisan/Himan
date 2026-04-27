import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@auth/presentation/hooks';
import { GroceryRealtimeService } from '../../infrastructure/services';
import { groceryKeys } from './queryKeys';

export const useGroceryRealtime = (
  listId: string | null,
  activeSessionId?: string | null,
  existingService?: GroceryRealtimeService
) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  const ownService = useMemo(() => new GroceryRealtimeService(), []);
  const realtimeService = existingService ?? ownService;

  // Subscribe to item changes for the selected list
  useEffect(() => {
    if (!listId) return;

    realtimeService.subscribeToItems(listId, () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.items(listId) });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    });

    return () => {
      realtimeService.unsubscribeFromItems();
    };
  }, [listId, realtimeService, queryClient]);

  // Subscribe to session changes for the user
  useEffect(() => {
    if (!userId) return;

    realtimeService.subscribeToSessions(userId, () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    });

    return () => {
      realtimeService.unsubscribeFromSessions();
    };
  }, [userId, realtimeService, queryClient]);

  // Subscribe to session item changes (so all members see real-time purchases)
  useEffect(() => {
    if (!activeSessionId) return;

    realtimeService.subscribeToSessionItems(activeSessionId, () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
    });

    return () => {
      realtimeService.unsubscribeFromSessionItems();
    };
  }, [activeSessionId, realtimeService, queryClient]);

  return realtimeService;
};
