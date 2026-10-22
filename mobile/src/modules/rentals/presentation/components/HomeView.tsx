import { Alert, Text, View } from 'react-native';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { billBalance, contractStage, depositToReturn, earlierUnpaid, formatBillPesos, formatPesos, isEarlier, manilaToday, monthRows, monthTodo,
  nextDueDate, periodLabel, periodOf, unreplacedCancelled } from '@himan/shared/rentals';
import type { ContractText, MeterReading, RentalBill, RentalPayment, RentalProperty, RentalSettlement, RentalTenancy, Renter, TenancyLink,
  UtilityBill } from '@himan/shared/rentals';
import { Btn, IconTile, Title, card, muted, text } from './ui';
import type { IconName, Tone } from './ui';

const names = (list: string[]) => list.length <= 3 ? list.join(', ') : `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`;

type Task = { key: string; icon: IconName; tone: Tone; title: string; detail: string; action: string; a11y?: string; primary?: boolean; onAction(): void;
  secondary?: { action: string; a11y: string; onAction(): void } };

/** The landing tab: what needs doing for this property this month, then the numbers at a glance. Same rules as web HomeView. */
export function HomeView({ property, tenancies, renters, bills, readings, utilityBills, payments, contractTexts, links, settlements, canManage, canEdit,
  onReadMeters, onOpenBills, onOpenBill, onAddTenant, onAddRoom, onOpenTenant, onOpenContract, onReviewCancelled, onAddBillAmounts, onMarkEarlierPaid,
  onSettleDeposit, onContractNotNeeded }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; bills: RentalBill[]; readings: MeterReading[]; utilityBills: UtilityBill[];
  payments: RentalPayment[]; contractTexts: ContractText[]; links: TenancyLink[]; settlements: RentalSettlement[]; canManage: boolean; canEdit: boolean;
  onReadMeters(): void; onOpenBills(): void; onOpenBill(billId: string): void; onAddTenant(unitId: string): void; onAddRoom(): void;
  onOpenTenant(renterId: string): void; onOpenContract(renterId: string): void; onReviewCancelled(period: string): void; onAddBillAmounts(): void;
  onMarkEarlierPaid(): void; onSettleDeposit(tenancyId: string): void; onContractNotNeeded(tenancyId: string): void;
}) {
  const today = manilaToday();
  const period = periodOf(today);
  const month = periodLabel(period).split(' ')[0];
  const name = (t: Pick<RentalTenancy, 'renterId'>) => renters.find((r) => r.id === t.renterId)?.fullName ?? 'Tenant';
  const roomName = (unitId: string) => property.units.find((u) => u.id === unitId)?.name ?? 'Room';
  const active = tenancies.filter((t) => t.moveOut === null);
  const rows = monthRows({ property, tenancies, readings, bills, utilityBills }, period);
  const todo = monthTodo(rows, bills, today, property.units, payments);
  const overdue = todo.overdue.filter((b) => !isEarlier(b, property.paymentsTrackedFrom));
  const earlier = earlierUnpaid(property, bills, payments);
  const trackedSince = property.paymentsTrackedFrom ? format(parseISO(property.paymentsTrackedFrom), 'MMM d, yyyy') : '';
  const settlementOf = (t: RentalTenancy) => settlements.find((s) => s.tenancyId === t.id);
  const meterRooms = [...new Set([...todo.meters].map((key) => roomName(key.split(':')[0])))];
  const freeUnits = property.units.filter((u) => active.filter((t) => t.unitId === u.id).length < u.capacity);
  const freeBeds = freeUnits.reduce((sum, u) => sum + u.capacity - active.filter((t) => t.unitId === u.id).length, 0);
  const tenancyOf = (b: RentalBill) => tenancies.find((t) => t.id === b.tenancyId);
  const dueSoon = active.flatMap((tenancy) => {
    const contract = tenancy.contracts.find((c) => c.status === 'active');
    if (!contract) return [];
    const date = nextDueDate(contract.dueDay, today);
    const inDays = differenceInCalendarDays(parseISO(date), parseISO(today));
    return inDays <= 7 ? [{ tenancy, rent: contract.monthlyRentCentavos, date, inDays }] : [];
  }).sort((a, b) => a.inDays - b.inDays);

  const tasks: Task[] = [];
  if (canManage) for (const t of active) {
    const stage = contractStage(t, contractTexts);
    const who = name(t);
    const task = stage === 'none' ? { icon: 'file-plus' as const, title: `Create contract for ${who}`, detail: 'Not written yet', action: 'Create contract' }
      : stage === 'draft' ? { icon: 'send' as const, title: `Send contract to ${who}`, detail: 'Draft saved, not sent yet', action: 'Send' }
      : stage === 'sent' ? { icon: 'edit-3' as const, title: `Waiting for ${who} to sign`, detail: 'Sent through their link', action: 'Open' }
      : stage === 'signed' ? { icon: 'edit-3' as const, title: `Countersign contract for ${who}`, detail: 'The tenant signed', action: 'Countersign' }
      : null;
    if (task) tasks.push({ key: `contract-${t.id}`, tone: 'primary', ...task, detail: `${roomName(t.unitId)} · ${task.detail}`, a11y: task.title,
      onAction: () => onOpenContract(t.renterId),
      secondary: stage === 'none' || stage === 'draft' ? { action: 'Not needed', a11y: `Contract not needed for ${who}`, onAction: () => onContractNotNeeded(t.id) } : undefined });
  }
  if (property.units.length === 0 && canEdit) tasks.push({ key: 'room', icon: 'log-in', tone: 'primary', title: 'Add your first room',
    detail: 'Then you can move tenants in.', action: 'Add room', primary: true, onAction: onAddRoom });
  if (canManage && todo.meters.size) tasks.push({ key: 'meters', icon: 'activity', tone: 'amber',
    title: `Read ${todo.meters.size} meter${todo.meters.size === 1 ? '' : 's'}`, detail: `${names(meterRooms)} · needed for ${month} SOAs`,
    action: 'Read meters', primary: true, onAction: onReadMeters });
  if (canManage && todo.amounts.size) {
    const what = [...todo.amounts].map((key) => { const [unitId, kind] = key.split(':'); return `${roomName(unitId)} ${kind === 'electric' ? 'electricity' : 'water'}`; });
    tasks.push({ key: 'amounts', icon: 'file-text', tone: 'amber',
      title: `Add ${month} ${todo.amounts.size === 1 ? 'bill amount' : `${todo.amounts.size} bill amounts`}`,
      detail: `${names(what)} · needed for ${month} SOAs`, action: 'Add bill amounts', primary: !todo.meters.size, onAction: onAddBillAmounts });
  }
  if (canManage && todo.ready.length) tasks.push({ key: 'issue', icon: 'file-text', tone: 'primary',
    title: `Generate ${todo.ready.length} SOA${todo.ready.length === 1 ? '' : 's'}`,
    detail: `${names(todo.ready.map((r) => name(r.t)))} · ${formatBillPesos(todo.readyTotal)} total`,
    action: 'Review', primary: !todo.waiting.length, onAction: onOpenBills });
  const cancelled = canManage ? unreplacedCancelled({ property, tenancies, readings, bills, utilityBills }) : [];
  if (cancelled.length) {
    const what = (b: RentalBill) => `${(() => { const t = tenancyOf(b); return t ? name(t) : 'Tenant'; })()} (${
      b.kind === 'move_in' ? 'move-in' : b.kind === 'final' ? 'final' : periodLabel(b.period).split(' ')[0]})`;
    tasks.push({ key: 'cancelled', icon: 'file-text', tone: 'amber', title: `${cancelled.length} cancelled SOA${cancelled.length === 1 ? '' : 's'} not replaced`,
      detail: names(cancelled.map(what)), action: 'See cancelled', onAction: () => onReviewCancelled(cancelled[0].period) });
  }
  if (canManage) for (const t of active) {
    if (links.some((l) => l.tenancyId === t.id && l.status === 'submitted')) tasks.push({ key: `review-${t.id}`, icon: 'user-check', tone: 'primary',
      title: `Review details from ${name(t)}`, detail: `${roomName(t.unitId)} · sent through their link`, action: 'Review',
      a11y: `Review details from ${name(t)}`, onAction: () => onOpenTenant(t.renterId) });
  }
  if (canManage) for (const t of active) {
    const contract = t.contracts.find((c) => c.status === 'active');
    const left = contract ? differenceInCalendarDays(parseISO(contract.endDate), parseISO(today)) : Infinity;
    if (left <= 30) tasks.push({ key: `ends-${t.id}`, icon: 'calendar', tone: 'amber',
      title: left > 1 ? `Contract ends in ${left} days` : left === 1 ? 'Contract ends tomorrow' : left === 0 ? 'Contract ends today' : 'Contract has ended',
      detail: `${name(t)} · ${roomName(t.unitId)} · ${format(parseISO(contract!.endDate), 'MMM d, yyyy')}`, action: 'Open',
      a11y: `Open ${name(t)}’s contract`, onAction: () => onOpenTenant(t.renterId) });
  }
  if (canManage) for (const t of tenancies) {
    const deposit = depositToReturn(t, bills, payments, settlementOf(t));
    if (deposit.state === 'to_settle') tasks.push({ key: `deposit-${t.id}`, icon: 'dollar-sign', tone: 'amber', title: 'Deposit to return',
      detail: `${name(t)} · ${roomName(t.unitId)} · ${formatBillPesos(deposit.depositCentavos)}`, action: 'Settle',
      a11y: `Settle ${name(t)}’s deposit`, onAction: () => onSettleDeposit(t.id) });
  }
  if (canManage && freeBeds > 0) tasks.push({ key: 'free', icon: 'plus-circle', tone: 'green', title: `${freeBeds} free bed${freeBeds === 1 ? '' : 's'}`,
    detail: freeUnits.map((u) => u.name).join(' · '), action: 'Add tenant', onAction: () => onAddTenant(freeUnits[0].id) });

  const markEarlier = () => Alert.alert('Mark the earlier SOAs as paid?',
    `This records one payment per tenant for the ${formatBillPesos(earlier.totalCentavos)} still unpaid on SOAs from before ${trackedSince}. If some weren’t paid in full, cancel and instead open a tenant and record what was actually paid.`,
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Mark all as paid', onPress: onMarkEarlierPaid }]);

  return <View className="gap-5">
    <View className="gap-3">
      <Title>To do for {month}</Title>
      {tasks.length ? tasks.map((t) => <View key={t.key} className={`${card} gap-3`}>
        <View className="flex-row items-center gap-3">
          <IconTile icon={t.icon} tone={t.tone} />
          <View className="flex-1"><Text className={`text-base font-semibold ${text}`}>{t.title}</Text><Text className={`text-sm ${muted}`}>{t.detail}</Text></View>
        </View>
        <View className="flex-row gap-2">
          {t.secondary && <Btn grow variant="ghost" label={t.secondary.action} a11y={t.secondary.a11y} onPress={t.secondary.onAction} />}
          <Btn grow variant={t.primary ? 'primary' : 'outline'} label={t.action} a11y={t.a11y} onPress={t.onAction} />
        </View>
      </View>) : <View className={`${card} flex-row items-center gap-3`}>
        <IconTile icon="check-circle" tone="green" />
        <Text className={`flex-1 ${muted}`}><Text className={`font-semibold ${text}`}>Nothing to do right now. </Text>New tasks show up here when bills come due.</Text>
      </View>}
    </View>

    {canManage && earlier.tenancyIds.length > 0 && <View className={`${card} gap-3`}>
      <View className="flex-row items-center gap-3"><IconTile icon="clock" tone="amber" />
        <View className="flex-1"><Text className={`text-base font-semibold ${text}`}>Bills from before payment tracking</Text>
          <Text className={`text-sm ${muted}`}>{earlier.tenancyIds.length} tenant{earlier.tenancyIds.length === 1 ? '' : 's'} · {formatBillPesos(earlier.totalCentavos)} shows as unpaid on SOAs from before {trackedSince}.</Text></View></View>
      <Btn label="Mark all as paid" onPress={markEarlier} />
    </View>}

    {overdue.length > 0 && <View className={`${card} gap-1 border-red-300 dark:border-red-800`}>
      <Text accessibilityRole="header" className="text-base font-semibold text-red-600 dark:text-red-400">Overdue</Text>
      <Text className={`text-sm ${muted}`}>Unpaid after the due date. Press View SOA to record a payment.</Text>
      {overdue.map((b) => {
        const t = tenancyOf(b);
        const late = differenceInCalendarDays(parseISO(today), parseISO(b.dueOn));
        return <View key={b.id} className="gap-2 border-t border-gray-200 py-3 dark:border-gray-700">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1"><Text className={`font-semibold ${text}`}>{t ? name(t) : 'Tenant'}</Text>
              <Text className={`text-xs ${muted}`}>{t ? `${roomName(t.unitId)} · ` : ''}{b.number}</Text></View>
            <Text className="text-right text-sm font-semibold text-red-600 dark:text-red-400">{formatBillPesos(billBalance(b, payments))} left · {late} day{late === 1 ? '' : 's'} late</Text>
          </View>
          <Btn icon="file-text" label="View SOA" a11y={`View SOA ${b.number}`} onPress={() => onOpenBill(b.id)} />
        </View>;
      })}
    </View>}

    {dueSoon.length > 0 && <View className={`${card} gap-1`}>
      <Title size="base">Rent due in the next 7 days</Title>
      {dueSoon.map(({ tenancy, rent: amount, date, inDays }) => <View key={tenancy.id} className="gap-2 border-t border-gray-200 py-3 dark:border-gray-700">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1"><Text className={`font-semibold ${text}`}>{name(tenancy)}</Text>
            <Text className={`text-xs ${muted}`}>{roomName(tenancy.unitId)} · {format(parseISO(date), 'MMM d')} · {inDays === 0 ? 'today' : inDays === 1 ? 'tomorrow' : `in ${inDays} days`}</Text></View>
          <Text className={`font-semibold ${text}`}>{formatPesos(amount)}</Text>
        </View>
        <Btn icon="user" label="View tenant" a11y={`View ${name(tenancy)}`} onPress={() => onOpenTenant(tenancy.renterId)} />
      </View>)}
    </View>}
  </View>;
}
