import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FileType, CreateFileDto, UpdateFileDto, FileFilters } from '../../domain/types';
import { File as FileEntity } from '../../domain/entities';
import { FileRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

export const useFiles = (filters?: FileFilters) => {
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { refreshUsage } = useSubscription();

  const userId = user?.id;
  const repository = useMemo(() => new FileRepository(), []);

  const stableFilters = useMemo(
    () => filters,
    [filters?.folderId, filters?.searchQuery]
  );

  const loadFiles = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await repository.findAll(userId, stableFilters);
      setFiles(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
      Logger.error('Error loading files', err);
    } finally {
      setLoading(false);
    }
  }, [userId, repository, stableFilters]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const createFile = useCallback(
    async (dto: Omit<CreateFileDto, 'userId'>): Promise<FileEntity | null> => {
      if (!userId) return null;

      try {
        const newFile = await repository.create({ ...dto, userId });
        setFiles((prev) => [newFile, ...prev]);
        await refreshUsage();
        return new FileEntity(newFile);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create file';
        setError(errorMessage);
        Logger.error('Error creating file', err);
        return null;
      }
    },
    [userId, repository, refreshUsage]
  );

  const updateFile = useCallback(
    async (id: string, dto: UpdateFileDto): Promise<FileEntity | null> => {
      if (!userId) return null;

      try {
        const updatedFile = await repository.update(id, userId, dto);
        setFiles((prev) => prev.map((file) => (file.id === id ? updatedFile : file)));
        return new FileEntity(updatedFile);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update file';
        setError(errorMessage);
        Logger.error('Error updating file', err);
        return null;
      }
    },
    [userId, repository]
  );

  const deleteFile = useCallback(
    async (id: string): Promise<boolean> => {
      if (!userId) return false;

      try {
        await repository.delete(id, userId);
        setFiles((prev) => prev.filter((file) => file.id !== id));
        await refreshUsage();
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setError(errorMessage);
        Logger.error('Error deleting file', err);
        return false;
      }
    },
    [userId, repository, refreshUsage]
  );

  const filesEntities = useMemo(() => files.map((file) => new FileEntity(file)), [files]);

  return {
    files: filesEntities,
    loading,
    error,
    refetch: loadFiles,
    createFile,
    updateFile,
    deleteFile,
  };
};
