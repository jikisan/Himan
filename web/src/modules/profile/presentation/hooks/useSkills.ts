import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { SkillRepository } from '../../infrastructure';
import { sortByPosition, type CreateSkillDto, type UpdateSkillDto } from '@himan/shared/profile';
import { Logger } from '@core/infrastructure/services';

export const skillKeys = {
  all: ['profile-skills'] as const,
  list: (userId: string) => [...skillKeys.all, userId] as const,
};

export const useSkills = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new SkillRepository(), []);

  const { data: skills = [], isLoading: loading, error } = useQuery({
    queryKey: skillKeys.list(userId || ''),
    queryFn: async () => sortByPosition(await repository.findAll(userId!)),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: skillKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateSkillDto, 'userId'>) => repository.create({ ...dto, userId: userId! }),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error creating skill', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create skill');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSkillDto }) => repository.update(id, userId!, dto),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error updating skill', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save skill');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id, userId!),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error deleting skill', err);
      toast.error('Failed to delete skill');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => repository.reorder(userId!, orderedIds),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error reordering skills', err);
      toast.error('Failed to reorder skills');
    },
  });

  return {
    data: skills,
    loading,
    error: error?.message ?? null,
    create: (dto: Omit<CreateSkillDto, 'userId'>) => createMutation.mutateAsync(dto),
    update: (id: string, dto: UpdateSkillDto) => updateMutation.mutateAsync({ id, dto }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    reorder: (orderedIds: string[]) => reorderMutation.mutateAsync(orderedIds),
  };
};
