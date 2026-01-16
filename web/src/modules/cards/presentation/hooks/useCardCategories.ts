import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  CardCategoryType,
  CreateCardCategoryDto,
  UpdateCardCategoryDto,
} from '../../domain';
import { CardCategoryRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

export const useCardCategories = () => {
  const [categories, setCategories] = useState<CardCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { canCreateCardCategory, refreshUsage } = useSubscription();
  const isLoadingRef = useRef(false);

  const repository = useMemo(() => new CardCategoryRepository(), []);
  const userId = user?.id;

  const loadCategories = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await repository.findAll(userId);
      setCategories(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load categories';
      setError(errorMessage);
      Logger.error('Error loading card categories', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, repository]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const createCategory = useCallback(
    async (
      dto: Omit<CreateCardCategoryDto, 'userId'>
    ): Promise<CardCategoryType | null> => {
      if (!userId) return null;

      // Check if user can create a category
      const accessCheck = canCreateCardCategory();
      if (!accessCheck.allowed) {
        const errorMessage = accessCheck.reason || 'Cannot create card category';
        setError(errorMessage);
        return null;
      }

      try {
        const newCategory = await repository.create({ ...dto, userId });
        setCategories((prev) => [...prev, newCategory]);
        // Refresh usage counts after creating
        await refreshUsage();
        return newCategory;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create category';
        setError(errorMessage);
        Logger.error('Error creating card category', err);
        return null;
      }
    },
    [userId, repository, canCreateCardCategory, refreshUsage]
  );

  const updateCategory = useCallback(
    async (
      id: string,
      dto: UpdateCardCategoryDto
    ): Promise<CardCategoryType | null> => {
      try {
        const updatedCategory = await repository.update(id, dto);
        setCategories((prev) =>
          prev.map((category) =>
            category.id === id ? updatedCategory : category
          )
        );
        return updatedCategory;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update category';
        setError(errorMessage);
        Logger.error('Error updating card category', err);
        return null;
      }
    },
    [repository]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await repository.delete(id);
        setCategories((prev) => prev.filter((category) => category.id !== id));
        // Refresh usage counts after deleting
        await refreshUsage();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete category';
        setError(errorMessage);
        Logger.error('Error deleting card category', err);
        return false;
      }
    },
    [repository, refreshUsage]
  );

  return {
    categories,
    loading,
    error,
    refetch: loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};