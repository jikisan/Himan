import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { GrocerySessionRepository } from '../../infrastructure/repositories';
import { GroceryRealtimeService } from '../../infrastructure/services';
import type { SessionPresence, UpdateSessionItemDto } from '../../domain';
import { groceryKeys } from './queryKeys';
import { Logger } from '@core/infrastructure/services';
import { GroceryItemRepository } from '../../infrastructure/repositories';

export const useGrocerySession = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new GrocerySessionRepository(), []);
  const itemRepository = useMemo(() => new GroceryItemRepository(), []);
  const realtimeService = useMemo(() => new GroceryRealtimeService(), []);
  const userId = user?.id;
  const [participants, setParticipants] = useState<SessionPresence[]>([]);

  const { data: activeSession = null } = useQuery({
    queryKey: groceryKeys.activeSession(),
    queryFn: () => repository.findActiveForUser(userId!),
    enabled: !!userId,
  });

  const { data: recentStores = [] } = useQuery({
    queryKey: groceryKeys.recentStores(),
    queryFn: () => repository.getRecentStoreNames(userId!),
    enabled: !!userId,
  });

  // Subscribe to presence when active session exists
  useEffect(() => {
    if (!activeSession || !userId || !user?.email) return;

    realtimeService.subscribeToPresence(
      activeSession.id,
      userId,
      user.email,
      (presences) => setParticipants(presences)
    );

    return () => {
      realtimeService.unsubscribeFromPresence();
    };
  }, [activeSession, userId, user?.email, realtimeService]);

  const startSessionMutation = useMutation({
    mutationFn: ({ listIds, storeName }: { listIds: string[]; storeName: string }) =>
      repository.create({ listIds, storeName }, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.recentStores() });
      toast.success('Shopping session started');
    },
    onError: (err) => {
      Logger.error('Error starting session', err);
      toast.error('Failed to start shopping session');
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: () => repository.complete(activeSession!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.catalog() });
      realtimeService.unsubscribeFromPresence();
      setParticipants([]);
      toast.success('Shopping session ended');
    },
    onError: (err) => {
      Logger.error('Error ending session', err);
      toast.error('Failed to end shopping session');
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: () => repository.cancel(activeSession!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      realtimeService.unsubscribeFromPresence();
      setParticipants([]);
      toast.success('Shopping session cancelled');
    },
    onError: (err) => {
      Logger.error('Error cancelling session', err);
      toast.error('Failed to cancel shopping session');
    },
  });

  const purchaseItemMutation = useMutation({
    mutationFn: async ({ sessionItemId, groceryItemId, price }: {
      sessionItemId: string;
      groceryItemId: string | null;
      price?: number | null;
    }) => {
      const dto: UpdateSessionItemDto = {
        isPurchased: true,
        purchasedAt: new Date(),
        price: price ?? null,
      };
      const result = await repository.updateSessionItem(sessionItemId, dto);

      // Sync checked state to the original grocery item
      if (groceryItemId) {
        await itemRepository.update(groceryItemId, {
          isChecked: true,
          checkedBy: userId,
          checkedAt: new Date(),
          price: price ?? null,
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.items('') });
    },
    onError: (err) => {
      Logger.error('Error purchasing item', err);
      toast.error('Failed to update item');
    },
  });

  const unpurchaseItemMutation = useMutation({
    mutationFn: async ({ sessionItemId, groceryItemId }: {
      sessionItemId: string;
      groceryItemId: string | null;
    }) => {
      const dto: UpdateSessionItemDto = {
        isPurchased: false,
        purchasedAt: null,
        price: null,
      };
      const result = await repository.updateSessionItem(sessionItemId, dto);

      // Sync unchecked state to the original grocery item
      if (groceryItemId) {
        await itemRepository.update(groceryItemId, {
          isChecked: false,
          checkedBy: null,
          checkedAt: null,
        });
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.items('') });
    },
    onError: (err) => {
      Logger.error('Error unpurchasing item', err);
      toast.error('Failed to update item');
    },
  });

  const startSession = useCallback(
    (listIds: string[], storeName: string) =>
      startSessionMutation.mutateAsync({ listIds, storeName }),
    [startSessionMutation]
  );

  const endSession = useCallback(
    () => endSessionMutation.mutateAsync(),
    [endSessionMutation]
  );

  const cancelSession = useCallback(
    () => cancelSessionMutation.mutateAsync(),
    [cancelSessionMutation]
  );

  const purchaseItem = useCallback(
    (sessionItemId: string, groceryItemId: string | null, price?: number | null) =>
      purchaseItemMutation.mutateAsync({ sessionItemId, groceryItemId, price }),
    [purchaseItemMutation]
  );

  const unpurchaseItem = useCallback(
    (sessionItemId: string, groceryItemId: string | null) =>
      unpurchaseItemMutation.mutateAsync({ sessionItemId, groceryItemId }),
    [unpurchaseItemMutation]
  );

  return {
    activeSession,
    participants,
    recentStores,
    startSession,
    endSession,
    cancelSession,
    purchaseItem,
    unpurchaseItem,
    isStarting: startSessionMutation.isPending,
    isEnding: endSessionMutation.isPending,
    isCancelling: cancelSessionMutation.isPending,
  };
};
