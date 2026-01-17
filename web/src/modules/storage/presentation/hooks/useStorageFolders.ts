import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateStorageFolderDto,
  UpdateStorageFolderDto,
} from '../../domain/types';
import { StorageFolder as StorageFolderEntity } from '../../domain/entities';
import { StorageFolderRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

// Query key factory for better organization
const folderKeys = {
  all: ['storage-folders'] as const,
  lists: () => [...folderKeys.all, 'list'] as const,
  list: (userId: string) => [...folderKeys.lists(), userId] as const,
};

export const useStorageFolders = () => {
  const { user } = useAuth();
  const { refreshUsage } = useSubscription();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const repository = useMemo(() => new StorageFolderRepository(), []);

  // Query for fetching folders
  const {
    data: folders = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: folderKeys.list(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await repository.findAll(userId);
      } catch (err) {
        Logger.error('Error loading storage folders', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  // Mutation for creating folders
  const createFolderMutation = useMutation({
    mutationFn: async (dto: Omit<CreateStorageFolderDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.create({ ...dto, userId });
    },
    onSuccess: async () => {
      // Invalidate and refetch folders query
      await queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error creating storage folder', err);
    },
  });

  // Mutation for updating folders
  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateStorageFolderDto }) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.update(id, userId, dto);
    },
    onSuccess: async () => {
      // Invalidate and refetch folders query
      await queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating storage folder', err);
    },
  });

  // Mutation for deleting folders
  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await repository.delete(id, userId);
    },
    onSuccess: async () => {
      // Invalidate and refetch folders query
      await queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error deleting storage folder', err);
    },
  });

  // Convert to entities
  const foldersEntities = useMemo(
    () => folders.map((folder) => new StorageFolderEntity(folder)),
    [folders]
  );

  // Wrapper functions to maintain API compatibility
  const createFolder = async (dto: Omit<CreateStorageFolderDto, 'userId'>): Promise<StorageFolderEntity | null> => {
    try {
      const newFolder = await createFolderMutation.mutateAsync(dto);
      return new StorageFolderEntity(newFolder);
    } catch {
      return null;
    }
  };

  const updateFolder = async (id: string, dto: UpdateStorageFolderDto): Promise<StorageFolderEntity | null> => {
    try {
      const updatedFolder = await updateFolderMutation.mutateAsync({ id, dto });
      return new StorageFolderEntity(updatedFolder);
    } catch {
      return null;
    }
  };

  const deleteFolder = async (id: string): Promise<boolean> => {
    try {
      await deleteFolderMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    folders: foldersEntities,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load folders') : null,
    refetch,
    createFolder,
    updateFolder,
    deleteFolder,
  };
};
