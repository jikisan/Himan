import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { CareerCvBlockRepository } from '../../infrastructure';
import type { CreateCareerCvBlockDto, UpdateCareerCvBlockDto } from '@himan/shared/career';
import { Logger } from '@core/infrastructure/services';

export const cvBlockKeys = {
  all: ['career-cv-blocks'] as const,
  list: (userId: string) => [...cvBlockKeys.all, userId] as const,
};

export const useCvBlocks = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new CareerCvBlockRepository(), []);

  const { data: blocks = [], isLoading: loading, error } = useQuery({
    queryKey: cvBlockKeys.list(userId || ''),
    queryFn: () => repository.findAll(userId!),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: cvBlockKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateCareerCvBlockDto, 'userId'>) =>
      repository.create({ ...dto, userId: userId! }),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error creating CV block', err);
      toast.error('Failed to save CV block');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCareerCvBlockDto }) =>
      repository.update(id, userId!, dto),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error updating CV block', err);
      toast.error('Failed to save CV block');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id, userId!),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error deleting CV block', err);
      toast.error('Failed to delete CV block');
    },
  });

  return {
    blocks,
    loading,
    error: error?.message ?? null,
    createBlock: (dto: Omit<CreateCareerCvBlockDto, 'userId'>) => createMutation.mutateAsync(dto),
    updateBlock: (id: string, dto: UpdateCareerCvBlockDto) => updateMutation.mutateAsync({ id, dto }),
    deleteBlock: (id: string) => deleteMutation.mutateAsync(id),
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
};
