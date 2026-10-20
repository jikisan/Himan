import { useState } from 'react';
import { Text, View } from 'react-native';
import { format, parseISO } from 'date-fns';
import { CONTRACT_BADGE, contractOpen, contractStage, detailsStatus, formatPesos, ordinal, roomSpots } from '@himan/shared/rentals';
import type { ContractStage, ContractText, RentalProperty, RentalTenancy, RentalUnit, Renter, TenancyLink } from '@himan/shared/rentals';
import { Badge, Btn, Check, Empty, Initials, Input, card, muted, showMenu, text } from './ui';
import type { MenuOption } from './ui';

/** Where the written contract stands, until it's done or not needed: amber when there's none yet. */
export function ContractBadge({ stage }: { stage: ContractStage }) {
  const label = CONTRACT_BADGE[stage];
  return label ? <Badge label={label} tone={stage === 'none' ? 'amber' : 'primary'} /> : null;
}

/** A small "More" menu over a dimmed screen. */
export function moreMenu(title: string, options: MenuOption[]) { showMenu(title, options); }

const roomType = (unit: RentalUnit) =>
  (unit.kind === 'whole' ? 'Whole house' : unit.kind === 'room' ? 'Private room' : `Shared room · ${unit.capacity} beds`)
  + (unit.extraPersonRentCentavos && unit.defaultRentCentavos ? ` · +${formatPesos(unit.extraPersonRentCentavos)} per extra person` : '');
const rentLine = (t: RentalTenancy) => {
  const c = t.contracts.find((x) => x.status === 'active') ?? t.contracts[0];
  return c ? `${formatPesos(c.monthlyRentCentavos)}/mo · due every ${ordinal(c.dueDay)}` : 'No contract';
};

export function RoomsBoard({ property, tenancies, renters, canManage, canEdit, links, contractTexts, onAddTenant, onOpenTenant, onMoveOut, onEditRoom,
  onDeleteRoom }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; canManage: boolean; canEdit: boolean; links: TenancyLink[];
  contractTexts: ContractText[]; onAddTenant(unitId: string): void; onOpenTenant(renterId: string): void; onMoveOut(tenancyId: string): void;
  onEditRoom(unitId: string): void; onDeleteRoom(unitId: string): void;
}) {
  const name = (renterId: string) => renters.find((r) => r.id === renterId)?.fullName ?? 'Tenant';
  return <View className="gap-4">{property.units.map((unit) => {
    const spots = roomSpots(unit, tenancies);
    const free = spots.filter((t) => !t).length;
    return <View key={unit.id} accessibilityLabel={unit.name} className={`${card} gap-3`}>
      <View className="flex-row items-center gap-3">
        <View className="flex-1"><Text accessibilityRole="header" className={`text-base font-semibold ${text}`}>{unit.name}</Text>
          <Text className={`text-sm ${muted}`}>{roomType(unit)}</Text></View>
        <Badge label={free ? `${free} free` : 'Full'} tone={free ? 'red' : 'green'} />
        {canEdit && <Btn small variant="ghost" icon="more-horizontal" label="More" a11y={`${unit.name} options`} onPress={() => moreMenu(unit.name, [
          { label: 'Edit room', onPress: () => onEditRoom(unit.id) }, { label: 'Delete room', destructive: true, onPress: () => onDeleteRoom(unit.id) }])} />}
      </View>
      {spots.map((t, i) => t ? <View key={t.id} className="gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
        <View className="flex-row items-center gap-3"><Initials name={name(t.renterId)} />
          <View className="flex-1 gap-0.5">
            <View className="flex-row flex-wrap items-center gap-2"><Text className={`font-semibold ${text}`}>{name(t.renterId)}</Text>
              <ContractBadge stage={contractStage(t, contractTexts)} /></View>
            <Text className={`text-sm ${muted}`}>{rentLine(t)}</Text>
            {detailsStatus(links, t.id) && <Text className="text-xs font-semibold text-amber-700 dark:text-amber-300">{detailsStatus(links, t.id)}</Text>}
          </View></View>
        <View className="flex-row gap-2">
          <Btn grow icon="user" label="View tenant" a11y={`View ${name(t.renterId)}`} onPress={() => onOpenTenant(t.renterId)} />
          {canManage && <Btn grow variant="dangerOutline" icon="log-out" label="Move out" a11y={`Move out ${name(t.renterId)}`} onPress={() => onMoveOut(t.id)} />}
        </View>
      </View> : canManage ? <Btn key={`free-${i}`} icon="plus" a11y={`Add tenant to ${unit.name}`}
        label={`Add tenant${unit.defaultRentCentavos > 0 ? ` · ${formatPesos(unit.defaultRentCentavos)}/mo` : ''}`} onPress={() => onAddTenant(unit.id)} />
        : <Text key={`free-${i}`} className={`rounded-xl border border-dashed border-gray-300 p-3 text-center ${muted}`}>Empty</Text>)}
    </View>;
  })}</View>;
}

export function TenantsList({ renters, tenancies, unitName, links, contractTexts, onOpen }: {
  renters: Renter[]; tenancies: RentalTenancy[]; unitName(id: string): string; links: TenancyLink[]; contractTexts: ContractText[]; onOpen(renterId: string): void;
}) {
  const [query, setQuery] = useState('');
  const [showPast, setShowPast] = useState(false);
  const rows = renters.map((r) => {
    const active = tenancies.filter((t) => t.renterId === r.id && t.moveOut === null);
    const rent = active.reduce((sum, t) => sum + (t.contracts.find((c) => c.status === 'active')?.monthlyRentCentavos ?? 0), 0);
    const since = active.map((t) => t.moveIn).sort()[0];
    return { renter: r, rooms: active.map((t) => unitName(t.unitId)), rent, since, status: active.map((t) => detailsStatus(links, t.id)).find(Boolean),
      contract: active.map((t) => contractStage(t, contractTexts)).find(contractOpen) };
  }).filter(({ renter, rooms }) => (showPast || rooms.length > 0) && renter.fullName.toLowerCase().includes(query.trim().toLowerCase()));
  return <View className="gap-3">
    <Input accessibilityLabel="Search tenants" placeholder="Search by name" value={query} onChangeText={setQuery} />
    <Check label="Show past tenants" checked={showPast} onChange={setShowPast} />
    {rows.length === 0 ? <Empty icon="users" title={query ? 'No tenant matches that name.' : 'No tenants yet'}>{query ? undefined : 'Add one from an empty room.'}</Empty>
      : rows.map(({ renter, rooms, rent, since, status, contract }) => <View key={renter.id} className={`${card} gap-3`}>
        <View className="flex-row items-center gap-3"><Initials name={renter.fullName} />
          <View className="flex-1 gap-0.5">
            <View className="flex-row flex-wrap items-center gap-2"><Text className={`font-semibold ${text}`}>{renter.fullName}</Text>{contract && <ContractBadge stage={contract} />}</View>
            {status ? <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">{status}</Text>
              : <Text className={`text-sm ${muted}`}>{renter.phone || 'No number saved'}</Text>}
            <Text className={`text-sm ${muted}`}>{rooms.length ? rooms.join(', ') : 'Moved out'}{rent ? ` · ${formatPesos(rent)}/mo` : ''}{since ? ` · since ${format(parseISO(since), 'MMM yyyy')}` : ''}</Text>
          </View></View>
        <Btn icon="user" label="View tenant" a11y={`View ${renter.fullName}`} onPress={() => onOpen(renter.id)} />
      </View>)}
  </View>;
}
