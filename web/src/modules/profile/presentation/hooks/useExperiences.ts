import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { ExperienceRepository } from '../../infrastructure';
import { sortByPosition, type CreateExperienceDto, type UpdateExperienceDto } from '@himan/shared/profile';
import { Logger } from '@core/infrastructure/services';

export const experienceKeys = {
  all: ['profile-experiences'] as const,
  list: (userId: string) => [...experienceKeys.all, userId] as const,
};

export const useExperiences = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new ExperienceRepository(), []);

  const { data: experiences = [], isLoading: loading, error } = useQuery({
    queryKey: experienceKeys.list(userId || ''),
    queryFn: async () => sortByPosition(await repository.findAll(userId!)),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: experienceKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateExperienceDto, 'userId'>) => repository.create({ ...dto, userId: userId! }),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error creating experience', err);
      toast.error('Failed to create experience');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateExperienceDto }) => repository.update(id, userId!, dto),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error updating experience', err);
      toast.error('Failed to save experience');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id, userId!),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error deleting experience', err);
      toast.error('Failed to delete experience');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => repository.reorder(userId!, orderedIds),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error reordering experiences', err);
      toast.error('Failed to reorder experiences');
    },
  });

  return {
    data: experiences,
    loading,
    error: error?.message ?? null,
    create: (dto: Omit<CreateExperienceDto, 'userId'>) => createMutation.mutateAsync(dto),
    update: (id: string, dto: UpdateExperienceDto) => updateMutation.mutateAsync({ id, dto }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    reorder: (orderedIds: string[]) => reorderMutation.mutateAsync(orderedIds),
  };
};
