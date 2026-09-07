import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FolderType as Folder, CreateFolderDto, UpdateFolderDto } from '../../domain';
import { FolderRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';

export const useFolders = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { canCreateFolder, refreshUsage } = useSubscription();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const repository = useMemo(() => new FolderRepository(), []);
  const userId = user?.id;

  const loadFolders = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Prevent duplicate requests
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await repository.findAll();
      setFolders(data);
      hasLoadedRef.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load folders';
      setError(errorMessage);
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, repository]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount
    loadFolders();
  }, [loadFolders]);

  const createFolder = useCallback(
    async (dto: Omit<CreateFolderDto, 'userId'>): Promise<Folder | null> => {
      if (!userId) return null;

      // Check if user can create a folder
      const accessCheck = canCreateFolder();
      if (!accessCheck.allowed) {
        const errorMessage = accessCheck.reason || 'Cannot create folder';
        setError(errorMessage);
        return null;
      }

      try {
        const newFolder = await repository.create({ ...dto, userId });
        setFolders((prev) => [...prev, newFolder]);
        // Refresh usage counts after creating
        await refreshUsage();
        return newFolder;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create folder';
        setError(errorMessage);
        console.error('Error creating folder:', err);
        return null;
      }
    },
    [userId, repository, canCreateFolder, refreshUsage]
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
    [repository]
  );

  const deleteFolder = useCallback(async (id: string): Promise<boolean> => {
    try {
      await repository.delete(id);
      setFolders((prev) => prev.filter((folder) => folder.id !== id));
      // Refresh usage counts after deleting
      await refreshUsage();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete folder';
      setError(errorMessage);
      console.error('Error deleting folder:', err);
      return false;
    }
  }, [repository, refreshUsage]);

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
