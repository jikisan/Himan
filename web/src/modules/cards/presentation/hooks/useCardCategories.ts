import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CardCategoryType,
  CreateCardCategoryDto,
  UpdateCardCategoryDto,
} from '../../domain';
import { CardCategoryRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

// Query key factory for better organization
const categoryKeys = {
  all: ['card-categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (userId: string) => [...categoryKeys.lists(), userId] as const,
};

export const useCardCategories = () => {
  const { user } = useAuth();
  const { canCreateCardCategory, refreshUsage } = useSubscription();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const repository = useMemo(() => new CardCategoryRepository(), []);

  // Query for fetching categories
  const {
    data: categories = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: categoryKeys.list(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await repository.findAll(userId);
      } catch (err) {
        Logger.error('Error loading card categories', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  // Mutation for creating categories
  const createCategoryMutation = useMutation({
    mutationFn: async (dto: Omit<CreateCardCategoryDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');

      // Check if user can create a category
      const accessCheck = canCreateCardCategory();
      if (!accessCheck.allowed) {
        throw new Error(accessCheck.reason || 'Cannot create card category');
      }

      return await repository.create({ ...dto, userId });
    },
    onSuccess: async () => {
      // Invalidate and refetch categories query
      await queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error creating card category', err);
    },
  });

  // Mutation for updating categories
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCardCategoryDto }) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.update(id, dto);
    },
    onSuccess: async () => {
      // Invalidate and refetch categories query
      await queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating card category', err);
    },
  });

  // Mutation for deleting categories
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await repository.delete(id);
    },
    onSuccess: async () => {
      // Invalidate and refetch categories query
      await queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error deleting card category', err);
    },
  });

  // Wrapper functions to maintain API compatibility
  const createCategory = async (dto: Omit<CreateCardCategoryDto, 'userId'>): Promise<CardCategoryType | null> => {
    try {
      const newCategory = await createCategoryMutation.mutateAsync(dto);
      return newCategory;
    } catch {
      return null;
    }
  };

  const updateCategory = async (id: string, dto: UpdateCardCategoryDto): Promise<CardCategoryType | null> => {
    try {
      const updatedCategory = await updateCategoryMutation.mutateAsync({ id, dto });
      return updatedCategory;
    } catch {
      return null;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    try {
      await deleteCategoryMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    categories,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load categories') : null,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
