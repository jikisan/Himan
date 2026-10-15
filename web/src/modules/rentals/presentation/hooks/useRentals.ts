import { useMemo, useSyncExternalStore } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@auth/index';
import { FriendRepository } from '@himan/shared/friends';
import type { PropertyInput, RenterInput, StartTenancyInput, UnitInput } from '@himan/shared/rentals';
import { PropertyRepository, RenterRepository, TenancyRepository } from '../../infrastructure';

export type RentalAction =
  | { type: 'saveProperty'; id: string | null; input: PropertyInput }
  | { type: 'archiveProperty'; id: string; archived: boolean }
  | { type: 'removeProperty'; id: string }
  | { type: 'saveUnit'; propertyId: string; id: string | null; input: UnitInput }
  | { type: 'removeUnit'; id: string }
  | { type: 'saveRenter'; propertyId: string; id: string | null; input: RenterInput }
  | { type: 'removeRenter'; id: string }
  | { type: 'uploadRenterFile'; renterId: string; propertyId: string; file: { name: string; mimeType?: string | null; bytes: ArrayBuffer } }
  | { type: 'removeRenterFile'; id: string }
  | { type: 'startTenancy'; input: StartTenancyInput }
  | { type: 'endTenancy'; id: string; moveOut: string }
  | { type: 'addMember'; propertyId: string; userId: string; role: 'manager' | 'viewer' }
  | { type: 'removeMember'; propertyId: string; userId: string };

export function useRentals() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repos = useMemo(() => ({ properties: new PropertyRepository(), renters: new RenterRepository(),
    tenancies: new TenancyRepository(), friends: new FriendRepository() }), []);
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  const query = useQuery({
    queryKey: ['rentals', userId], enabled: !!userId && online,
    meta: { sensitive: true }, gcTime: 0, staleTime: 0, retry: false, refetchOnMount: 'always', networkMode: 'always',
    queryFn: async () => {
      const [properties, renters, tenancies] = await Promise.all([
        repos.properties.findAll(userId!), repos.renters.findAll(), repos.tenancies.findAll()]);
      return { properties, renters, tenancies };
    },
  });
  const mutation = useMutation({
    meta: { sensitive: true }, retry: false, gcTime: 0, networkMode: 'always',
    mutationFn: async (a: RentalAction) => {
      if (!userId) throw new Error('Sign in to manage rentals');
      if (!onlineManager.isOnline()) throw new Error('Connect to the internet to continue');
      switch (a.type) {
        case 'saveProperty': return repos.properties.save(a.id, a.input);
        case 'archiveProperty': return repos.properties.setArchived(a.id, a.archived);
        case 'removeProperty': return repos.properties.remove(a.id);
        case 'saveUnit': return repos.properties.saveUnit(a.propertyId, a.id, a.input);
        case 'removeUnit': return repos.properties.removeUnit(a.id);
        case 'saveRenter': return repos.renters.save(a.propertyId, a.id, a.input);
        case 'removeRenter': return repos.renters.remove(a.id);
        case 'uploadRenterFile': return repos.renters.upload(a.renterId, a.propertyId, a.file);
        case 'removeRenterFile': return repos.renters.removeFile(a.id);
        case 'startTenancy': return repos.tenancies.start(a.input);
        case 'endTenancy': return repos.tenancies.end(a.id, a.moveOut);
        case 'addMember': return repos.properties.addMember(a.propertyId, a.userId, a.role);
        case 'removeMember': return repos.properties.removeMember(a.propertyId, a.userId);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['rentals'] }),
  });
  const data = online && userId ? query.data : undefined;
  return {
    properties: data?.properties ?? [], renters: data?.renters ?? [], tenancies: data?.tenancies ?? [],
    loading: query.isLoading, error: query.error, online, userId, busy: mutation.isPending,
    refetch: query.refetch, run: mutation.mutateAsync,
    fileUrl: (id: string, download = false) => repos.renters.fileUrl(id, download),
    listMembers: (propertyId: string) => repos.properties.listMembers(propertyId),
    listFriends: () => repos.friends.getFriends(userId!),
  };
}
