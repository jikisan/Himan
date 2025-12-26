import { useState, useEffect, useCallback } from 'react';
import type { FolderType as Folder, CreateFolderDto, UpdateFolderDto } from '../../domain';
import { FolderRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';

export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  
  const repository = new FolderRepository();

  const loadFolders = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const data = await repository.findAll();
      setFolders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load folders';
      setError(errorMessage);
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createFolder = useCallback(
    async (dto: Omit<CreateFolderDto, 'userId'>): Promise<Folder | null> => {
      if (!user) return null;

      try {
        const newFolder = await repository.create({ ...dto, userId: user.id });
        setFolders((prev) => [...prev, newFolder]);
        return newFolder;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
        setError(errorMessage);
        console.error('Error creating folder:', err);
        return null;
      }
    },
    [user]
  );

  const updateFolder = useCallback(
    async (id: string, dto: UpdateFolderDto): Promise<Folder | null> => {
      try {
        const updatedFolder = await repository.update(id, dto);
        setFolders((prev) =>
          prev.map((folder) => (folder.id === id ? updatedFolder : folder))
        );
        return updatedFolder;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update folder';
        setError(errorMessage);
        console.error('Error updating folder:', err);
        return null;
      }
    },
    []
  );

  const deleteFolder = useCallback(async (id: string): Promise<boolean> => {
    try {
      await repository.delete(id);
      setFolders((prev) => prev.filter((folder) => folder.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(errorMessage);
      console.error('Error deleting folder:', err);
      return false;
    }
  }, []);

  return {
    folders,
    loading,
    error,
    refetch: loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
  };
};
