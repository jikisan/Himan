import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateInvoiceFolderDto, UpdateInvoiceFolderDto } from '../../domain/types';
import { InvoiceFolder as InvoiceFolderEntity } from '../../domain/entities';
import { InvoiceFolderRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { Logger } from '@core/infrastructure/services';

export const invoiceFolderKeys = {
  all: ['invoice-folders'] as const,
  lists: () => [...invoiceFolderKeys.all, 'list'] as const,
  list: (userId: string) => [...invoiceFolderKeys.lists(), userId] as const,
};

export const useInvoiceFolders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const repository = useMemo(() => new InvoiceFolderRepository(), []);

  const {
    data: folders = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: invoiceFolderKeys.list(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await repository.findAll(userId);
      } catch (err) {
        Logger.error('Error loading invoice folders', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  const createFolderMutation = useMutation({
    mutationFn: async (dto: Omit<CreateInvoiceFolderDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.create({ ...dto, userId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceFolderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error creating invoice folder', err);
    },
  });

  const updateFolderMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateInvoiceFolderDto }) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.update(id, userId, dto);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceFolderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating invoice folder', err);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await repository.delete(id, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceFolderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error deleting invoice folder', err);
    },
  });

  const incrementSequenceMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.incrementSequence(id, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceFolderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error incrementing invoice sequence', err);
    },
  });

  const foldersEntities = useMemo(
    () => folders.map((folder) => new InvoiceFolderEntity(folder)),
    [folders]
  );

  const createFolder = async (
    dto: Omit<CreateInvoiceFolderDto, 'userId'>
  ): Promise<InvoiceFolderEntity | null> => {
    try {
      const newFolder = await createFolderMutation.mutateAsync(dto);
      return new InvoiceFolderEntity(newFolder);
    } catch {
      return null;
    }
  };

  const updateFolder = async (
    id: string,
    dto: UpdateInvoiceFolderDto
  ): Promise<InvoiceFolderEntity | null> => {
    try {
      const updatedFolder = await updateFolderMutation.mutateAsync({ id, dto });
      return new InvoiceFolderEntity(updatedFolder);
    } catch {
      return null;
    }
  };

  const deleteFolder = async (id: string): Promise<boolean> => {
    try {
      await deleteFolderMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  const incrementSequence = async (id: string): Promise<InvoiceFolderEntity | null> => {
    try {
      const updated = await incrementSequenceMutation.mutateAsync(id);
      return new InvoiceFolderEntity(updated);
    } catch {
      return null;
    }
  };

  return {
    folders: foldersEntities,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load folders') : null,
    refetch,
    createFolder,
    updateFolder,
    deleteFolder,
    incrementSequence,
  };
};
