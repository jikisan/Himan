import { useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { CreditCardRepository } from '@himan/shared/cards';
import type { CreditCardType, CreateCreditCardDto, UpdateCreditCardDto } from '@himan/shared/cards';
import { cardsKeys } from './queryKeys';
import { getLogger } from '@himan/shared';

const logger = getLogger();

export const useCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const repository = useMemo(() => new CreditCardRepository(), []);
  const userId = user?.id;

  const { data: cards = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: cardsKeys.cards(),
    queryFn: () => repository.findAll(undefined, userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (dto: Omit<CreateCreditCardDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return repository.create({ ...dto, userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsKeys.cards() });
    },
    onError: (err) => {
      logger.error('Error creating card', err);
      Alert.alert('Error', 'Failed to save card');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCreditCardDto }) =>
      repository.update(id, dto, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsKeys.cards() });
    },
    onError: (err) => {
      logger.error('Error updating card', err);
      Alert.alert('Error', 'Failed to update card');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => repository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cardsKeys.cards() });
    },
    onError: (err) => {
      logger.error('Error deleting card', err);
      Alert.alert('Error', 'Failed to delete card');
    },
  });

  const createCard = useCallback(
    async (dto: Omit<CreateCreditCardDto, 'userId'>): Promise<CreditCardType | null> => {
      if (!userId) return null;
      try {
        return await createMutation.mutateAsync(dto);
      } catch {
        return null;
      }
    },
    [userId, createMutation]
  );

  const updateCard = useCallback(
    async (id: string, dto: UpdateCreditCardDto): Promise<CreditCardType | null> => {
      try {
        return await updateMutation.mutateAsync({ id, dto });
      } catch {
        return null;
      }
    },
    [updateMutation]
  );

  const deleteCard = useCallback(
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
    cards,
    loading,
    error: error?.message ?? null,
    refetch,
    createCard,
    updateCard,
    deleteCard,
    toggleFavorite,
  };
};
