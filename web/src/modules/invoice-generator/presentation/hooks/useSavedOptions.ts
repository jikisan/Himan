import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateSavedOptionDto,
  UpdateSavedOptionDto,
  SavedOptionType,
  InvoiceSavedOptionType,
} from '../../domain/types';
import { InvoiceSavedOption as SavedOptionEntity } from '../../domain/entities';
import { SavedOptionRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { Logger } from '@core/infrastructure/services';

const savedOptionKeys = {
  all: ['invoice-saved-options'] as const,
  lists: () => [...savedOptionKeys.all, 'list'] as const,
  list: (userId: string) => [...savedOptionKeys.lists(), userId] as const,
};

export const useSavedOptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const repository = useMemo(() => new SavedOptionRepository(), []);

  const {
    data: options = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: savedOptionKeys.list(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await repository.findAll(userId);
      } catch (err) {
        Logger.error('Error loading saved options', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  const createOptionMutation = useMutation({
    mutationFn: async (dto: Omit<CreateSavedOptionDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.create({ ...dto, userId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedOptionKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error creating saved option', err);
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateSavedOptionDto }) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.update(id, userId, dto);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedOptionKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating saved option', err);
    },
  });

  const deleteOptionMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await repository.delete(id, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: savedOptionKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error deleting saved option', err);
    },
  });

  const optionsEntities = useMemo(
    () => options.map((opt) => new SavedOptionEntity(opt)),
    [options]
  );

  // Group options by type for convenient access
  const optionsByType = useMemo(() => {
    const grouped: Record<SavedOptionType, InvoiceSavedOptionType[]> = {
      company_details: [],
      bill_to: [],
      notes: [],
      bank_details: [],
    };
    for (const opt of options) {
      grouped[opt.optionType].push(opt);
    }
    return grouped;
  }, [options]);

  const createOption = async (
    dto: Omit<CreateSavedOptionDto, 'userId'>
  ): Promise<SavedOptionEntity | null> => {
    try {
      const newOption = await createOptionMutation.mutateAsync(dto);
      return new SavedOptionEntity(newOption);
    } catch {
      return null;
    }
  };

  const updateOption = async (
    id: string,
    dto: UpdateSavedOptionDto
  ): Promise<SavedOptionEntity | null> => {
    try {
      const updatedOption = await updateOptionMutation.mutateAsync({ id, dto });
      return new SavedOptionEntity(updatedOption);
    } catch {
      return null;
    }
  };

  const deleteOption = async (id: string): Promise<boolean> => {
    try {
      await deleteOptionMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    options: optionsEntities,
    optionsByType,
    loading,
    error: error
      ? error instanceof Error
        ? error.message
        : 'Failed to load saved options'
      : null,
    refetch,
    createOption,
    updateOption,
    deleteOption,
  };
};
