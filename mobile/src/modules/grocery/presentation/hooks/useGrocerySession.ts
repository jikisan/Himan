import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { GrocerySessionRepository, GroceryRealtimeService } from '@himan/shared/grocery';
import type { SessionPresence, UpdateSessionItemDto } from '@himan/shared/grocery';
import { groceryKeys } from './queryKeys';
import { getLogger } from '@himan/shared';

const logger = getLogger();

export const useGrocerySession = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new GrocerySessionRepository(), []);
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
    const sessionId = activeSession?.id;
    if (!sessionId || !userId || !user?.email) return;

    realtimeService.subscribeToPresence(
      sessionId,
      userId,
      user.email,
      (presences) => setParticipants(presences)
    );

    return () => {
      realtimeService.unsubscribeFromPresence();
    };
  }, [activeSession?.id, userId, user?.email]);

  const startSessionMutation = useMutation({
    mutationFn: ({ listIds, storeName }: { listIds: string[]; storeName: string }) =>
      repository.create({ listIds, storeName }, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.recentStores() });
      Alert.alert('Success', 'Shopping session started');
    },
    onError: (err) => {
      logger.error('Error starting session', err);
      Alert.alert('Error', 'Failed to start shopping session');
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
      Alert.alert('Success', 'Shopping session ended');
    },
    onError: (err) => {
      logger.error('Error ending session', err);
      Alert.alert('Error', 'Failed to end shopping session');
    },
  });

  const cancelSessionMutation = useMutation({
    mutationFn: () => repository.cancel(activeSession!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      realtimeService.unsubscribeFromPresence();
      setParticipants([]);
      Alert.alert('Success', 'Shopping session cancelled');
    },
    onError: (err) => {
      logger.error('Error cancelling session', err);
      Alert.alert('Error', 'Failed to cancel shopping session');
    },
  });

  const purchaseItemMutation = useMutation({
    mutationFn: ({ sessionItemId, price }: {
      sessionItemId: string;
      groceryItemId: string | null;
      price?: number | null;
    }) => {
      const dto: UpdateSessionItemDto = {
        isPurchased: true,
        purchasedAt: new Date(),
        price: price ?? null,
      };
      return repository.updateSessionItem(sessionItemId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.items('') });
    },
    onError: (err) => {
      logger.error('Error purchasing item', err);
      Alert.alert('Error', 'Failed to update item');
    },
  });

  const unpurchaseItemMutation = useMutation({
    mutationFn: ({ sessionItemId }: {
      sessionItemId: string;
      groceryItemId: string | null;
    }) => {
      const dto: UpdateSessionItemDto = {
        isPurchased: false,
        purchasedAt: null,
        price: null,
      };
      return repository.updateSessionItem(sessionItemId, dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.items('') });
    },
    onError: (err) => {
      logger.error('Error unpurchasing item', err);
      Alert.alert('Error', 'Failed to update item');
    },
  });

  const addShopperMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!activeSession) throw new Error('No active session');
      const userResult = await repository.findUserByEmail(email);
      if (!userResult) throw new Error('User not found');
      return repository.addMember(activeSession.id, userResult.id, userId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      Alert.alert('Success', 'Shopper added');
    },
    onError: (err) => {
      logger.error('Error adding shopper', err);
      Alert.alert('Error', err.message === 'User not found' ? 'User not found with that email' : 'Failed to add shopper');
    },
  });

  const removeShopperMutation = useMutation({
    mutationFn: async (memberUserId: string) => {
      if (!activeSession) throw new Error('No active session');
      return repository.removeMember(activeSession.id, memberUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      Alert.alert('Success', 'Shopper removed');
    },
    onError: (err) => {
      logger.error('Error removing shopper', err);
      Alert.alert('Error', 'Failed to remove shopper');
    },
  });

  const addSessionItemMutation = useMutation({
    mutationFn: (dto: { name: string; category?: string; quantity?: number; unit?: string; notes?: string }) =>
      repository.addSessionItem({ sessionId: activeSession!.id, ...dto }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
    },
    onError: (err) => {
      logger.error('Error adding session item', err);
      Alert.alert('Error', 'Failed to add item');
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

  const addShopper = useCallback(
    (email: string) => addShopperMutation.mutateAsync(email),
    [addShopperMutation]
  );

  const removeShopper = useCallback(
    (memberUserId: string) => removeShopperMutation.mutateAsync(memberUserId),
    [removeShopperMutation]
  );

  const addSessionItem = useCallback(
    (dto: { name: string; category?: string; quantity?: number; unit?: string; notes?: string }) =>
      addSessionItemMutation.mutateAsync(dto),
    [addSessionItemMutation]
  );

  return {
    activeSession,
    participants,
    recentStores,
    realtimeService,
    startSession,
    endSession,
    cancelSession,
    purchaseItem,
    unpurchaseItem,
    addShopper,
    removeShopper,
    addSessionItem,
    isAddingSessionItem: addSessionItemMutation.isPending,
    isStarting: startSessionMutation.isPending,
    isEnding: endSessionMutation.isPending,
    isCancelling: cancelSessionMutation.isPending,
    isAddingShopper: addShopperMutation.isPending,
  };
};
