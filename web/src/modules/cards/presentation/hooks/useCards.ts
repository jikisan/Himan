import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

export const useCards = (filters?: CreditCardFilters) => {
  const [cards, setCards] = useState<CreditCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { canCreateCard, refreshUsage } = useSubscription();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const repository = useMemo(() => new CreditCardRepository(), []);
  const userId = user?.id;

  // Stabilize filters to prevent unnecessary re-renders
  const stableFilters = useMemo(
    () => filters,
    [filters?.categoryId, filters?.searchQuery, filters?.isFavorite, filters?.cardType, filters?.cardIssuer, filters?.expiringSoon]
  );

  const loadCards = useCallback(async () => {
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
      setCards(data);
      hasLoadedRef.current = true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load cards';
      setError(errorMessage);
      Logger.error('Error loading cards', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, repository, stableFilters]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const createCard = useCallback(
    async (
      dto: Omit<CreateCreditCardDto, 'userId'>
    ): Promise<CreditCardType | null> => {
      if (!userId) return null;

      // Check if user can create a card
      const accessCheck = canCreateCard();
      if (!accessCheck.allowed) {
        const errorMessage = accessCheck.reason || 'Cannot create card';
        setError(errorMessage);
        return null;
      }

      try {
        const newCard = await repository.create({ ...dto, userId });
        setCards((prev) => [newCard, ...prev]);
        // Refresh usage counts after creating
        await refreshUsage();
        return newCard;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create card';
        setError(errorMessage);
        Logger.error('Error creating card', err);
        return null;
      }
    },
    [userId, repository, canCreateCard, refreshUsage]
  );

  const updateCard = useCallback(
    async (
      id: string,
      dto: UpdateCreditCardDto
    ): Promise<CreditCardType | null> => {
      try {
        const updatedCard = await repository.update(id, dto, userId);
        setCards((prev) =>
          prev.map((card) =>
            card.id === id ? updatedCard : card
          )
        );
        return updatedCard;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update card';
        setError(errorMessage);
        Logger.error('Error updating card', err);
        return null;
      }
    },
    [repository, userId]
  );

  const deleteCard = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await repository.delete(id);
        setCards((prev) => prev.filter((card) => card.id !== id));
        // Refresh usage counts after deleting
        await refreshUsage();
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete card';
        setError(errorMessage);
        Logger.error('Error deleting card', err);
        return false;
      }
    },
    [repository, refreshUsage]
  );

  return {
    cards,
    loading,
    error,
    refetch: loadCards,
    createCard,
    updateCard,
    deleteCard,
  };
};