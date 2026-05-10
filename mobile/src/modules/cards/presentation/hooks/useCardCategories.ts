import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { CardCategoryRepository } from '@himan/shared/cards';
import type { CardCategoryType, CreateCardCategoryDto, UpdateCardCategoryDto } from '@himan/shared/cards';
import { cardsKeys } from './queryKeys';
import { getLogger } from '@himan/shared';

const logger = getLogger();

export const useCardCategories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new CardCategoryRepository(), []);
  const userId = user?.id;

  const { data: categories = [], isLoading: loading, error } = useQuery({
    queryKey: cardsKeys.categories(),
    queryFn: () => repository.findAll(userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateCardCategoryDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return repository.create({ ...dto, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsKeys.categories() });
    },
    onError: (err) => {
      logger.error('Error creating card category', err);
      Alert.alert('Error', 'Failed to save category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCardCategoryDto }) =>
      repository.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsKeys.categories() });
    },
    onError: (err) => {
      logger.error('Error updating card category', err);
      Alert.alert('Error', 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsKeys.categories() });
      queryClient.invalidateQueries({ queryKey: cardsKeys.cards() });
    },
    onError: (err) => {
      logger.error('Error deleting card category', err);
      Alert.alert('Error', 'Failed to delete category');
    },
  });

  const createCategory = useCallback(
    async (dto: Omit<CreateCardCategoryDto, 'userId'>): Promise<CardCategoryType | null> => {
      if (!userId) return null;
      try {
        return await createMutation.mutateAsync(dto);
      } catch {
        return null;
      }
    },
    [userId, createMutation]
  );

  const updateCategory = useCallback(
    async (id: string, dto: UpdateCardCategoryDto): Promise<CardCategoryType | null> => {
      try {
        return await updateMutation.mutateAsync({ id, dto });
      } catch {
        return null;
      }
    },
    [updateMutation]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  return {
    categories,
    loading,
    error: error?.message ?? null,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
