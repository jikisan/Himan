import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { PasswordRepository } from '@himan/shared/passwords';
import type { PasswordType, CreatePasswordDto, UpdatePasswordDto } from '@himan/shared/passwords';
import { passwordsKeys } from './queryKeys';
import { getLogger } from '@himan/shared';

const logger = getLogger();

export const usePasswords = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new PasswordRepository(), []);
  const userId = user?.id;

  const { data: passwords = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: passwordsKeys.passwords(),
    queryFn: () => repository.findAll(undefined, userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreatePasswordDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return repository.create({ ...dto, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordsKeys.passwords() });
    },
    onError: (err) => {
      logger.error('Error creating password', err);
      Alert.alert('Error', 'Failed to save password');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePasswordDto }) =>
      repository.update(id, dto, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordsKeys.passwords() });
    },
    onError: (err) => {
      logger.error('Error updating password', err);
      Alert.alert('Error', 'Failed to update password');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: passwordsKeys.passwords() });
    },
    onError: (err) => {
      logger.error('Error deleting password', err);
      Alert.alert('Error', 'Failed to delete password');
    },
  });

  const createPassword = useCallback(
    async (dto: Omit<CreatePasswordDto, 'userId'>): Promise<PasswordType | null> => {
      if (!userId) return null;
      try {
        return await createMutation.mutateAsync(dto);
      } catch {
        return null;
      }
    },
    [userId, createMutation]
  );

  const updatePassword = useCallback(
    async (id: string, dto: UpdatePasswordDto): Promise<PasswordType | null> => {
      try {
        return await updateMutation.mutateAsync({ id, dto });
      } catch {
        return null;
      }
    },
    [updateMutation]
  );

  const deletePassword = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [deleteMutation]
  );

  const toggleFavorite = useCallback(
    async (id: string, isFavorite: boolean): Promise<void> => {
      await updateMutation.mutateAsync({ id, dto: { isFavorite } });
    },
    [updateMutation]
  );

  return {
    passwords,
    loading,
    error: error?.message ?? null,
    refetch,
    createPassword,
    updatePassword,
    deletePassword,
    toggleFavorite,
  };
};
