import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  CategoryType,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../../domain';
import { CategoryRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';

export const useCategories = () => {
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { canCreateCategory, refreshUsage } = useSubscription();
  const isLoadingRef = useRef(false);

  const repository = useMemo(() => new CategoryRepository(), []);
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
      console.error('Error loading categories:', err);
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
      dto: Omit<CreateCategoryDto, 'userId'>
    ): Promise<CategoryType | null> => {
      if (!userId) return null;

      // Check if user can create a category
      const accessCheck = canCreateCategory();
      if (!accessCheck.allowed) {
        const errorMessage = accessCheck.reason || 'Cannot create category';
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
        console.error('Error creating category:', err);
        return null;
      }
    },
    [userId, repository, canCreateCategory, refreshUsage]
  );

  const updateCategory = useCallback(
    async (
      id: string,
      dto: UpdateCategoryDto
    ): Promise<CategoryType | null> => {
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
        console.error('Error updating category:', err);
        return null;
      }
    },
    [repository]
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await repository.delete(id);
        setCategories((prev) =>
          prev.filter((category) => category.id !== id)
        );
        // Refresh usage counts after deleting
        await refreshUsage();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete category';
        setError(errorMessage);
        console.error('Error deleting category:', err);
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
