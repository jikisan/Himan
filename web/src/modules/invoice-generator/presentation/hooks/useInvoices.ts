import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceFilters } from '../../domain/types';
import { Invoice as InvoiceEntity } from '../../domain/entities';
import { InvoiceRepository } from '../../infrastructure/repositories';
import { invoiceFolderKeys } from './useInvoiceFolders';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { Logger } from '@core/infrastructure/services';

const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (userId: string, filters?: InvoiceFilters) =>
    [...invoiceKeys.lists(), userId, filters] as const,
};

export const useInvoices = (filters?: InvoiceFilters) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id;
  const repository = useMemo(() => new InvoiceRepository(), []);

  const stableFilters = useMemo(
    () => filters,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters?.folderId, filters?.searchQuery, filters?.isFavorite]
  );

  const {
    data: invoices = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: invoiceKeys.list(userId || '', stableFilters),
    queryFn: async () => {
      if (!userId) return [];
      try {
        return await repository.findAll(userId, stableFilters);
      } catch (err) {
        Logger.error('Error loading invoices', err);
        throw err;
      }
    },
    enabled: !!userId,
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (dto: Omit<CreateInvoiceDto, 'userId'>) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.create({ ...dto, userId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      // Also invalidate folder queries since invoices_count changes
      await queryClient.invalidateQueries({ queryKey: invoiceFolderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error creating invoice', err);
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateInvoiceDto }) => {
      if (!userId) throw new Error('User not authenticated');
      return await repository.update(id, userId, dto);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: invoiceFolderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error updating invoice', err);
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error('User not authenticated');
      await repository.delete(id, userId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      await queryClient.invalidateQueries({ queryKey: invoiceFolderKeys.lists() });
    },
    onError: (err) => {
      Logger.error('Error deleting invoice', err);
    },
  });

  const invoicesEntities = useMemo(
    () => invoices.map((invoice) => new InvoiceEntity(invoice)),
    [invoices]
  );

  const createInvoice = async (
    dto: Omit<CreateInvoiceDto, 'userId'>
  ): Promise<InvoiceEntity | null> => {
    try {
      const newInvoice = await createInvoiceMutation.mutateAsync(dto);
      return new InvoiceEntity(newInvoice);
    } catch {
      return null;
    }
  };

  const updateInvoice = async (
    id: string,
    dto: UpdateInvoiceDto
  ): Promise<InvoiceEntity | null> => {
    try {
      const updatedInvoice = await updateInvoiceMutation.mutateAsync({ id, dto });
      return new InvoiceEntity(updatedInvoice);
    } catch {
      return null;
    }
  };

  const deleteInvoice = async (id: string): Promise<boolean> => {
    try {
      await deleteInvoiceMutation.mutateAsync(id);
      return true;
    } catch {
      return false;
    }
  };

  return {
    invoices: invoicesEntities,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load invoices') : null,
    refetch,
    createInvoice,
    updateInvoice,
    deleteInvoice,
  };
};
