import { useMemo, useSyncExternalStore } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth';
import { GovernmentRepository } from '../../infrastructure';
import type { GovernmentRecordInput } from '@himan/shared/government';

type Action =
  | { type: 'save'; id: string | null; input: GovernmentRecordInput }
  | { type: 'remove'; id: string }
  | { type: 'upload'; id: string; file: { name: string; mimeType?: string | null; bytes: ArrayBuffer } }
  | { type: 'removeDocument'; id: string };

export function useGovernment() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repository = useMemo(() => new GovernmentRepository(), []);
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  const key = ['government', userId];
  const query = useQuery({
    queryKey: key, queryFn: () => repository.findAll(userId!), enabled: !!userId && online,
    meta: { sensitive: true }, gcTime: 0, staleTime: 0, retry: false,
    refetchOnMount: 'always', networkMode: 'always',
  });
  const mutation = useMutation({
    meta: { sensitive: true }, retry: false, gcTime: 0, networkMode: 'always',
    mutationFn: async (action: Action) => {
      if (!userId) throw new Error('Sign in to manage government records');
      if (!onlineManager.isOnline()) throw new Error('Connect to the internet to continue');
      switch (action.type) {
        case 'save': return repository.save(userId, action.id, action.input);
        case 'remove': return repository.remove(userId, action.id);
        case 'upload': return repository.upload(userId, action.id, action.file);
        case 'removeDocument': return repository.removeDocument(userId, action.id);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
  return {
    records: online && userId ? query.data ?? [] : [],
    loading: query.isLoading, error: query.error, online, userId,
    busy: mutation.isPending, refetch: query.refetch,
    run: mutation.mutateAsync,
    documentUrl: async (id: string, download = false) => {
      if (!userId || !onlineManager.isOnline()) throw new Error('Sign in and connect to the internet to continue');
      return repository.documentUrl(userId, id, download);
    },
  };
}
