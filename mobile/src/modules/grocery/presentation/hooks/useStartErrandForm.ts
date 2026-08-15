import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GrocerySessionRepository } from '@himan/shared/grocery';
import { useGroceryLists } from './useGroceryLists';
import { groceryKeys } from './queryKeys';

interface UseStartErrandFormOptions {
  userId: string;
  enabled: boolean;
  onStarted: () => void;
}

export function useStartErrandForm({ userId, enabled, onStarted }: UseStartErrandFormOptions) {
  const queryClient = useQueryClient();
  const { lists } = useGroceryLists();
  const repo = useMemo(() => new GrocerySessionRepository(), []);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [store, setStore] = useState('');
  const [errandName, setErrandName] = useState('');

  const { data: recentStores = [] } = useQuery({
    queryKey: groceryKeys.recentStores(),
    queryFn: () => repo.getRecentStoreNames(userId),
    enabled: !!userId && enabled,
  });

  const startMutation = useMutation({
    mutationFn: () =>
      repo.create(
        {
          listIds: Array.from(selected),
          storeName: store.trim(),
          name: errandName.trim() || undefined,
        },
        userId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groceryKeys.activeSession() });
      queryClient.invalidateQueries({ queryKey: groceryKeys.recentStores() });
      setSelected(new Set());
      setStore('');
      setErrandName('');
      onStarted();
    },
    onError: () => Alert.alert('Error', 'Failed to start errand'),
  });

  const toggleList = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const templates = lists.filter((l) => !l.isArchived);
  const canStart = store.trim().length > 0 && selected.size > 0;

  return {
    templates,
    recentStores,
    selected,
    toggleList,
    store,
    setStore,
    errandName,
    setErrandName,
    canStart,
    isStarting: startMutation.isPending,
    start: () => startMutation.mutate(),
  };
}
