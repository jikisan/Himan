import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { CONTRACT_BADGE, contractOpen, contractStage, detailsStatus, formatPesos, roomSpots } from '@himan/shared/rentals';
import type { ContractStage, ContractText, RentalProperty, RentalTenancy, RentalUnit, Renter, TenancyLink } from '@himan/shared/rentals';
import { Badge, Check, Empty, Input, card, muted, showMenu, text, useIconColor } from './ui';
import type { IconName, MenuOption } from './ui';

/** Where the written contract stands, until it's done or not needed: amber when there's none yet. */
export function ContractBadge({ stage, small }: { stage: ContractStage; small?: boolean }) {
  const label = CONTRACT_BADGE[stage];
  return label ? <Badge label={label} tone={stage === 'none' ? 'amber' : 'primary'} small={small} icon={small ? 'file-text' : undefined} /> : null;
}

/** One line of a tile: a small icon, then its words (which may wrap). */
function TileLine({ icon, color = '#9ca3af', children }: { icon: IconName; color?: string; children: React.ReactNode }) {
  return <View className="flex-row items-start gap-1.5">
    <View className="mt-0.5"><Feather accessible={false} name={icon} size={13} color={color} /></View>
    <View className="shrink">{children}</View>
  </View>;
}

/** A small "More" menu over a dimmed screen. */
export function moreMenu(title: string, options: MenuOption[]) { showMenu(title, options); }

const roomType = (unit: RentalUnit) =>
  unit.kind === 'whole' ? 'Whole house' : unit.kind === 'room' ? 'Private room' : `Shared room · ${unit.capacity} beds`;

const HALF = { width: '48%' } as const;

/**
 * A tile per room: type, Full or N free, a bar per bed (filled when taken), who lives there and the rent. Pressing it opens the
 * room's actions (view or move out a tenant, add a tenant to a free bed, edit or delete the room). Then the Add room tile.
 */
export function RoomsBoard({ property, tenancies, renters, canManage, canEdit, links, contractTexts, onAddTenant, onOpenTenant, onMoveOut, onEditRoom,
  onDeleteRoom, onAddRoom }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; canManage: boolean; canEdit: boolean; links: TenancyLink[];
  contractTexts: ContractText[]; onAddTenant(unitId: string): void; onOpenTenant(renterId: string): void; onMoveOut(tenancyId: string): void;
  onEditRoom(unitId: string): void; onDeleteRoom(unitId: string): void; onAddRoom?(): void;
}) {
  const name = (renterId: string) => renters.find((r) => r.id === renterId)?.fullName ?? 'Tenant';
  const icon = useIconColor();
  return <View className="flex-row flex-wrap justify-between gap-y-3">{property.units.map((unit) => {
    const spots = roomSpots(unit, tenancies);
    const taken = spots.filter((t): t is RentalTenancy => !!t);
    const free = spots.length - taken.length;
    const rent = taken.reduce((sum, t) => sum + (t.contracts.find((c) => c.status === 'active')?.monthlyRentCentavos ?? 0), 0);
    // Grouped under "Tenant" and "Room" so it's clear what each action changes.
    const who = taken.length > 1 ? 'Tenants' : 'Tenant';
    const tenantOptions: MenuOption[] = [
      ...taken.flatMap((t): MenuOption[] => {
        const who = name(t.renterId);
        const stage = contractStage(t, contractTexts);
        const details = detailsStatus(links, t.id);
        // What the tile warns about, as its own action in the warning's colour (the contract pill's, the details line's): both open the tenant.
        const todo = { none: ['Create contract for', 'file-plus'], draft: ['Send contract to', 'send'], sent: ['Open contract of', 'edit-3'], signed: ['Countersign contract of', 'edit-3'] } as const;
        const contract = canManage && contractOpen(stage) && stage in todo ? todo[stage as keyof typeof todo] : null;
        return [
          { label: `View ${who}`, icon: 'user', onPress: () => onOpenTenant(t.renterId) },
          ...(contract ? [{ label: `${contract[0]} ${who}`, icon: contract[1], tone: stage === 'none' ? 'amber' as const : 'primary' as const, onPress: () => onOpenTenant(t.renterId) }] : []),
          ...(canManage && details ? [{ label: details === 'Details to review' ? `Review details of ${who}` : `Get details from ${who}`,
            icon: details === 'Details to review' ? 'check-circle' as const : 'clipboard' as const, tone: 'amber' as const, onPress: () => onOpenTenant(t.renterId) }] : []),
          ...(canManage ? [{ label: `Move out ${who}`, icon: 'log-out' as const, destructive: true, onPress: () => onMoveOut(t.id) }] : []),
        ];
      }),
      ...(canManage && free ? [{ label: `Add tenant${unit.defaultRentCentavos > 0 ? ` · ${formatPesos(unit.defaultRentCentavos)}/mo` : ''}`, icon: 'plus' as const,
        tone: 'green' as const, onPress: () => onAddTenant(unit.id) }] : []),
    ];
    const roomOptions: MenuOption[] = canEdit ? [
      { label: 'Edit room', icon: 'edit-2', onPress: () => onEditRoom(unit.id) },
      { label: 'Delete room', icon: 'trash-2', destructive: true, onPress: () => onDeleteRoom(unit.id) },
    ] : [];
    const open = () => moreMenu(unit.name, [
      ...tenantOptions.map((o, i) => (i === 0 ? { ...o, heading: who } : o)),
      ...roomOptions.map((o, i) => (i === 0 ? { ...o, heading: 'Room' } : o)),
    ]);
    const attention = taken.map((t) => detailsStatus(links, t.id)).find(Boolean);
    return <Pressable key={unit.id} style={HALF} accessibilityRole="button" onPress={open}
      accessibilityLabel={`${unit.name}, ${roomType(unit)}, ${free ? `${free} free` : 'full'}. Shows its actions`}
      className={`${card} min-h-44 gap-2 active:opacity-70`}>
      <View className="flex-row items-center justify-between">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-sky-700"><MaterialCommunityIcons name="door-closed" size={24} color="#fff" /></View>
        <Badge label={free ? `${free} free` : 'Full'} tone={free ? 'amber' : 'green'} />
      </View>
      <View><Text numberOfLines={1} className={`text-base font-semibold ${text}`}>{unit.name}</Text>
        <Text numberOfLines={1} className={`text-xs ${muted}`}>{roomType(unit)}</Text></View>
      <View className="flex-row flex-wrap gap-1.5">{spots.map((t, i) => <View key={t?.id ?? `bed-${i}`}
        className={`h-2 w-5 rounded-full ${t ? 'bg-sky-500' : 'border border-gray-400'}`} />)}</View>
      <View className="mt-auto gap-1.5">
        {taken.length ? <TileLine icon="user"><Text numberOfLines={2} className={`text-sm ${text}`}>{taken.map((t) => name(t.renterId)).join(', ')}</Text></TileLine>
          : <Text className={`text-sm ${muted}`}>{canManage ? 'Press to add a tenant' : 'Empty'}</Text>}
        {taken.length === 1 && <ContractBadge small stage={contractStage(taken[0], contractTexts)} />}
        {attention && <TileLine icon="alert-circle" color="#d97706"><Text numberOfLines={1} className="text-xs font-semibold text-amber-700 dark:text-amber-300">{attention}</Text></TileLine>}
        {rent > 0 && <TileLine icon="credit-card"><Text className={`text-sm font-bold ${text}`}>{formatPesos(rent)}<Text className={`text-xs font-normal ${muted}`}> /mo</Text></Text></TileLine>}
      </View>
    </Pressable>;
  })}
    {canEdit && onAddRoom && <Pressable style={HALF} accessibilityRole="button" accessibilityLabel="Add room" onPress={onAddRoom}
      className="min-h-44 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 p-4 active:opacity-70 dark:border-gray-600">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800"><Feather name="plus" size={24} color={icon} /></View>
      <Text className={`text-base font-semibold ${text}`}>Add room</Text>
    </Pressable>}
  </View>;
}

