import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  StorageFolderType,
  CreateStorageFolderDto,
  UpdateStorageFolderDto,
} from '../../domain/types';
import { StorageFolder as StorageFolderEntity } from '../../domain/entities';
import { StorageFolderRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

export const useStorageFolders = () => {
  const [folders, setFolders] = useState<StorageFolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { refreshUsage } = useSubscription();

  const userId = user?.id;
  const repository = useMemo(() => new StorageFolderRepository(), []);

  const loadFolders = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await repository.findAll(userId);
      setFolders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load folders';
      setError(errorMessage);
      Logger.error('Error loading storage folders', err);
    } finally {
      setLoading(false);
    }
  }, [userId, repository]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createFolder = useCallback(
    async (dto: Omit<CreateStorageFolderDto, 'userId'>): Promise<StorageFolderEntity | null> => {
      if (!userId) return null;

      try {
        const newFolder = await repository.create({ ...dto, userId });
        setFolders((prev) => [...prev, newFolder]);
        await refreshUsage();
        return new StorageFolderEntity(newFolder);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
        setError(errorMessage);
        Logger.error('Error creating storage folder', err);
        return null;
      }
    },
    [userId, repository, refreshUsage]
  );

  const updateFolder = useCallback(
    async (id: string, dto: UpdateStorageFolderDto): Promise<StorageFolderEntity | null> => {
      if (!userId) return null;

      try {
        const updatedFolder = await repository.update(id, userId, dto);
        setFolders((prev) => prev.map((folder) => (folder.id === id ? updatedFolder : folder)));
        return new StorageFolderEntity(updatedFolder);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update folder';
        setError(errorMessage);
        Logger.error('Error updating storage folder', err);
        return null;
      }
    },
    [userId, repository]
  );

  const deleteFolder = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false;

      try {
        await repository.delete(id, userId);
        setFolders((prev) => prev.filter((folder) => folder.id !== id));
        await refreshUsage();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
        setError(errorMessage);
        Logger.error('Error deleting storage folder', err);
        return false;
      }
    },
    [userId, repository, refreshUsage]
  );

  const foldersEntities = useMemo(
    () => folders.map((folder) => new StorageFolderEntity(folder)),
    [folders]
  );

  return {
    folders: foldersEntities,
    loading,
    error,
    refetch: loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
};
