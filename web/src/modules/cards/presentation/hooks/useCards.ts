import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreditCardType,
  CreditCardFilters,
  CreateCreditCardDto,
  UpdateCreditCardDto,
} from '../../domain';
import { CreditCardRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

// Query key factory for better organization
const cardKeys = {
  all: ['cards'] as const,
  lists: () => [...cardKeys.all, 'list'] as const,
  list: (userId: string, filters?: CreditCardFilters) => [...cardKeys.lists(), userId, filters] as const,
};

export const useCards = (filters?: CreditCardFilters) => {
  const { user } = useAuth();
  const { canCreateCard, refreshUsage } = useSubscription();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const repository = useMemo(() => new CreditCardRepository(), []);

  // Stabilize filters for query key
  const stableFilters = useMemo(
    () => filters,
    [filters?.categoryId, filters?.searchQuery, filters?.isFavorite, filters?.cardType, filters?.cardIssuer, filters?.expiringSoon]
  );

  // Query for fetching cards
  const {
    data: cards = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: cardKeys.list(userId || '', stableFilters),
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await repository.findAll(stableFilters, userId);
      } catch (err) {
        Logger.error('Error loading cards', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  // Mutation for creating cards
  const createCardMutation = useMutation({
    mutationFn: async (dto: Omit<CreateCreditCardDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');

      // Check if user can create a card
      const accessCheck = canCreateCard();
      if (!accessCheck.allowed) {
        throw new Error(accessCheck.reason || 'Cannot create card');
      }

      return await repository.create({ ...dto, userId });
    },
    onSuccess: async () => {
      // Invalidate and refetch cards query
      await queryClient.invalidateQueries({ queryKey: cardKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error creating card', err);
    },
  });

  // Mutation for updating cards
  const updateCardMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateCreditCardDto }) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.update(id, dto, userId);
    },
    onSuccess: async () => {
      // Invalidate and refetch cards query
      await queryClient.invalidateQueries({ queryKey: cardKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating card', err);
    },
  });

  // Mutation for deleting cards
  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await repository.delete(id);
    },
    onSuccess: async () => {
      // Invalidate and refetch cards query
      await queryClient.invalidateQueries({ queryKey: cardKeys.lists() });
      await refreshUsage();
    },
    onError: (err) => {
      Logger.error('Error deleting card', err);
    },
  });

  // Wrapper functions to maintain API compatibility
  const createCard = async (dto: Omit<CreateCreditCardDto, 'userId'>): Promise<CreditCardType | null> => {
    try {
      const newCard = await createCardMutation.mutateAsync(dto);
      return newCard;
    } catch {
      return null;
    }
  };

  const updateCard = async (id: string, dto: UpdateCreditCardDto): Promise<CreditCardType | null> => {
    try {
      const updatedCard = await updateCardMutation.mutateAsync({ id, dto });
      return updatedCard;
    } catch {
      return null;
    }
  };

  const deleteCard = async (id: string): Promise<boolean> => {
    try {
      await deleteCardMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    cards,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load cards') : null,
    refetch,
    createCard,
    updateCard,
    deleteCard,
  };
};
