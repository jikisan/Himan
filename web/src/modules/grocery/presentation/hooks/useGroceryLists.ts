import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { GroceryListRepository } from '../../infrastructure/repositories';
import type { CreateGroceryListDto, UpdateGroceryListDto } from '../../domain';
import { groceryKeys } from './queryKeys';
import { Logger } from '@core/infrastructure/services';

export const useGroceryLists = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new GroceryListRepository(), []);
  const userId = user?.id;

  const { data: lists = [], isLoading: loading, error } = useQuery({
    queryKey: groceryKeys.lists(),
    queryFn: () => repository.findAll(userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateGroceryListDto) => repository.create(dto, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error creating grocery list', err);
      toast.error('Failed to create grocery list');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateGroceryListDto }) =>
      repository.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating grocery list', err);
      toast.error('Failed to update grocery list');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error deleting grocery list', err);
      toast.error('Failed to delete grocery list');
    },
  });

  const createList = useCallback(
    async (dto: CreateGroceryListDto) => {
      if (!userId) return null;
      return createMutation.mutateAsync(dto);
    },
    [userId, createMutation]
  );

  const updateList = useCallback(
    async (id: string, dto: UpdateGroceryListDto) => {
      return updateMutation.mutateAsync({ id, dto });
    },
    [updateMutation]
  );

  const deleteList = useCallback(
    async (id: string) => {
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  return {
    lists,
    loading,
    error: error?.message ?? null,
    createList,
    updateList,
    deleteList,
  };
};
