import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { CareerBlockRepository } from '../../infrastructure';
import type { CreateCareerBlockDto, UpdateCareerBlockDto } from '@himan/shared/career';
import { Logger } from '@core/infrastructure/services';

export const careerBlockKeys = {
  all: ['career-blocks'] as const,
  list: (userId: string) => [...careerBlockKeys.all, userId] as const,
};

export const useCareerBlocks = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new CareerBlockRepository(), []);

  const { data: blocks = [], isLoading: loading, error } = useQuery({
    queryKey: careerBlockKeys.list(userId || ''),
    queryFn: () => repository.findAllWithUsage(userId!),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: careerBlockKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateCareerBlockDto, 'userId'>) =>
      repository.create({ ...dto, userId: userId! }),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error creating career block', err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCareerBlockDto }) =>
      repository.update(id, userId!, dto),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error updating career block', err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id, userId!),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error deleting career block', err);
      toast.error('Failed to delete block');
    },
  });

  return {
    blocks,
    loading,
    error: error?.message ?? null,
    createBlock: (dto: Omit<CreateCareerBlockDto, 'userId'>) => createMutation.mutateAsync(dto),
    updateBlock: (id: string, dto: UpdateCareerBlockDto) => updateMutation.mutateAsync({ id, dto }),
    deleteBlock: (id: string) => deleteMutation.mutateAsync(id),
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
};
