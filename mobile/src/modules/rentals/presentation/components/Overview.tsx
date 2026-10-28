import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { addPeriods, formatBillPesos, manilaToday, monthFigures, periodLabel, periodOf } from '@himan/shared/rentals';
import type { AttentionItem, OverviewCtx, RentalProperty, RentalSettlement, RentalTenancy } from '@himan/shared/rentals';
import { Btn, card, muted, text, useIconColor } from './ui';
import type { IconName } from './ui';

export const SECTIONS = ['todo', 'rooms', 'tenants', 'bills', 'analytics'] as const;
export type Section = (typeof SECTIONS)[number];
export const SECTION_TITLE: Record<Section, string> = { todo: 'To do', rooms: 'Rooms', tenants: 'Tenants', bills: 'Bills', analytics: 'Analytics' };
const SECTION_ICON: Record<Section, { icon: IconName; color: string }> = {
  todo: { icon: 'check-square', color: 'bg-amber-600' },
  rooms: { icon: 'key', color: 'bg-sky-700' },
  tenants: { icon: 'users', color: 'bg-emerald-700' },
  bills: { icon: 'file-text', color: 'bg-rose-700' },
  analytics: { icon: 'bar-chart-2', color: 'bg-violet-700' },
};

const tile = 'min-h-32 gap-3 rounded-2xl border border-gray-200 bg-white p-4 active:opacity-70 dark:border-gray-700 dark:bg-gray-800';
const HALF = { width: '48%' } as const;

function CountBadge({ count }: { count: number }) {
  return count > 0 ? <View accessible={false} className="absolute right-3 top-3 h-6 min-w-6 items-center justify-center rounded-full border-2 border-gray-50 bg-red-600 px-1.5 dark:border-gray-900">
    <Text className="text-xs font-bold text-white">{count > 99 ? '99+' : count}</Text></View> : null;
}

function TileIcon({ icon, color }: { icon: IconName; color: string }) {
  return <View accessible={false} className={`h-12 w-12 items-center justify-center rounded-2xl ${color}`}><Feather name={icon} size={24} color="#fff" /></View>;
}

/** The first screen: a tile per property, then the dashed tile that starts a new one. */
export function PropertyGrid({ properties, tenancies, todoFor, canCreate, onOpen, onNew }: {
  properties: RentalProperty[]; tenancies: RentalTenancy[]; todoFor(propertyId: string): number; canCreate: boolean;
  onOpen(propertyId: string): void; onNew(): void;
}) {
  const icon = useIconColor();
  return <View className="flex-row flex-wrap justify-between gap-y-3">
    {properties.map((p) => {
      const taken = tenancies.filter((t) => t.propertyId === p.id && t.moveOut === null).length;
      const beds = p.units.reduce((sum, u) => sum + u.capacity, 0);
      const count = todoFor(p.id);
      return <Pressable key={p.id} style={HALF} accessibilityRole="link" onPress={() => onOpen(p.id)}
        accessibilityLabel={`${p.name}, ${taken} of ${beds} beds taken${count ? `, ${count} to do` : ''}${p.archivedAt ? ', archived' : ''}`}
        className={`${tile} ${p.archivedAt ? 'opacity-70' : ''}`}>
        <TileIcon icon="home" color="bg-indigo-600" />
        <View className="mt-auto gap-0.5">
          <Text numberOfLines={2} className={`text-base font-semibold ${text}`}>{p.name}</Text>
          <Text className={`text-sm ${muted}`}>{taken} of {beds} beds taken{p.archivedAt ? ' · Archived' : ''}</Text>
        </View>
        <CountBadge count={count} />
      </Pressable>;
    })}
    <Pressable style={HALF} accessibilityRole="button" accessibilityLabel="New property" accessibilityState={{ disabled: !canCreate }} disabled={!canCreate} onPress={onNew}
      className={`min-h-32 items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 p-4 active:opacity-70 dark:border-gray-600 ${canCreate ? '' : 'opacity-50'}`}>
      <View className="h-12 w-12 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-800"><Feather name="plus" size={24} color={icon} /></View>
      <Text className={`text-base font-semibold ${text}`}>New property</Text>
    </Pressable>
  </View>;
}

/** The property screen's tiles, one per section. */
export function SectionTiles({ details, badges, onOpen }: {
  details: Record<Section, string>; badges: Partial<Record<Section, number>>; onOpen(section: Section): void;
}) {
  return <View className="flex-row flex-wrap justify-between gap-y-3">
    {SECTIONS.map((s) => {
      const count = badges[s] ?? 0;
      return <Pressable key={s} style={HALF} accessibilityRole="link" onPress={() => onOpen(s)}
        accessibilityLabel={`${SECTION_TITLE[s]}, ${details[s]}${count ? `, ${count} need${count === 1 ? 's' : ''} attention` : ''}`} className={tile}>
        <TileIcon {...SECTION_ICON[s]} />
        <View className="mt-auto gap-0.5">
          <Text className={`text-base font-semibold ${text}`}>{SECTION_TITLE[s]}</Text>
          <Text numberOfLines={1} className={`text-sm ${muted}`}>{details[s]}</Text>
        </View>
        <CountBadge count={count} />
      </Pressable>;
    })}
  </View>;
}

