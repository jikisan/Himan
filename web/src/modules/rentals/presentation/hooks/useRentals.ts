import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@auth/index';
import { FriendRepository } from '@himan/shared/friends';
import { ProfileRepository } from '@himan/shared/profile';
import { loadRentals, runRentalAction } from '@himan/shared/rentals';
import type { RentalAction } from '@himan/shared/rentals';
import { BillRepository, ContractRepository, LinkRepository, PaymentAccountRepository, PaymentRepository, PropertyRepository, RenterRepository, SettlementRepository, TenancyRepository } from '../../infrastructure';

export type { RentalAction };

export function useRentals() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repos = useMemo(() => ({ properties: new PropertyRepository(), renters: new RenterRepository(),
    tenancies: new TenancyRepository(), bills: new BillRepository(), payments: new PaymentRepository(), accounts: new PaymentAccountRepository(), settlements: new SettlementRepository(),
    contracts: new ContractRepository(), links: new LinkRepository(), friends: new FriendRepository(), profile: new ProfileRepository() }), []);
  // Stable, so components can sign a file link once (e.g. ID thumbnails) instead of on every render.
  const fileUrl = useCallback((id: string, download = false) => repos.renters.fileUrl(id, download), [repos]);
  const paymentProofUrl = useCallback((id: string, download = false) => repos.payments.proofUrl(id, download), [repos]);
  const settlementProofUrl = useCallback((id: string, download = false) => repos.settlements.proofUrl(id, download), [repos]);
  const qrUrl = useCallback((path: string) => repos.accounts.qrUrl(path), [repos]);
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  const query = useQuery({
    queryKey: ['rentals', userId], enabled: !!userId && online,
    meta: { sensitive: true }, gcTime: 0, staleTime: 0, retry: false, refetchOnMount: 'always', networkMode: 'always',
    queryFn: () => loadRentals(repos, userId!),
  });
  const mutation = useMutation({
    meta: { sensitive: true }, retry: false, gcTime: 0, networkMode: 'always',
    mutationFn: async (a: RentalAction) => {
      if (!userId) throw new Error('Sign in to manage rentals');
      if (!onlineManager.isOnline()) throw new Error('Connect to the internet to continue');
      return runRentalAction(repos, a, query.data);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['rentals'] }),
  });
  const data = online && userId ? query.data : undefined;
  return {
    properties: data?.properties ?? [], renters: data?.renters ?? [], tenancies: data?.tenancies ?? [], myName: data?.myName ?? '',
    bills: data?.bills ?? [], readings: data?.readings ?? [], utilityBills: data?.utilityBills ?? [],
    payments: data?.payments ?? [], accounts: data?.accounts ?? [], settlements: data?.settlements ?? [],
    contractTexts: data?.contractTexts ?? [], links: data?.links ?? [], templates: data?.templates ?? {},
    loading: query.isLoading, error: query.error, online, userId, busy: mutation.isPending,
    refetch: query.refetch, run: mutation.mutateAsync,
    fileUrl, paymentProofUrl, settlementProofUrl, qrUrl,
    listMembers: (propertyId: string) => repos.properties.listMembers(propertyId),
    listFriends: () => repos.friends.getFriends(userId!),
  };
}
