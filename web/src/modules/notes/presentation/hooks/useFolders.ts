import { useState, useEffect, useCallback } from 'react';
import { Folder } from '../../domain/entities';
import { SupabaseFolderRepository } from '../../infrastructure/api';
import { CreateFolderDto, UpdateFolderDto } from '../../domain/types';

export const useFolders = (userId: string | null) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = new SupabaseFolderRepository();

  const loadFolders = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await repository.findAll(userId);
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folders');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createFolder = useCallback(
    async (dto: Omit<CreateFolderDto, 'userId'>) => {
      if (!userId) throw new Error('User ID is required');

      try {
        const newFolder = await repository.create({ ...dto, userId });
        setFolders((prev) => [...prev, newFolder]);
        return newFolder;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create folder';
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  const updateFolder = useCallback(
    async (id: string, dto: UpdateFolderDto) => {
      try {
        const updatedFolder = await repository.update(id, dto);
        setFolders((prev) =>
          prev.map((folder) => (folder.id === id ? updatedFolder : folder))
        );
        return updatedFolder;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update folder';
        setError(message);
        throw err;
      }
    },
    []
  );

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await repository.delete(id);
      setFolders((prev) => prev.filter((folder) => folder.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return {
    folders,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: loadFolders,
  };
};
