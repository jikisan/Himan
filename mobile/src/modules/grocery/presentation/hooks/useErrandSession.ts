import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GrocerySessionRepository } from '@himan/shared/grocery';
import type { GrocerySessionType, SessionItemType } from '@himan/shared/grocery';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { groceryKeys } from './queryKeys';
import { useSync } from '../contexts/SyncProvider';

export interface PurchaseDetails {
  pricePaid?: number | null;
  quantityPurchased?: number | null;
  aisle?: string | null;
  storeId?: string | null;
  category?: string | null;
  notes?: string | null;
}

/**
 * Offline-first errand session. Reads from the (persisted) React Query cache
 * and writes optimistically, enqueuing each change to the sync outbox so the
 * flow survives airplane mode and drains on reconnect.
 */
export function useErrandSession() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const { enqueue } = useSync();
  const repository = useMemo(() => new GrocerySessionRepository(), []);

  const { data: session = null, isLoading } = useQuery({
    queryKey: groceryKeys.activeSession(),
    queryFn: () => repository.findActiveForUser(userId!),
    enabled: !!userId,
  });

  const patchItem = useCallback(
    (itemId: string, patch: Partial<SessionItemType>) => {
      queryClient.setQueryData<GrocerySessionType | null>(
        groceryKeys.activeSession(),
        (old) =>
          old
            ? {
                ...old,
                items: old.items.map((it) =>
                  it.id === itemId ? { ...it, ...patch } : it
                ),
              }
            : old
      );
    },
    [queryClient]
  );

  const togglePurchase = useCallback(
    async (item: SessionItemType, details?: PurchaseDetails) => {
      const nextPurchased = !item.isPurchased;
      const purchasedAt = nextPurchased ? new Date() : null;

      patchItem(item.id, {
        isPurchased: nextPurchased,
        purchasedAt,
        pricePaid: nextPurchased ? details?.pricePaid ?? item.pricePaid : null,
        quantityPurchased: nextPurchased
          ? details?.quantityPurchased ?? item.quantityPurchased
          : null,
        aisle: details?.aisle ?? item.aisle,
        storeId: details?.storeId ?? item.storeId,
        category: details?.category ?? item.category,
        notes: details?.notes ?? item.notes,
      });

      await enqueue({
        type: 'update',
        entity: 'sessionItem',
        entityId: item.id,
        payload: {
          isPurchased: nextPurchased,
          purchasedAt: purchasedAt ? purchasedAt.toISOString() : null,
          ...(nextPurchased && details
            ? {
                pricePaid: details.pricePaid ?? null,
                quantityPurchased: details.quantityPurchased ?? null,
                aisle: details.aisle ?? null,
                storeId: details.storeId ?? null,
                category: details.category ?? null,
                notes: details.notes ?? null,
              }
            : { pricePaid: null, quantityPurchased: null }),
        },
      });
    },
    [enqueue, patchItem]
  );

  const completeErrand = useCallback(async () => {
    if (!session) return;
    // Optimistically clear the active session from cache.
    queryClient.setQueryData(groceryKeys.activeSession(), null);
    await enqueue({
      type: 'update', // 'update' on a session = complete()
      entity: 'session',
      entityId: session.id,
    });
  }, [session, enqueue, queryClient]);

  const cancelErrand = useCallback(async () => {
    if (!session) return;
    queryClient.setQueryData(groceryKeys.activeSession(), null);
    await enqueue({ type: 'delete', entity: 'session', entityId: session.id });
  }, [session, enqueue, queryClient]);

  return {
    session,
    isLoading,
    togglePurchase,
    completeErrand,
    cancelErrand,
  };
}
