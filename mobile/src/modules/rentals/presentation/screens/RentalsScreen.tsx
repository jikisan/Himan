import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DEFAULT_CLAUSES, billPaid, formatPesos, depositToReturn, errorMessage, hasRentalRole, manilaToday, monthRows, monthTodo, paidChangeWarning, pendingBill, periodOf,
  previousBalance, tenancyCredit, tenancyOwed, unreplacedCancelled } from '@himan/shared/rentals';
import type { ReceiptContext, RentalBill, RentalPayment, RentalTenancy } from '@himan/shared/rentals';
import { useToast } from '@/modules/shared/components/useToast';
import { useRentals } from '../hooks/useRentals';
import type { RentalAction, RentalsState } from '../hooks/useRentals';
import { Badge, Btn, Empty, MenuHost, Sheet, ToastContext, card, muted, text, useIconColor, useRentalToast } from '../components/ui';
import { HomeView } from '../components/HomeView';
import { RoomsBoard, TenantsList, moreMenu } from '../components/Lists';
import { BillSheet, BillsView } from '../components/Bills';
import { PaymentsList, RecordPaymentSheet } from '../components/Payments';
import { MoveInFlow, MoveOutSheet, TenantSheet } from '../components/Tenant';
import { SettleSheet } from '../components/Settle';
import { PaymentAccountsEditor, PropertyForm, RoleBadge, SetupWizard, ShareProperty, UnitForm } from '../components/PropertyForms';
import { ContractTemplateEditor, LessorSignatureEditor } from '../components/Contracts';

type View_ = 'home' | 'rooms' | 'tenants' | 'bills';
type DialogState = { type: 'setup' } | { type: 'property' } | { type: 'room'; id: string | null } | { type: 'addTenant'; unitId: string }
  | { type: 'tenant'; renterId: string } | { type: 'share' } | { type: 'bill'; billId: string } | { type: 'pending'; tenancyId: string; period: string; skip: boolean } | null;

export default function RentalsScreen() {
  const rentals = useRentals();
  const { showToast, ToastView } = useToast();
  const toast = useMemo(() => ({ show: showToast, view: ToastView }), [showToast, ToastView]);
  return <ToastContext.Provider value={toast}>
    <RentalsContent key={rentals.userId ?? 'signed-out'} {...rentals} />
    <MenuHost />
    {ToastView}
  </ToastContext.Provider>;
}

