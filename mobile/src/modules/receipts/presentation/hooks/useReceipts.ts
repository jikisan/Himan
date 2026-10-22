import { useMemo, useSyncExternalStore } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/modules/auth';
import { ReceiptRepository } from '../../infrastructure';
import type { Receipt, ReceiptInput } from '@himan/shared/receipts';

type Action =
  | { type: 'save'; id: string | null; input: ReceiptInput; photo?: ArrayBuffer }
  | { type: 'remove'; receipt: Pick<Receipt, 'id' | 'photoPath'> };

export function useReceipts() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repository = useMemo(() => new ReceiptRepository(), []);
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  const key = ['receipts', userId];
  const query = useQuery({
    queryKey: key, queryFn: () => repository.findAll(userId!), enabled: !!userId && online,
    meta: { sensitive: true }, gcTime: 0, retry: false, refetchOnMount: 'always', networkMode: 'always',
  });
  const receipts = online && userId ? query.data ?? [] : [];
  // A replaced photo keeps its path, so updatedAt is part of the key to fetch a fresh link.
  const photoKey = receipts.map((r) => `${r.photoPath}@${r.updatedAt}`).join('|');
  const photos = useQuery({
    queryKey: ['receipt-photos', userId, photoKey], enabled: receipts.length > 0, retry: false, gcTime: 0,
    meta: { sensitive: true }, networkMode: 'always',
    queryFn: () => repository.photoUrls(receipts.map((r) => r.photoPath)),
  });
  const mutation = useMutation({
    meta: { sensitive: true }, retry: false, gcTime: 0, networkMode: 'always',
    mutationFn: async (action: Action) => {
      if (!userId) throw new Error('Sign in to manage receipts');
      if (!onlineManager.isOnline()) throw new Error('Connect to the internet to continue');
      return action.type === 'save'
        ? repository.save(userId, action.id, action.input, action.photo)
        : repository.remove(userId, action.receipt);
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
  return {
    receipts, photoUrls: photos.data ?? {},
    loading: query.isLoading, error: query.error, online, userId,
    busy: mutation.isPending, refetch: query.refetch, run: mutation.mutateAsync,
  };
}
