import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { EducationRepository } from '../../infrastructure';
import { sortByPosition, type CreateEducationDto, type UpdateEducationDto } from '@himan/shared/profile';
import { Logger } from '@core/infrastructure/services';

export const educationKeys = {
  all: ['profile-education'] as const,
  list: (userId: string) => [...educationKeys.all, userId] as const,
};

export const useEducation = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new EducationRepository(), []);

  const { data: education = [], isLoading: loading, error } = useQuery({
    queryKey: educationKeys.list(userId || ''),
    queryFn: async () => sortByPosition(await repository.findAll(userId!)),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: educationKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateEducationDto, 'userId'>) => repository.create({ ...dto, userId: userId! }),
    onSuccess: () => {
      invalidate();
      toast.success('Education added');
    },
    onError: (err) => {
      Logger.error('Error creating education', err);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEducationDto }) => repository.update(id, userId!, dto),
    onSuccess: () => {
      invalidate();
      toast.success('Education saved');
    },
    onError: (err) => {
      Logger.error('Error updating education', err);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id, userId!),
    onSuccess: () => {
      invalidate();
      toast.success('Education removed');
    },
    onError: (err) => {
      Logger.error('Error deleting education', err);
      toast.error('Failed to delete education');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => repository.reorder(userId!, orderedIds),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error reordering education', err);
      toast.error('Failed to reorder education');
    },
  });

  return {
    data: education,
    loading,
    error: error?.message ?? null,
    create: (dto: Omit<CreateEducationDto, 'userId'>) => createMutation.mutateAsync(dto),
    update: (id: string, dto: UpdateEducationDto) => updateMutation.mutateAsync({ id, dto }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    reorder: (orderedIds: string[]) => reorderMutation.mutateAsync(orderedIds),
  };
};
