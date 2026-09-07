import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  PasswordType,
  PasswordFilters,
  CreatePasswordDto,
  UpdatePasswordDto,
} from '../../domain';
import { PasswordRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

export const usePasswords = (filters?: PasswordFilters) => {
  const [passwords, setPasswords] = useState<PasswordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { canCreatePassword, refreshUsage } = useSubscription();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const repository = useMemo(() => new PasswordRepository(), []);
  const userId = user?.id;

  // Stabilize filters to prevent unnecessary re-renders
  const stableFilters = useMemo(
    () => filters,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on primitives, not `filters` itself
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount
    loadPasswords();
  }, [loadPasswords]);

  const createPassword = useCallback(
    async (
      dto: Omit<CreatePasswordDto, 'userId'>
    ): Promise<PasswordType | null> => {
      if (!userId) return null;

      // Check if user can create a password
      const accessCheck = canCreatePassword();
      if (!accessCheck.allowed) {
        const errorMessage = accessCheck.reason || 'Cannot create password';
        setError(errorMessage);
        return null;
      }

      try {
        const newPassword = await repository.create({ ...dto, userId });
        setPasswords((prev) => [newPassword, ...prev]);
        // Refresh usage counts after creating
        await refreshUsage();
        return newPassword;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create password';
        setError(errorMessage);
        Logger.error('Error creating password', err);
        return null;
      }
    },
    [userId, repository, canCreatePassword, refreshUsage]
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
        // Refresh usage counts after deleting
        await refreshUsage();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete password';
        setError(errorMessage);
        Logger.error('Error deleting password', err);
        return false;
      }
    },
    [repository, refreshUsage]
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
