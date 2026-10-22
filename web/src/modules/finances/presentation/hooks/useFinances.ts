import { useMemo } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@auth/index';
import { FinanceRepository } from '../../infrastructure';
import type { FinanceCategoryInput, FinanceTransactionInput } from '@himan/shared/finances';

type Action =
  | { type: 'saveTransaction'; id: string | null; input: FinanceTransactionInput }
  | { type: 'deleteTransaction'; id: string }
  | { type: 'saveCategory'; id: string | null; input: FinanceCategoryInput }
  | { type: 'deleteCategory'; id: string };

/** Categories plus the transactions of one month ('YYYY-MM'). */
export function useFinances(month: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repository = useMemo(() => new FinanceRepository(), []);
  const categories = useQuery({
    queryKey: ['finances', userId, 'categories'], queryFn: () => repository.categories(userId!), enabled: !!userId,
  });
  const transactions = useQuery({
    queryKey: ['finances', userId, 'transactions', month], queryFn: () => repository.transactions(userId!, month), enabled: !!userId,
    // Keep showing the last month while the next one loads, instead of flashing a spinner.
    placeholderData: keepPreviousData,
  });
  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      if (!userId) throw new Error('Sign in to manage your finances');
      switch (action.type) {
        case 'saveTransaction': return repository.saveTransaction(userId, action.id, action.input);
        case 'deleteTransaction': return repository.deleteTransaction(userId, action.id);
        case 'saveCategory': return repository.saveCategory(userId, action.id, action.input);
        case 'deleteCategory': return repository.deleteCategory(userId, action.id);
      }
    },
    // Deleting a category un-links transactions in every month, so refresh everything.
    // Not awaited: the dialog should close as soon as the write lands, not after the refetch.
    onSettled: () => { void client.invalidateQueries({ queryKey: ['finances', userId] }); },
  });
  return {
    userId,
    categories: categories.data ?? [],
    transactions: transactions.data ?? [],
    loading: categories.isLoading || transactions.isLoading,
    error: categories.error ?? transactions.error,
    refetch: () => { void categories.refetch(); void transactions.refetch(); },
    busy: mutation.isPending,
    run: mutation.mutateAsync,
  };
}
