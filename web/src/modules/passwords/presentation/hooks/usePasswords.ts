import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  PasswordType,
  PasswordFilters,
  CreatePasswordDto,
  UpdatePasswordDto,
} from '../../domain';
import { PasswordRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { Logger } from '@core/infrastructure/services';

export const usePasswords = (filters?: PasswordFilters) => {
  const [passwords, setPasswords] = useState<PasswordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const repository = useMemo(() => new PasswordRepository(), []);
  const userId = user?.id;

  // Stabilize filters to prevent unnecessary re-renders
  const stableFilters = useMemo(
    () => filters,
    [filters?.categoryId, filters?.searchQuery, filters?.isFavorite]
  );

  const loadPasswords = useCallback(async () => {
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
      const data = await repository.findAll(stableFilters, userId);
      setPasswords(data);
      hasLoadedRef.current = true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load passwords';
      setError(errorMessage);
      Logger.error('Error loading passwords', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, repository, stableFilters]);

  useEffect(() => {
    loadPasswords();
  }, [loadPasswords]);

  const createPassword = useCallback(
    async (
      dto: Omit<CreatePasswordDto, 'userId'>
    ): Promise<PasswordType | null> => {
      if (!userId) return null;

      try {
        const newPassword = await repository.create({ ...dto, userId });
        setPasswords((prev) => [newPassword, ...prev]);
        return newPassword;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create password';
        setError(errorMessage);
        Logger.error('Error creating password', err);
        return null;
      }
    },
    [userId, repository]
  );

  const updatePassword = useCallback(
    async (
      id: string,
      dto: UpdatePasswordDto
    ): Promise<PasswordType | null> => {
      try {
        const updatedPassword = await repository.update(id, dto, userId);
        setPasswords((prev) =>
          prev.map((password) =>
            password.id === id ? updatedPassword : password
          )
        );
        return updatedPassword;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update password';
        setError(errorMessage);
        Logger.error('Error updating password', err);
        return null;
      }
    },
    [repository, userId]
  );

  const deletePassword = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await repository.delete(id);
        setPasswords((prev) => prev.filter((password) => password.id !== id));
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete password';
        setError(errorMessage);
        Logger.error('Error deleting password', err);
        return false;
      }
    },
    [repository]
  );

  return {
    passwords,
    loading,
    error,
    refetch: loadPasswords,
    createPassword,
    updatePassword,
    deletePassword,
  };
};
