import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { ProductCatalogRepository } from '../../infrastructure/repositories';
import type { CreateProductDto, UpdateProductDto, ProductFilters } from '../../domain';
import { groceryKeys } from './queryKeys';
import { Logger } from '@core/infrastructure/services';

export const useProductCatalog = (filters?: ProductFilters) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new ProductCatalogRepository(), []);
  const userId = user?.id;

  const queryKey = filters?.searchQuery
    ? groceryKeys.catalogSearch(filters.searchQuery)
    : groceryKeys.catalog();

  const { data: products = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => repository.findAll(userId!, filters),
    enabled: !!userId,
  });

  const upsertMutation = useMutation({
    mutationFn: (dto: CreateProductDto) => repository.upsert(userId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.catalog() });
    },
    onError: (err) => {
      Logger.error('Error saving product', err);
      toast.error('Failed to save product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProductDto }) =>
      repository.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.catalog() });
    },
    onError: (err) => {
      Logger.error('Error updating product', err);
      toast.error('Failed to update product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.catalog() });
    },
    onError: (err) => {
      Logger.error('Error deleting product', err);
      toast.error('Failed to delete product');
    },
  });

  const upsertProduct = useCallback(
    (dto: CreateProductDto) => upsertMutation.mutateAsync(dto),
    [upsertMutation]
  );

  const updateProduct = useCallback(
    (id: string, dto: UpdateProductDto) => updateMutation.mutateAsync({ id, dto }),
    [updateMutation]
  );

  const deleteProduct = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation]
  );

  return {
    products,
    loading,
    upsertProduct,
    updateProduct,
    deleteProduct,
  };
};
