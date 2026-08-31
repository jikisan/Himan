import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { CareerItemRepository, CareerItemBlockRepository, CareerStorageService } from '../../infrastructure';
import type { CareerItemType, CreateCareerItemDto, UpdateCareerItemDto } from '@himan/shared/career';
import { Logger } from '@core/infrastructure/services';

export const careerItemKeys = {
  all: ['career-items'] as const,
  list: (userId: string) => [...careerItemKeys.all, userId] as const,
};

export const useCareerItems = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const itemRepository = useMemo(() => new CareerItemRepository(), []);
  const itemBlockRepository = useMemo(() => new CareerItemBlockRepository(), []);
  const storageService = useMemo(() => new CareerStorageService(), []);

  const { data: items = [], isLoading: loading, error } = useQuery({
    queryKey: careerItemKeys.list(userId || ''),
    queryFn: () => itemRepository.findAll(userId!),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: careerItemKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateCareerItemDto, 'userId'>) =>
      itemRepository.create({ ...dto, userId: userId! }),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error creating career item', err);
      toast.error('Failed to create item');
    },
  });

  // Clones the block selection too, not just the item — the whole point is
  // skipping the block-by-block redraft for a new application of the same
  // role, only company/title/recipient change on generate.
  const duplicateMutation = useMutation({
    mutationFn: async (source: CareerItemType) => {
      const [created, sourceBlocks] = await Promise.all([
        itemRepository.create({ userId: userId!, name: `${source.name} (copy)` }),
        itemBlockRepository.findByItem(source.id),
      ]);
      if (sourceBlocks.length > 0) {
        await itemBlockRepository.replaceForItem({
          itemId: created.id,
          blocks: sourceBlocks.map((b) => ({ blockId: b.blockId, position: b.position, length: b.length })),
        });
      }
      return created;
    },
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error duplicating career item', err);
      toast.error('Failed to duplicate item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCareerItemDto }) =>
      itemRepository.update(id, userId!, dto),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error updating career item', err);
      toast.error('Failed to save item');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemRepository.delete(id, userId!),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error deleting career item', err);
      toast.error('Failed to delete item');
    },
  });

  const rotateMutation = useMutation({
    mutationFn: (itemId: string) => storageService.rotateShareToken(itemId, userId!),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error revoking career share link', err);
      toast.error('Failed to revoke share link');
    },
  });

  return {
    items,
    loading,
    error: error?.message ?? null,
    createItem: (dto: Omit<CreateCareerItemDto, 'userId'>) => createMutation.mutateAsync(dto),
    duplicateItem: (source: CareerItemType) => duplicateMutation.mutateAsync(source),
    updateItem: (id: string, dto: UpdateCareerItemDto) => updateMutation.mutateAsync({ id, dto }),
    deleteItem: (id: string) => deleteMutation.mutateAsync(id),
    rotateShareLink: (itemId: string) => rotateMutation.mutateAsync(itemId),
  };
};
