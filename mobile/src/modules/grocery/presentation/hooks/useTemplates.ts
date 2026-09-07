import { useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { GroceryListRepository, GroceryItemRepository } from '@himan/shared/grocery';
import { getLogger } from '@himan/shared';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { groceryKeys } from './queryKeys';

const logger = getLogger();

/**
 * Templates are grocery lists in the redesigned model. Adds duplicate on top
 * of the base list CRUD: clones a template's items into a fresh list.
 */
export function useTemplates() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const listRepo = useMemo(() => new GroceryListRepository(), []);
  const itemRepo = useMemo(() => new GroceryItemRepository(), []);

  const duplicateMutation = useMutation({
    mutationFn: async ({ sourceId, name }: { sourceId: string; name: string }) => {
      const created = await listRepo.create({ name }, userId!);
      const items = await itemRepo.findAll({ listId: sourceId });
      for (const item of items) {
        await itemRepo.create(
          {
            listId: created.id,
            name: item.name,
            category: item.category ?? undefined,
            quantity: item.quantity,
            unit: item.unit ?? undefined,
            notes: item.notes ?? undefined,
            productId: item.productId ?? undefined,
          },
          userId!
        );
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    },
    onError: (err) => {
      logger.error('Error duplicating template', err);
      Alert.alert('Error', 'Failed to duplicate template');
    },
  });

  const duplicateTemplate = useCallback(
    (sourceId: string, sourceName: string) =>
      duplicateMutation.mutateAsync({ sourceId, name: `${sourceName} copy` }),
    [duplicateMutation]
  );

  return { duplicateTemplate, isDuplicating: duplicateMutation.isPending };
}
