import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { CategoryRepository } from '@himan/shared/passwords';
import type { CategoryType, CreateCategoryDto, UpdateCategoryDto } from '@himan/shared/passwords';
import { passwordsKeys } from './queryKeys';
import { getLogger } from '@himan/shared';

const logger = getLogger();

export const usePasswordCategories = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new CategoryRepository(), []);
  const userId = user?.id;

  const { data: categories = [], isLoading: loading, error } = useQuery({
    queryKey: passwordsKeys.categories(),
    queryFn: () => repository.findAll(userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateCategoryDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return repository.create({ ...dto, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordsKeys.categories() });
    },
    onError: (err) => {
      logger.error('Error creating password category', err);
      Alert.alert('Error', 'Failed to save category');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) =>
      repository.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordsKeys.categories() });
    },
    onError: (err) => {
      logger.error('Error updating password category', err);
      Alert.alert('Error', 'Failed to update category');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordsKeys.categories() });
      queryClient.invalidateQueries({ queryKey: passwordsKeys.passwords() });
    },
    onError: (err) => {
      logger.error('Error deleting password category', err);
      Alert.alert('Error', 'Failed to delete category');
    },
  });

  const createCategory = useCallback(
    async (dto: Omit<CreateCategoryDto, 'userId'>): Promise<CategoryType | null> => {
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
    async (id: string, dto: UpdateCategoryDto): Promise<CategoryType | null> => {
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
