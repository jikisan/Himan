import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateFileDto, UpdateFileDto, FileFilters } from '../../domain/types';
import { File as FileEntity } from '../../domain/entities';
import { FileRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

// Query key factory for better organization
const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (userId: string, filters?: FileFilters) => [...fileKeys.lists(), userId, filters] as const,
};

export const useFiles = (filters?: FileFilters) => {
  const { user } = useAuth();
  const { refreshUsage } = useSubscription();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const repository = useMemo(() => new FileRepository(), []);

  // Stable filters for query key
  const stableFilters = useMemo(
    () => filters,
    [filters?.folderId, filters?.searchQuery]
  );

  // Query for fetching files
  const {
    data: files = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: fileKeys.list(userId || '', stableFilters),
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await repository.findAll(userId, stableFilters);
      } catch (err) {
        Logger.error('Error loading files', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  // Mutation for creating files
  const createFileMutation = useMutation({
    mutationFn: async (dto: Omit<CreateFileDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.create({ ...dto, userId });
    },
    onSuccess: async () => {
      // Invalidate and refetch files query
      await queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error creating file', err);
    },
  });

  // Mutation for updating files
  const updateFileMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateFileDto }) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.update(id, userId, dto);
    },
    onSuccess: async () => {
      // Invalidate and refetch files query
      await queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating file', err);
    },
  });

  // Mutation for deleting files
  const deleteFileMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await repository.delete(id, userId);
    },
    onSuccess: async () => {
      // Invalidate and refetch files query
      await queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error deleting file', err);
    },
  });

  // Convert to entities
  const filesEntities = useMemo(
    () => files.map((file) => new FileEntity(file)),
    [files]
  );

  // Wrapper functions to maintain API compatibility
  const createFile = async (dto: Omit<CreateFileDto, 'userId'>): Promise<FileEntity | null> => {
    try {
      const newFile = await createFileMutation.mutateAsync(dto);
      return new FileEntity(newFile);
    } catch {
      return null;
    }
  };

  const updateFile = async (id: string, dto: UpdateFileDto): Promise<FileEntity | null> => {
    try {
      const updatedFile = await updateFileMutation.mutateAsync({ id, dto });
      return new FileEntity(updatedFile);
    } catch {
      return null;
    }
  };

  const deleteFile = async (id: string): Promise<boolean> => {
    try {
      await deleteFileMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    files: filesEntities,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load files') : null,
    refetch,
    createFile,
    updateFile,
    deleteFile,
  };
};
