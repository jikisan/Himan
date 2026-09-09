import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@auth/presentation/hooks';
import { ProjectRepository } from '../../infrastructure';
import { sortByPosition, type CreateProjectDto, type UpdateProjectDto } from '@himan/shared/profile';
import { Logger } from '@core/infrastructure/services';

export const projectKeys = {
  all: ['profile-projects'] as const,
  list: (userId: string) => [...projectKeys.all, userId] as const,
};

export const useProjects = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const repository = useMemo(() => new ProjectRepository(), []);

  const { data: projects = [], isLoading: loading, error } = useQuery({
    queryKey: projectKeys.list(userId || ''),
    queryFn: async () => sortByPosition(await repository.findAll(userId!)),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: projectKeys.all });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateProjectDto, 'userId'>) => repository.create({ ...dto, userId: userId! }),
    onSuccess: () => {
      invalidate();
      toast.success('Project added');
    },
    onError: (err) => {
      Logger.error('Error creating project', err);
      toast.error('Failed to create project');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProjectDto }) => repository.update(id, userId!, dto),
    onSuccess: () => {
      invalidate();
      toast.success('Project saved');
    },
    onError: (err) => {
      Logger.error('Error updating project', err);
      toast.error('Failed to save project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id, userId!),
    onSuccess: () => {
      invalidate();
      toast.success('Project removed');
    },
    onError: (err) => {
      Logger.error('Error deleting project', err);
      toast.error('Failed to delete project');
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) => repository.reorder(userId!, orderedIds),
    onSuccess: invalidate,
    onError: (err) => {
      Logger.error('Error reordering projects', err);
      toast.error('Failed to reorder projects');
    },
  });

  return {
    data: projects,
    loading,
    error: error?.message ?? null,
    create: (dto: Omit<CreateProjectDto, 'userId'>) => createMutation.mutateAsync(dto),
    update: (id: string, dto: UpdateProjectDto) => updateMutation.mutateAsync({ id, dto }),
    remove: (id: string) => deleteMutation.mutateAsync(id),
    reorder: (orderedIds: string[]) => reorderMutation.mutateAsync(orderedIds),
  };
};