const AVATARS = ['bg-emerald-700', 'bg-sky-700', 'bg-violet-700', 'bg-amber-700', 'bg-rose-700', 'bg-teal-700'];
const avatarColor = (name: string) => AVATARS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATARS.length];

function IconLine({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} className="flex-row items-center gap-1.5">
    <Feather name={icon} size={13} color="#9ca3af" /><Text numberOfLines={1} className={`text-xs ${text}`}>{value}</Text></View>;
}

/** A tile per tenant: initial, name, then room, rent and move-in date as icon lines; a red mark when they have something to do. */
export function TenantsList({ renters, tenancies, unitName, links, contractTexts, onOpen, todo }: {
  renters: Renter[]; tenancies: RentalTenancy[]; unitName(id: string): string; links: TenancyLink[]; contractTexts: ContractText[]; onOpen(renterId: string): void;
  /** To-do count per renter id, for the red mark. */
  todo?: Map<string, number>;
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
      : <View className="flex-row flex-wrap justify-between gap-y-3">{rows.map(({ renter, rooms, rent, since, status, contract }) => {
        const count = todo?.get(renter.id) ?? 0;
        return <Pressable key={renter.id} style={HALF} accessibilityRole="button" onPress={() => onOpen(renter.id)}
          accessibilityLabel={`View ${renter.fullName}${count ? `, ${count} to do` : ''}`}
          className={`${card} items-center gap-2 active:opacity-70`}>
          {count > 0 && <View accessible={false} style={{ position: 'absolute', top: 10, right: 10 }}><Feather name="alert-circle" size={20} color="#ef4444" /></View>}
          <View className={`h-16 w-16 items-center justify-center rounded-full ${avatarColor(renter.fullName)}`}>
            <Text className="text-2xl font-bold text-white">{renter.fullName.trim()[0]?.toUpperCase() ?? '?'}</Text></View>
          <Text numberOfLines={2} className={`text-center text-base font-semibold ${text}`}>{renter.fullName}</Text>
          {contract && <View className="self-center"><ContractBadge stage={contract} /></View>}
          {status ? <Text className="text-center text-xs font-semibold text-amber-700 dark:text-amber-300">{status}</Text> : null}
          <View className="items-center gap-1">
            <IconLine icon="key" label="Room" value={rooms.length ? rooms.join(', ') : 'Moved out'} />
            {rent > 0 && <IconLine icon="credit-card" label="Rent" value={formatPesos(rent)} />}
            {since && <IconLine icon="calendar" label="Since" value={format(parseISO(since), 'MMM d, yyyy')} />}
          </View>
        </Pressable>;
      })}</View>}
  </View>;
}
