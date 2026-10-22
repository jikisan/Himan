import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@auth/index';
import { WeightRepository } from '../../infrastructure';
import type { WeightEntryInput, WeightSettings } from '@himan/shared/weight';

export function useWeight() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repository = useMemo(() => new WeightRepository(), []);
  const key = ['weight', userId];
  const query = useQuery({
    queryKey: key, enabled: !!userId, meta: { sensitive: true },
    queryFn: async () => {
      const [entries, settings] = await Promise.all([repository.findEntries(userId!), repository.findSettings(userId!)]);
      return { entries, settings };
    },
  });
  const done = { meta: { sensitive: true }, onSettled: () => client.invalidateQueries({ queryKey: key }) };
  const saveEntry = useMutation({ ...done, mutationFn: (input: WeightEntryInput) => repository.saveEntry(userId!, input) });
  const removeEntry = useMutation({ ...done, mutationFn: (id: string) => repository.removeEntry(userId!, id) });
  const saveSettings = useMutation({ ...done, mutationFn: (input: WeightSettings) => repository.saveSettings(userId!, input) });
  return {
    entries: query.data?.entries ?? [],
    settings: query.data?.settings ?? { heightCm: null, goalKg: null },
    loading: query.isLoading, error: query.error, refetch: query.refetch, userId,
    busy: saveEntry.isPending || removeEntry.isPending || saveSettings.isPending,
    saveEntry: saveEntry.mutateAsync, removeEntry: removeEntry.mutateAsync, saveSettings: saveSettings.mutateAsync,
  };
}
