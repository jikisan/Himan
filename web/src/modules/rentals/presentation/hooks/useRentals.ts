import { useMemo, useSyncExternalStore } from 'react';
import { onlineManager, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@auth/index';
import { FriendRepository } from '@himan/shared/friends';
import { ProfileRepository } from '@himan/shared/profile';
import { addTenant, issueBills, moveOut, setupProperty } from '@himan/shared/rentals';
import type { AddTenantInput, BillLine, ContractTermsInput, IssueBillInput, MeterKind, PropertyInput, ReadingInput, RenterInput,
  StartTenancyInput, TenancyCharge, UnitInput } from '@himan/shared/rentals';
import { BillRepository, PropertyRepository, RenterRepository, TenancyRepository } from '../../infrastructure';

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
  | ({ type: 'addTenant' } & AddTenantInput)
  | { type: 'updateTerms'; contractId: string; input: ContractTermsInput }
  | { type: 'setupProperty'; input: PropertyInput; rooms: UnitInput[] }
  | { type: 'saveReadings'; propertyId: string; inputs: ReadingInput[] }
  | { type: 'removeReading'; id: string }
  | { type: 'issueBills'; inputs: IssueBillInput[] }
  | { type: 'updateBillLines'; id: string; lines: BillLine[] }
  | { type: 'voidBill'; id: string; reason: string }
  | { type: 'setCharges'; tenancyId: string; charges: TenancyCharge[] }
  | { type: 'changeRent'; contractId: string; from: string; rentCentavos: number }
  | { type: 'moveOut'; tenancyId: string; moveOut: string; readings: { kind: MeterKind; value: number }[] }
  | { type: 'addMember'; propertyId: string; userId: string; role: 'manager' | 'viewer' }
  | { type: 'removeMember'; propertyId: string; userId: string };

export function useRentals() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const repos = useMemo(() => ({ properties: new PropertyRepository(), renters: new RenterRepository(),
    tenancies: new TenancyRepository(), bills: new BillRepository(), friends: new FriendRepository(), profile: new ProfileRepository() }), []);
  const online = useSyncExternalStore(onlineManager.subscribe, () => onlineManager.isOnline());
  const query = useQuery({
    queryKey: ['rentals', userId], enabled: !!userId && online,
    meta: { sensitive: true }, gcTime: 0, staleTime: 0, retry: false, refetchOnMount: 'always', networkMode: 'always',
    queryFn: async () => {
      const [properties, renters, tenancies, bills, readings, profile] = await Promise.all([
        repos.properties.findAll(userId!), repos.renters.findAll(), repos.tenancies.findAll(),
        repos.bills.findAll(), repos.bills.findReadings(), repos.profile.get(userId!).catch(() => null)]);
      return { properties, renters, tenancies, bills, readings, myName: profile?.fullName?.trim() ?? '' };
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
        case 'addTenant': return addTenant(repos, a);
        case 'updateTerms': return repos.tenancies.updateTerms(a.contractId, a.input);
        case 'setupProperty': return setupProperty(repos, a);
        case 'saveReadings': return repos.bills.saveReadings(a.propertyId, a.inputs);
        case 'removeReading': return repos.bills.removeReading(a.id);
        case 'issueBills': return issueBills(repos, a.inputs);
        case 'updateBillLines': return repos.bills.updateLines(a.id, a.lines);
        case 'voidBill': return repos.bills.void(a.id, a.reason);
        case 'setCharges': return repos.tenancies.setCharges(a.tenancyId, a.charges);
        case 'changeRent': return repos.tenancies.changeRent(a.contractId, a.from, a.rentCentavos);
        case 'moveOut': {
          const data = query.data;
          const tenancy = data?.tenancies.find((t) => t.id === a.tenancyId);
          const property = data?.properties.find((p) => p.id === tenancy?.propertyId);
          if (!data || !property) throw new Error('Tenant not found');
          return moveOut(repos, { ctx: { property, tenancies: data.tenancies, readings: data.readings, bills: data.bills },
            tenancyId: a.tenancyId, moveOut: a.moveOut, readings: a.readings });
        }
        case 'addMember': return repos.properties.addMember(a.propertyId, a.userId, a.role);
        case 'removeMember': return repos.properties.removeMember(a.propertyId, a.userId);
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: ['rentals'] }),
  });
  const data = online && userId ? query.data : undefined;
  return {
    properties: data?.properties ?? [], renters: data?.renters ?? [], tenancies: data?.tenancies ?? [], myName: data?.myName ?? '',
    bills: data?.bills ?? [], readings: data?.readings ?? [],
    loading: query.isLoading, error: query.error, online, userId, busy: mutation.isPending,
    refetch: query.refetch, run: mutation.mutateAsync,
    fileUrl: (id: string, download = false) => repos.renters.fileUrl(id, download),
    listMembers: (propertyId: string) => repos.properties.listMembers(propertyId),
    listFriends: () => repos.friends.getFriends(userId!),
  };
}
