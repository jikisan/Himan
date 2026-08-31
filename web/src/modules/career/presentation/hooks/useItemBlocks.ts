import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CareerItemBlockRepository } from '../../infrastructure';
import type { ComposableBlock, SetItemBlocksDto } from '@himan/shared/career';
import { Logger } from '@core/infrastructure/services';

export const itemBlockKeys = {
  all: ['career-item-blocks'] as const,
  item: (itemId: string) => [...itemBlockKeys.all, itemId] as const,
};

// Stable reference: `data: itemBlocks = []` would create a new array every
// render while the query has no data (e.g. disabled with no itemId), which
// loops forever in any effect keyed on `itemBlocks`.
const EMPTY_ITEM_BLOCKS: ComposableBlock[] = [];

export const useItemBlocks = (itemId: string | undefined) => {
  const queryClient = useQueryClient();
  const repository = useMemo(() => new CareerItemBlockRepository(), []);

  const { data: itemBlocks = EMPTY_ITEM_BLOCKS, isLoading: loading } = useQuery({
    queryKey: itemBlockKeys.item(itemId || ''),
    queryFn: () => repository.findByItem(itemId!),
    enabled: !!itemId,
  });

  const saveMutation = useMutation({
    mutationFn: (blocks: SetItemBlocksDto['blocks']) =>
      repository.replaceForItem({ itemId: itemId!, blocks }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: itemBlockKeys.item(itemId!) }),
    onError: (err) => {
      Logger.error('Error saving item block selection', err);
      toast.error('Failed to save block selection');
    },
  });

  return {
    itemBlocks,
    loading,
    saveItemBlocks: (blocks: SetItemBlocksDto['blocks']) => saveMutation.mutateAsync(blocks),
    isSaving: saveMutation.isPending,
  };
};
