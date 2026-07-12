import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { GroceryItemRepository, ProductCatalogRepository } from '@himan/shared/grocery';
import type {
  CreateGroceryItemDto,
  UpdateGroceryItemDto,
  GroceryItemType,
} from '@himan/shared/grocery';
import { groceryKeys } from './queryKeys';
import { getLogger } from '@himan/shared';

const logger = getLogger();

export const useGroceryItems = (listId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const itemRepository = useMemo(() => new GroceryItemRepository(), []);
  const catalogRepository = useMemo(() => new ProductCatalogRepository(), []);
  const userId = user?.id;

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: groceryKeys.items(listId!),
    queryFn: () => itemRepository.findAll({ listId: listId! }),
    enabled: !!listId,
  });

  const uncheckedItems = useMemo(
    () => items.filter((item) => !item.isChecked),
    [items]
  );

  const checkedItems = useMemo(
    () => items.filter((item) => item.isChecked),
    [items]
  );

  const groupedItems = useMemo(() => {
    const groups = new Map<string, GroceryItemType[]>();
    for (const item of uncheckedItems) {
      const key = item.category || 'Other';
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }
    return groups;
  }, [uncheckedItems]);

  const addItemMutation = useMutation({
    mutationFn: async (dto: CreateGroceryItemDto) => {
      const item = await itemRepository.create(dto, userId!);
      // Upsert to product catalog
      if (userId) {
        try {
          const product = await catalogRepository.upsert(userId, {
            name: dto.name,
            category: dto.category,
            defaultQuantity: dto.quantity,
            defaultUnit: dto.unit,
          });
          // If product was created/found, update item with product_id
          if (product && !dto.productId) {
            await itemRepository.update(item.id, { name: item.name });
          }
        } catch {
          // Catalog upsert is best-effort
        }
      }
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.items(listId!) });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.catalog() });
    },
    onError: (err) => {
      logger.error('Error adding grocery item', err);
      Alert.alert('Error', 'Failed to add item');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateGroceryItemDto }) =>
      itemRepository.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.items(listId!) });
    },
    onError: (err) => {
      logger.error('Error updating grocery item', err);
      Alert.alert('Error', 'Failed to update item');
    },
  });

  const checkItemMutation = useMutation({
    mutationFn: ({ itemId, price }: { itemId: string; price?: number | null }) =>
      itemRepository.checkItem(itemId, { checkedBy: userId!, price }),
    onMutate: async ({ itemId, price }) => {
      await queryClient.cancelQueries({ queryKey: groceryKeys.items(listId!) });
      const previous = queryClient.getQueryData<GroceryItemType[]>(groceryKeys.items(listId!));
      queryClient.setQueryData<GroceryItemType[]>(groceryKeys.items(listId!), (old) =>
        old?.map((item) =>
          item.id === itemId
            ? {
                ...item,
                isChecked: true,
                checkedBy: userId!,
                checkedAt: new Date(),
                price: price ?? null,
              }
            : item
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(groceryKeys.items(listId!), context.previous);
      }
      Alert.alert('Error', 'Failed to check item');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.items(listId!) });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    },
  });

  const uncheckItemMutation = useMutation({
    mutationFn: (itemId: string) => itemRepository.uncheckItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: groceryKeys.items(listId!) });
      const previous = queryClient.getQueryData<GroceryItemType[]>(groceryKeys.items(listId!));
      queryClient.setQueryData<GroceryItemType[]>(groceryKeys.items(listId!), (old) =>
        old?.map((item) =>
          item.id === itemId
            ? { ...item, isChecked: false, checkedBy: null, checkedAt: null, price: null }
            : item
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(groceryKeys.items(listId!), context.previous);
      }
      Alert.alert('Error', 'Failed to uncheck item');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.items(listId!) });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => itemRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.items(listId!) });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    },
    onError: (err) => {
      logger.error('Error deleting grocery item', err);
      Alert.alert('Error', 'Failed to delete item');
    },
  });

  const clearCheckedMutation = useMutation({
    mutationFn: () => itemRepository.clearChecked(listId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.items(listId!) });
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
      Alert.alert('Success', 'Checked items cleared');
    },
    onError: (err) => {
      logger.error('Error clearing checked items', err);
      Alert.alert('Error', 'Failed to clear checked items');
    },
  });

  const addItem = useCallback(
    (dto: CreateGroceryItemDto) => addItemMutation.mutateAsync(dto),
    [addItemMutation]
  );

  const updateItem = useCallback(
    (id: string, dto: UpdateGroceryItemDto) =>
      updateItemMutation.mutateAsync({ id, dto }),
    [updateItemMutation]
  );

  const checkItem = useCallback(
    (itemId: string, price?: number | null) =>
      checkItemMutation.mutate({ itemId, price }),
    [checkItemMutation]
  );

  const uncheckItem = useCallback(
    (itemId: string) => uncheckItemMutation.mutate(itemId),
    [uncheckItemMutation]
  );

  const deleteItem = useCallback(
    (id: string) => deleteItemMutation.mutateAsync(id),
    [deleteItemMutation]
  );

  const clearChecked = useCallback(
    () => clearCheckedMutation.mutateAsync(),
    [clearCheckedMutation]
  );

  return {
    items,
    uncheckedItems,
    checkedItems,
    groupedItems,
    loading,
    addItem,
    updateItem,
    checkItem,
    uncheckItem,
    deleteItem,
    clearChecked,
  };
};