/** Owner side of rentals on the phone. Same data, actions and rules as the web RentalsPage; every action is a labelled button. */
function RentalsContent(state: RentalsState) {
  const router = useRouter();
  const icon = useIconColor();
  const toast = useRentalToast();
  const { properties, tenancies, loading, error, online, userId, busy, run, refetch } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View_>('home');
  const [billsStart, setBillsStart] = useState<{ meters?: boolean; amounts?: boolean; cancelled?: string; key: number }>({ key: 0 });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [movingOutId, setMovingOutId] = useState<string | null>(null);
  const [paying, setPaying] = useState<{ tenancyId: string; billId?: string } | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState(false);
  const ordered = [...properties].sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt));
  const property = ordered.find((p) => p.id === selectedId) ?? ordered[0];
  const role = property?.role;
  const isOwner = hasRentalRole(role, 'owner');
  const isManager = hasRentalRole(role, 'manager');
  const tryAct = (action: RentalAction, message: string) => run(action).then(() => { toast(message); setDialog(null); }, (e) => toast(errorMessage(e), 'error'));
  const confirm = (title: string, description: string, confirmText: string, action: RentalAction, done: string) =>
    Alert.alert(title, description, [{ text: 'Cancel', style: 'cancel' }, { text: confirmText, style: 'destructive', onPress: () => void tryAct(action, done) }]);
  const propertyRenters = state.renters.filter((r) => r.propertyId === property?.id);
  const propertyTenancies = tenancies.filter((t) => t.propertyId === property?.id);
  const activeTenancies = propertyTenancies.filter((t) => t.moveOut === null);
  const monthlyRent = activeTenancies.reduce((sum, t) => sum + (t.contracts.find((c) => c.status === 'active')?.monthlyRentCentavos ?? 0), 0);
  const bedCount = property?.units.reduce((sum, u) => sum + u.capacity, 0) ?? 0;
  const unitName = (id: string) => property?.units.find((u) => u.id === id)?.name ?? 'Room';
  const renterName = (id: string) => state.renters.find((r) => r.id === id)?.fullName ?? 'Tenant';
  const propertyBills = state.bills.filter((b) => b.propertyId === property?.id);
  const propertyReadings = state.readings.filter((r) => r.propertyId === property?.id);
  const propertyUtilityBills = state.utilityBills.filter((b) => b.propertyId === property?.id);
  const propertyPayments = state.payments.filter((p) => p.propertyId === property?.id);
  const propertyAccounts = state.accounts.filter((a) => a.propertyId === property?.id);
  const ctx = property && { property, tenancies: propertyTenancies, readings: propertyReadings, bills: propertyBills, utilityBills: propertyUtilityBills };
  const billTodo = ctx ? monthTodo(monthRows(ctx, periodOf(manilaToday())), propertyBills, manilaToday()) : null;
  const billBadge = billTodo && ctx && isManager ? billTodo.waiting.length + billTodo.ready.length + unreplacedCancelled(ctx).length : 0;
  const movingOut = propertyTenancies.find((t) => t.id === movingOutId) ?? null;
  const canCreate = online && !!userId && !busy;
  const contractInfo = property && { property, texts: state.contractTexts, template: state.templates[property.id] ?? DEFAULT_CLAUSES, links: state.links };
  const billInfo = (t: RentalTenancy, bill?: Pick<RentalBill, 'dueOn'> & { id?: string }) => ({ propertyName: property?.name ?? '',
    ownerName: property?.ownerName || property?.lessorName || state.myName || '', ownerAddress: property?.ownerAddress || property?.address || '',
    renterName: renterName(t.renterId), roomName: unitName(t.unitId), lateFeeCentavos: property?.lateFeeCentavos ?? 0, accounts: propertyAccounts,
    previousBalanceCentavos: bill ? previousBalance(t.id, { ...bill, id: bill.id ?? '' } as RentalBill, propertyBills, propertyPayments) : 0,
    paidCentavos: bill?.id ? billPaid(bill.id, propertyPayments) : 0 });
  const receipt = (p: RentalPayment): ReceiptContext => {
    const { propertyName, ownerName, ownerAddress, renterName: rn, roomName } = billInfo(propertyTenancies.find((t) => t.id === p.tenancyId)!);
    return { propertyName, ownerName, ownerAddress, renterName: rn, roomName, bills: propertyBills, payments: propertyPayments };
  };
  const payingTenancy = propertyTenancies.find((t) => t.id === paying?.tenancyId);
  const settling = propertyTenancies.find((t) => t.id === settlingId && t.moveOut);
  const settlement = state.settlements.find((s) => s.tenancyId === settling?.id);
  const settlingTarget = settling ? (() => {
    const { propertyName, ownerName, ownerAddress, renterName: rn, roomName } = billInfo(settling);
    return { tenancyId: settling.id, name: rn, room: roomName, depositCentavos: depositToReturn(settling, propertyBills, propertyPayments, settlement).depositCentavos,
      unpaidCentavos: tenancyOwed(settling.id, propertyBills, propertyPayments), creditCentavos: tenancyCredit(settling.id, propertyPayments),
      ctx: { propertyName, ownerName, ownerAddress, renterName: rn, roomName, moveOut: settling.moveOut! } };
  })() : null;
  const others = (() => {
    const homes = new Map(properties.filter((p) => p.id !== property?.id && p.createdBy === property?.createdBy).map((p) => [p.id, p.name]));
    const latest = (renterId: string) => tenancies.filter((t) => t.renterId === renterId).map((t) => t.moveIn).sort().at(-1) ?? '';
    const key = (r: { fullName: string; phone: string }) => `${r.fullName.trim().toLowerCase()}|${r.phone.replace(/\D/g, '')}`;
    const here = new Set(propertyRenters.map(key));
    const seen = new Set<string>();
    return state.renters.filter((r) => homes.has(r.propertyId)).map((r) => ({ renter: r, propertyName: homes.get(r.propertyId)!, since: latest(r.id) }))
      .sort((a, b) => b.since.localeCompare(a.since)).filter(({ renter }) => !here.has(key(renter)) && !seen.has(key(renter)) && !!seen.add(key(renter)));
  })();
  const openBills = (start: Omit<typeof billsStart, 'key'>) => { setBillsStart((s) => ({ ...start, key: s.key + 1 })); setView('bills'); };
  const switchProperty = () => moreMenu('Switch property', [...ordered.map((p) => {
    const taken = tenancies.filter((t) => t.propertyId === p.id && t.moveOut === null).length;
    return { checked: p.id === property?.id, label: `${p.name} · ${taken} of ${p.units.reduce((sum, u) => sum + u.capacity, 0)} beds${p.archivedAt ? ' · Archived' : ''}`,
      onPress: () => setSelectedId(p.id) };
  }), ...(canCreate ? [{ label: 'New property', onPress: () => setDialog({ type: 'setup' }) }] : [])]);

  const bill = dialog?.type === 'bill' ? propertyBills.find((b) => b.id === dialog.billId) : undefined;
  const billTenancy = propertyTenancies.find((t) => t.id === (bill?.tenancyId ?? (dialog?.type === 'pending' ? dialog.tenancyId : '')));
  const pending = dialog?.type === 'pending' && ctx && billTenancy ? pendingBill(ctx, billTenancy.id, dialog.period, { skipUtilities: dialog.skip }) : null;
  const draft = pending?.state === 'ready' && dialog?.type === 'pending' ? { period: dialog.period, dueOn: pending.dueOn, lines: pending.lines } : null;
  const tenantRenter = dialog?.type === 'tenant' ? propertyRenters.find((r) => r.id === dialog.renterId) : undefined;
  const room = dialog?.type === 'room' ? property?.units.find((u) => u.id === dialog.id) : undefined;
  const addUnit = dialog?.type === 'addTenant' ? property?.units.find((u) => u.id === dialog.unitId) : undefined;

  // Sheets opened from inside another sheet go inside it: iOS shows only one modal per level.
  const inSheet = dialog?.type === 'tenant' || dialog?.type === 'bill' || dialog?.type === 'pending';
  const overlays = property && <>
      <RecordPaymentSheet target={payingTenancy ? paying : null} name={payingTenancy ? renterName(payingTenancy.renterId) : ''}
      nameOf={(id) => renterName(propertyTenancies.find((t) => t.id === id)?.renterId ?? '')} propertyId={property.id} bills={propertyBills} payments={propertyPayments}
      busy={busy} onClose={() => setPaying(null)} onSave={async (input, proofs) => {
        const { failed } = await run({ type: 'recordPayment', tenancyId: paying!.tenancyId, input, proofs }) as { failed: string[] };
        toast('Payment recorded');
        if (failed.length) toast(`Couldn’t attach ${failed.join(', ')}. Add it again from the payment.`, 'warning');
        setPaying(null);
      }} />
    <MoveOutSheet tenancy={movingOut} unit={movingOut ? property.units.find((u) => u.id === movingOut.unitId) : undefined} name={movingOut ? renterName(movingOut.renterId) : ''}
      busy={busy} onClose={() => setMovingOutId(null)} onConfirm={(moveOut, readings) => {
        if (movingOut) void run({ type: 'moveOut', tenancyId: movingOut.id, moveOut, readings }).then((result) => {
          const { warnings, finalBillId } = result as { warnings: string[]; finalBillId: string | null };
          toast(finalBillId ? 'Moved out. Final SOA generated.' : 'Moved out. Settle their deposit next.');
          warnings.forEach((w) => toast(w, 'warning'));
        }, (e) => toast(errorMessage(e), 'error'));
        setMovingOutId(null);
      }} />
    <SettleSheet target={settlingTarget} settlement={settlement} canManage={isManager} busy={busy} run={run} proofUrl={state.settlementProofUrl} onClose={() => setSettlingId(null)} />
  </>;

  return <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['top', 'left', 'right']}>
    {/* Title centred on the screen, back button on the left (same as the other screens). */}
    <View className="min-h-14 flex-row items-center justify-center border-b border-gray-200 px-2 py-2 dark:border-gray-800">
      <Text accessibilityRole="header" className={`text-lg font-bold ${text}`}>Rentals</Text>
      <Pressable style={{ position: 'absolute', left: 8 }} accessibilityRole="button" accessibilityLabel="Back to dashboard" onPress={() => router.replace('/(app)/dashboard')}
        className="min-h-12 flex-row items-center gap-1 rounded-xl px-3 active:bg-gray-200 dark:active:bg-gray-800">
        <Feather name="arrow-left" size={20} color={icon} /><Text className={`font-semibold ${text}`}>Dashboard</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refetch()} />}>
      {!online ? <Empty icon="wifi-off" title="You’re offline">Connect to the internet to manage rentals.</Empty>
        : !userId ? <Empty icon="key" title="Signed out">Sign in to manage rentals.</Empty>
        : loading ? <ActivityIndicator accessibilityLabel="Loading rentals" color="#4f46e5" className="py-12" />
        : error ? <Empty icon="home" title="Could not load rentals" action={<Btn label="Retry" onPress={() => void refetch()} />}>Check your connection, then try again.</Empty>
        : !property ? <Empty icon="home" title="No properties yet" action={<Btn variant="primary" icon="plus" label="New property" disabled={!canCreate} onPress={() => setDialog({ type: 'setup' })} />}>
          Add your property first, then its rooms. It takes about a minute.</Empty>
        : <>
          <View className={`${card} gap-4`}>
            <View className="flex-row items-start gap-3">
              <View className="flex-1 gap-0.5">
                {/* The arrow stays beside the name; a long name wraps instead of pushing the arrow onto its own line. */}
                <View className="flex-row items-center gap-x-1">
                  <Text className={`shrink text-2xl font-bold ${text}`}>{property.name}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Switch property. Now showing ${property.name}`} onPress={switchProperty}
                    className="-my-2 h-11 w-11 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-700">
                    <Feather name="chevron-down" size={22} color="#4f46e5" />
                  </Pressable>
                </View>
                {property.address ? <View className="flex-row items-center gap-1.5">
                  <Feather accessible={false} name="map-pin" size={13} color="#9ca3af" />
                  <Text className={`flex-1 text-sm ${muted}`}>{property.address}</Text></View> : null}
                <View className="flex-row flex-wrap items-center gap-2 pt-1">{role && <RoleBadge role={role} />}{property.archivedAt && <Badge label="Archived" />}</View>
              </View>
              {/* Icon only, by request (a trial against the labelled-buttons rule); screen readers still hear the label. */}
              {isOwner && <Pressable accessibilityRole="button" accessibilityLabel="Property menu: edit, share, archive"
                className="h-12 w-12 items-center justify-center rounded-xl border border-gray-300 bg-white active:opacity-70 dark:border-gray-600 dark:bg-gray-800"
                onPress={() => moreMenu(property.name, [
                { label: 'Edit property', onPress: () => setDialog({ type: 'property' }) },
                { label: 'Share with a friend', onPress: () => setDialog({ type: 'share' }) },
                { label: property.archivedAt ? 'Unarchive property' : 'Archive property', onPress: () => void tryAct({ type: 'archiveProperty', id: property.id,
                  archived: !property.archivedAt }, property.archivedAt ? 'Property restored' : 'Property archived') }])}>
                <Feather name="menu" size={22} color={icon} /></Pressable>}
            </View>
            {/* The two numbers an owner checks first, side by side under a line. */}
            <View className="flex-row border-t border-gray-200 pt-3 dark:border-gray-700">
              <View className="flex-1"><Text className={`text-xs ${muted}`}>Rent per month</Text>
                <Text className={`text-xl font-bold ${text}`}>{formatPesos(monthlyRent)}</Text></View>
              <View className="w-px bg-gray-200 dark:bg-gray-700" />
              <View className="flex-1 pl-4"><Text className={`text-xs ${muted}`}>Beds taken</Text>
                <Text className={`text-xl font-bold ${text}`}>{activeTenancies.length} <Text className={`text-base font-normal ${muted}`}>of {bedCount}</Text></Text></View>
            </View>
          </View>

          <View accessibilityRole="tablist" className="flex-row gap-1 rounded-2xl bg-gray-200 p-1 dark:bg-gray-800">
            {(['home', 'rooms', 'tenants', 'bills'] as const).map((v) => {
              const on = view === v;
              return <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: on }}
                accessibilityLabel={`${v[0].toUpperCase()}${v.slice(1)}${v === 'bills' && billBadge ? `, ${billBadge} to do` : ''}`}
                onPress={() => { setView(v); setBillsStart((s) => ({ key: s.key + 1 })); }}
                className={`min-h-12 flex-1 flex-row items-center justify-center gap-1 rounded-xl ${on ? 'bg-white dark:bg-gray-700' : ''}`}>
                <Text className={`text-base ${on ? 'font-bold text-indigo-700 dark:text-indigo-300' : muted}`}>{v[0].toUpperCase()}{v.slice(1)}</Text>
                {v === 'bills' && billBadge > 0 && <View className="min-w-5 items-center rounded-full bg-red-600 px-1.5"><Text className="text-xs font-bold text-white">{billBadge}</Text></View>}
              </Pressable>;
            })}
          </View>

          {view === 'home' ? <HomeView property={property} tenancies={propertyTenancies} renters={propertyRenters} bills={propertyBills} payments={propertyPayments}
            readings={propertyReadings} utilityBills={propertyUtilityBills} canManage={isManager} canEdit={isOwner} contractTexts={state.contractTexts} links={state.links}
            settlements={state.settlements} onReadMeters={() => openBills({ meters: true })} onOpenBills={() => openBills({})}
            onOpenBill={(billId) => setDialog({ type: 'bill', billId })} onAddTenant={(unitId) => setDialog({ type: 'addTenant', unitId })}
            onAddRoom={() => setDialog({ type: 'room', id: null })} onOpenTenant={(renterId) => setDialog({ type: 'tenant', renterId })}
            onOpenContract={(renterId) => setDialog({ type: 'tenant', renterId })} onReviewCancelled={(period) => openBills({ cancelled: period })}
            onAddBillAmounts={() => openBills({ amounts: true })} onSettleDeposit={setSettlingId}
            onContractNotNeeded={(tenancyId) => void tryAct({ type: 'setContractNotNeeded', tenancyId, value: true }, 'Marked as not needed. Undo from the tenant.')}
            onMarkEarlierPaid={() => void tryAct({ type: 'markEarlierPaid', propertyId: property.id }, 'Earlier SOAs marked paid')} />
          : view === 'rooms' ? <>
            {isOwner && property.units.length > 0 && <Btn icon="plus" label="Add room" onPress={() => setDialog({ type: 'room', id: null })} />}
            {property.units.length === 0 ? <Empty icon="log-in" title="No rooms yet" action={isOwner && <Btn variant="primary" icon="plus" label="Add room" onPress={() => setDialog({ type: 'room', id: null })} />}>
              Add each room you rent out. If you rent the whole house, add one room called “Whole house”.</Empty>
              : <RoomsBoard property={property} tenancies={propertyTenancies} renters={propertyRenters} canManage={isManager} canEdit={isOwner} links={state.links}
                contractTexts={state.contractTexts} onAddTenant={(unitId) => setDialog({ type: 'addTenant', unitId })} onOpenTenant={(renterId) => setDialog({ type: 'tenant', renterId })}
                onMoveOut={setMovingOutId} onEditRoom={(id) => setDialog({ type: 'room', id })}
                onDeleteRoom={(id) => confirm(`Delete ${unitName(id)}?`, 'Rooms that have had tenants can’t be deleted.', 'Delete room', { type: 'removeUnit', id }, 'Room deleted')} />}
          </>
          : view === 'tenants' ? <TenantsList renters={propertyRenters} tenancies={propertyTenancies} unitName={unitName} links={state.links} contractTexts={state.contractTexts}
            onOpen={(renterId) => setDialog({ type: 'tenant', renterId })} />
          : <BillsView key={billsStart.key} property={property} tenancies={propertyTenancies} renters={propertyRenters} canManage={isManager} busy={busy} run={run}
            readings={propertyReadings} bills={propertyBills} payments={propertyPayments} utilityBills={propertyUtilityBills} statementInfo={billInfo}
            startWithMeters={billsStart.meters} startWithAmounts={billsStart.amounts} startOnCancelled={billsStart.cancelled}
            onOpenBill={(billId) => setDialog({ type: 'bill', billId })} onOpenPending={(tenancyId, period, skip) => setDialog({ type: 'pending', tenancyId, period, skip })} />}
        </>}
    </ScrollView>

    {/* Sheets. Ones opened from inside another sheet (record payment, move out, settle) are rendered inside it so they stack. */}
    <Sheet open={dialog?.type === 'setup'} onClose={() => setDialog(null)} title="Set up a property" subtitle="Three quick steps. Contract details can wait." closeLabel="Cancel">
      <SetupWizard myName={state.myName} busy={busy} onCancel={() => setDialog(null)} onFinish={async (action) => {
        const { propertyId, failed } = await run(action) as { propertyId: string; failed: string[] };
        setSelectedId(propertyId); setView('rooms'); setDialog(null);
        if (failed.length) toast(`Saved, but couldn’t add ${failed.join(', ')}. Add it from the Rooms tab.`, 'warning');
        else toast(`${action.input.name} is ready. Press Add tenant on a room.`);
      }} />
    </Sheet>
    {property && <>
      <Sheet open={dialog?.type === 'property'} onClose={() => { setDialog(null); setEditingTemplate(false); }} title="Edit property" subtitle="Owner and signer details are printed on contracts." closeLabel="Cancel">
        <PropertyForm property={property} myName={state.myName} busy={busy} onSave={async (input) => { await run({ type: 'saveProperty', id: property.id, input }); toast('Property saved'); setDialog(null); }}
          extra={isOwner && <View className="gap-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <PaymentAccountsEditor propertyId={property.id} accounts={propertyAccounts} busy={busy} run={run} qrUrl={state.qrUrl} />
            {editingTemplate ? <ContractTemplateEditor propertyId={property.id} template={state.templates[property.id] ?? DEFAULT_CLAUSES} busy={busy} run={run} />
              : <View className="gap-2"><Text className={`text-base font-semibold ${text}`}>Contract template</Text>
                <Text className={`text-xs ${muted}`}>The clauses every new contract starts from.</Text>
                <Btn icon="edit-2" label="Edit contract template" onPress={() => setEditingTemplate(true)} /></View>}
            <LessorSignatureEditor property={property} busy={busy} run={run} />
          </View>} />
      </Sheet>
      <Sheet open={dialog?.type === 'room'} onClose={() => setDialog(null)} title={room ? `Edit ${room.name}` : 'Add room'} subtitle={property.name} closeLabel="Cancel">
        {dialog?.type === 'room' && <UnitForm key={dialog.id ?? 'new'} unit={room} busy={busy}
          onSave={async (input) => { await run({ type: 'saveUnit', propertyId: property.id, id: dialog.id, input }); toast('Room saved'); setDialog(null); }} />}
      </Sheet>
      <Sheet open={dialog?.type === 'share'} onClose={() => setDialog(null)} title={`Share ${property.name}`} subtitle="Only accepted friends can be added.">
        <ShareProperty propertyId={property.id} busy={busy} run={run} listMembers={state.listMembers} listFriends={state.listFriends} />
      </Sheet>
      {addUnit && contractInfo && <MoveInFlow property={property} unit={addUnit} contractInfo={contractInfo}
        renters={propertyRenters.filter((r) => !activeTenancies.some((t) => t.unitId === addUnit.id && t.renterId === r.id))} others={isManager ? others : []}
        state={state} receipt={receipt} onClose={() => setDialog(null)} />}
      {contractInfo && <TenantSheet open={dialog?.type === 'tenant'} onClose={() => setDialog(null)} renter={tenantRenter} tenancies={propertyTenancies} bills={propertyBills}
        payments={propertyPayments} settlements={state.settlements} unitName={unitName} canManage={isManager} busy={busy} run={run} fileUrl={state.fileUrl}
        paymentProofUrl={state.paymentProofUrl} contractInfo={contractInfo} receipt={receipt} onMoveOut={setMovingOutId} onOpenSettlement={setSettlingId}
        onRecordPayment={(tenancyId) => setPaying({ tenancyId })}
        onSaveDetails={async (input) => { await run({ type: 'saveRenter', propertyId: property.id, id: tenantRenter!.id, input }); toast('Tenant saved'); }}
        overlay={dialog?.type === 'tenant' && overlays}
        onDelete={() => tenantRenter && confirm(`Delete ${tenantRenter.fullName}?`, 'Their contact details and ID files are removed permanently. Tenants who have rented here before can’t be deleted.',
          'Delete', { type: 'removeRenter', id: tenantRenter.id }, 'Tenant deleted')} />}
      <BillSheet open={dialog?.type === 'bill' || dialog?.type === 'pending'} onClose={() => setDialog(null)} overlay={(dialog?.type === 'bill' || dialog?.type === 'pending') && overlays} canManage={isManager} busy={busy} qrUrl={state.qrUrl}
        bill={bill ?? draft} info={billTenancy && (bill || draft) ? billInfo(billTenancy, bill ?? draft!) : null} payments={propertyPayments}
        credit={billTenancy && draft ? tenancyCredit(billTenancy.id, propertyPayments, state.settlements) : 0}
        onRecordPayment={bill && billTenancy ? () => setPaying({ tenancyId: billTenancy.id, billId: bill.id }) : undefined}
        onSaveLines={async (lines) => { if (bill) await run({ type: 'updateBillLines', id: bill.id, lines }); }}
        onIssue={draft && billTenancy ? async () => {
          const { issued } = await run({ type: 'issueBills', inputs: [{ tenancyId: billTenancy.id, kind: 'monthly', ...draft }] }) as { issued: number };
          if (issued) { toast('SOA generated'); setDialog(null); } else toast('Couldn’t generate this SOA. Try again.', 'error');
        } : undefined}
        onCancelBill={bill ? () => confirm(`Cancel ${bill.number}?`, [billPaid(bill.id, propertyPayments) > 0 && paidChangeWarning(billPaid(bill.id, propertyPayments)),
          'It stays in the list, marked cancelled, and this month can be billed again.'].filter(Boolean).join(' '), 'Cancel this SOA', { type: 'voidBill', id: bill.id, reason: '' }, 'SOA cancelled') : undefined}>
        {bill && <PaymentsList payments={propertyPayments.filter((p) => p.allocations.some((a) => a.billId === bill.id))} bills={propertyBills} canManage={isManager}
          busy={busy} run={run} proofUrl={state.paymentProofUrl} empty="No payments on this SOA yet." receipt={receipt} />}
      </BillSheet>
      {!inSheet && overlays}
    </>}
  </SafeAreaView>;
}