const when = (item: AttentionItem) => item.inDays < 0 ? `${-item.inDays} day${item.inDays === -1 ? '' : 's'} late`
  : item.inDays === 0 ? 'today' : item.inDays === 1 ? 'tomorrow' : `in ${item.inDays} days`;

/** The most urgent things, at most three, each with the button that deals with it; the rest wait on the To do screen. */
export function NeedsAttention({ items, name, room, billPeriod, canManage, onSeeAll, onRecordPayment, onOpenBill, onOpenTenant }: {
  items: AttentionItem[]; name(renterId: string): string; room(unitId: string): string; billPeriod(billId: string): string | undefined;
  canManage: boolean; onSeeAll(): void; onRecordPayment(tenancyId: string, billId: string): void; onOpenBill(billId: string): void; onOpenTenant(renterId: string): void;
}) {
  if (!items.length) return <View className={`${card} flex-row items-center gap-3`}>
    <Feather name="check-circle" size={20} color="#059669" />
    <Text className={`flex-1 text-base font-semibold ${text}`}>All caught up</Text>
    <Btn small variant="ghost" label="See to do" onPress={onSeeAll} />
  </View>;
  return <View className="overflow-hidden rounded-2xl border border-red-300 bg-white dark:border-red-900 dark:bg-gray-800">
    <View className="flex-row items-center justify-between gap-3 px-4 pt-3">
      <View className="flex-row items-center gap-2"><Feather name="alert-circle" size={18} color="#dc2626" />
        <Text accessibilityRole="header" className="text-base font-semibold text-red-600 dark:text-red-400">Needs attention</Text></View>
      <Btn small variant="ghost" label={items.length > 3 ? `See all (${items.length})` : 'See all'} onPress={onSeeAll} />
    </View>
    {items.slice(0, 3).map((item, i) => {
      const who = name(item.renterId);
      const period = item.billId ? billPeriod(item.billId) : undefined;
      const title = item.kind === 'due_soon' ? `Rent due ${format(parseISO(item.date), 'MMM d')}`
        : `${period ? `${periodLabel(period).split(' ')[0]} bill` : 'Bill'} ${item.kind === 'overdue' ? 'overdue' : 'unpaid'}`;
      return <View key={item.key} className={`gap-2 px-4 py-3 ${i ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
        <View><Text className={`text-base font-semibold ${text}`}>{title}</Text>
          <Text className={`text-sm ${item.kind === 'overdue' ? 'font-semibold text-red-600 dark:text-red-400' : muted}`}>
            {who} · {room(item.unitId)} · {formatBillPesos(item.amountCentavos)} · {when(item)}</Text></View>
        {item.billId && canManage ? <Btn small variant="primary" label="Record payment" a11y={`Record payment from ${who}`} onPress={() => onRecordPayment(item.tenancyId, item.billId!)} />
          : item.billId ? <Btn small icon="file-text" label="View SOA" onPress={() => onOpenBill(item.billId!)} />
          : <Btn small icon="user" label="View tenant" a11y={`View ${who}`} onPress={() => onOpenTenant(item.renterId)} />}
      </View>;
    })}
  </View>;
}

/** The month bar Bills and Analytics share. */
export function MonthBar({ period, onChange, min, max }: { period: string; onChange(period: string): void; min?: string; max?: string }) {
  return <View className="flex-row items-center justify-between rounded-2xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-800">
    <Btn iconOnly variant="ghost" icon="chevron-left" label="Previous" a11y="Previous month" disabled={!!min && period <= min} onPress={() => onChange(addPeriods(period, -1))} />
    <Text accessibilityRole="header" className={`flex-1 text-center text-base font-semibold ${text}`}>{periodLabel(period)}</Text>
    <Btn iconOnly variant="ghost" icon="chevron-right" label="Next" a11y="Next month" disabled={!!max && period >= max} onPress={() => onChange(addPeriods(period, 1))} />
  </View>;
}

const C = 2 * Math.PI * 30;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function Ring({ value, label, detail, color, center }: { value: number | null; label: string; detail: string; color: string; center: string }) {
  const filled = value === null ? 0 : Math.max(0, Math.min(1, value)) * C;
  return <View accessible accessibilityLabel={`${label}: ${center}, ${detail}`} className="flex-1 items-center gap-1.5">
    <View className="h-20 w-20 items-center justify-center">
      <Svg width={80} height={80} viewBox="0 0 76 76" style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={38} cy={38} r={30} fill="none" strokeWidth={8} stroke="#9ca3af" strokeOpacity={0.3} />
        {filled > 0 && <Circle cx={38} cy={38} r={30} fill="none" strokeWidth={8} strokeLinecap="round" stroke={color} strokeDasharray={`${filled} ${C}`} />}
      </Svg>
      <Text className={`text-base font-bold ${text}`}>{center}</Text>
    </View>
    <Text className={`text-center text-xs ${text}`}>{label}</Text>
    <Text className={`text-center text-[10px] ${muted}`}>{detail}</Text>
  </View>;
}

/** A month in numbers: three rings, six months of billed against collected, and money tiles. */
export function AnalyticsView({ ctx, settlements }: { ctx: OverviewCtx; settlements: RentalSettlement[] }) {
  const today = manilaToday();
  const [period, setPeriod] = useState(periodOf(today));
  const f = monthFigures(ctx, period, settlements);
  const month = periodLabel(period).split(' ')[0];
  const top = Math.max(1, ...f.trend.flatMap((m) => [m.billedCentavos, m.collectedCentavos]));
  const earliest = ctx.tenancies.map((t) => periodOf(t.moveIn)).sort()[0] ?? periodOf(today);
  const money = [
    { label: 'Monthly rent', value: formatBillPesos(f.rentCentavos) },
    { label: 'Unpaid', value: formatBillPesos(f.unpaidCentavos), red: f.unpaidCentavos > 0 },
    { label: 'Deposits held', value: formatBillPesos(f.depositsCentavos), extra: f.depositsPendingCentavos > 0 ? `${formatBillPesos(f.depositsPendingCentavos)} pending` : '' },
  ];
  return <View className="gap-4">
    <MonthBar period={period} onChange={setPeriod} min={earliest} max={periodOf(today)} />
    <View className={`${card} flex-row gap-2 px-2`}>
      <Ring label="Collected" value={f.billedCentavos ? f.collectedCentavos / f.billedCentavos : null} color="#f87171"
        center={f.billedCentavos ? `${pct(f.collectedCentavos, f.billedCentavos)}%` : '—'}
        detail={`${formatBillPesos(f.collectedCentavos)} of ${formatBillPesos(f.billedCentavos)}`} />
      <Ring label={`${month} SOAs`} value={f.soasToBill ? f.soasIssued / f.soasToBill : null} color="#818cf8" center={`${f.soasIssued}/${f.soasToBill}`}
        detail={!f.soasToBill ? 'None this month' : f.soasIssued >= f.soasToBill ? 'All generated' : `${f.soasToBill - f.soasIssued} to generate`} />
      <Ring label="Occupancy" value={f.beds ? f.bedsTaken / f.beds : null} color="#38bdf8" center={`${pct(f.bedsTaken, f.beds)}%`}
        detail={`${f.bedsTaken} of ${f.beds} beds`} />
    </View>
    <View className={`${card} gap-3`}>
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text accessibilityRole="header" className={`text-base font-semibold ${text}`}>Billed vs collected</Text>
        <View className="flex-row gap-3">
          <View className="flex-row items-center gap-1"><View className="h-2 w-2 rounded-sm bg-indigo-500" /><Text className={`text-xs ${muted}`}>Billed</Text></View>
          <View className="flex-row items-center gap-1"><View className="h-2 w-2 rounded-sm bg-emerald-400" /><Text className={`text-xs ${muted}`}>Collected</Text></View>
        </View>
      </View>
      <View className="h-32 flex-row items-end gap-2 border-b border-gray-300 dark:border-gray-600">
        {f.trend.map((m) => <View key={m.period} accessible accessibilityLabel={`${periodLabel(m.period)}: ${formatBillPesos(m.billedCentavos)} billed, ${formatBillPesos(m.collectedCentavos)} collected`}
          className="h-full flex-1 flex-row items-end justify-center gap-0.5">
          <View className="flex-1 rounded-t bg-indigo-500" style={{ height: `${(m.billedCentavos / top) * 100}%` }} />
          <View className="flex-1 rounded-t bg-emerald-400" style={{ height: `${(m.collectedCentavos / top) * 100}%` }} />
        </View>)}
      </View>
      <View className="flex-row gap-2">{f.trend.map((m) => <Text key={m.period}
        className={`flex-1 text-center text-xs ${m.period === period ? `font-semibold ${text}` : muted}`}>{format(parseISO(`${m.period}-01`), 'MMM')}</Text>)}</View>
    </View>
    <View className="flex-row gap-2">
      {money.map((m) => <View key={m.label} className="flex-1 gap-1 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <Text className={`text-xs ${muted}`}>{m.label}</Text>
        <Text className={`text-sm font-bold ${m.red ? 'text-red-600 dark:text-red-400' : text}`}>{m.value}</Text>
        {m.extra ? <Text className={`text-[10px] ${muted}`}>{m.extra}</Text> : null}
      </View>)}
    </View>
  </View>;
}
