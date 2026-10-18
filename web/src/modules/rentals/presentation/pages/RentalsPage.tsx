import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, ArrowLeft, Building2, Check, ChevronDown, DoorClosed, House, KeyRound, MoreHorizontal, Pencil, Plus,
  Share2, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DEFAULT_CLAUSES, billPaid, formatPesos, hasRentalRole, manilaToday, pendingBill, periodOf, previousBalance, tenancyCredit } from '@himan/shared/rentals';
import type { ReceiptContext, RentalBill, RentalPayment, RentalTenancy } from '@himan/shared/rentals';
import { useRentals } from '../hooks/useRentals';
import type { RentalAction } from '../hooks/useRentals';
import { PropertyForm } from '../components/PropertyForm';
import { UnitForm } from '../components/UnitForm';
import { ShareDialog } from '../components/ShareDialog';
import { RoleBadge } from '../components/Badges';
import { RoomsBoard } from '../components/RoomsBoard';
import { TenantsList } from '../components/TenantsList';
import { AddTenantForm } from '../components/AddTenantForm';
import { TenantSheet } from '../components/TenantSheet';
import { MoveOutDialog } from '../components/MoveOutDialog';
import { SetupWizard } from '../components/SetupWizard';
import { BillsView } from '../components/BillsView';
import { HomeView } from '../components/HomeView';
import { monthRows, monthTodo, paidChangeWarning, unreplacedCancelled } from '../utils/billingMonth';
import { BillSheet } from '../components/BillSheet';
import { RecordPaymentDialog } from '../components/RecordPaymentDialog';
import { PaymentsList } from '../components/PaymentsList';
import { PaymentAccountsEditor } from '../components/PaymentAccountsEditor';
import { ContractTemplateEditor, LessorSignatureEditor } from '../components/ContractTemplateEditor';
import { LinkReady } from '../components/TenantLink';
import { cn } from '@core/presentation/utils';
import { errorMessage } from '../utils/errorMessage';

export type RentalsState = ReturnType<typeof useRentals>;
type DialogState = { type: 'setup' } | { type: 'property'; id: string } | { type: 'room'; id: string | null }
  | { type: 'addTenant'; unitId: string } | { type: 'tenant'; renterId: string } | { type: 'share' }
  | { type: 'bill'; billId: string } | { type: 'pending'; tenancyId: string; period: string; skip: boolean }
  | { type: 'linkReady'; tenancyId: string; name: string } | null;
type Confirm = { title: string; description: string; confirmText: string; action: RentalAction; done: string } | null;

export function RentalsPage() {
  const rentals = useRentals();
  return <RentalsContent key={rentals.userId ?? 'signed-out'} {...rentals} />;
}

function RentalsContent(state: RentalsState) {
  const { properties, tenancies, loading, error, online, userId, busy, run, refetch, fileUrl, paymentProofUrl } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'rooms' | 'tenants' | 'bills'>('home');
  const [metersFromHome, setMetersFromHome] = useState(false);
  const [cancelledPeriod, setCancelledPeriod] = useState<string | null>(null);
  const [amountsFromHome, setAmountsFromHome] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [movingOutId, setMovingOutId] = useState<string | null>(null);
  const [paying, setPaying] = useState<{ tenancyId: string; billId?: string } | null>(null);
  const ordered = [...properties].sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt));
  const property = ordered.find((p) => p.id === selectedId) ?? ordered[0];
  const role = property?.role;
  const isOwner = hasRentalRole(role, 'owner');
  const isManager = hasRentalRole(role, 'manager');
  const act = async (action: RentalAction, message: string) => { await run(action); toast.success(message); setDialog(null); };
  const tryAct = (action: RentalAction, message: string) => act(action, message).catch((e) => toast.error(errorMessage(e)));
  const propertyRenters = state.renters.filter((r) => r.propertyId === property?.id);
  const propertyTenancies = tenancies.filter((t) => t.propertyId === property?.id);
  const activeTenancies = propertyTenancies.filter((t) => t.moveOut === null);
  const unitName = (id: string) => property?.units.find((u) => u.id === id)?.name ?? 'Room';
  const renterName = (id: string) => state.renters.find((r) => r.id === id)?.fullName ?? 'Tenant';
  const propertyBills = state.bills.filter((b) => b.propertyId === property?.id);
  const propertyReadings = state.readings.filter((r) => r.propertyId === property?.id);
  const propertyUtilityBills = state.utilityBills.filter((b) => b.propertyId === property?.id);
  const propertyPayments = state.payments.filter((p) => p.propertyId === property?.id);
  const propertyAccounts = state.accounts.filter((a) => a.propertyId === property?.id);
  const billTodo = property ? monthTodo(monthRows({ property, tenancies: propertyTenancies, readings: propertyReadings, bills: propertyBills, utilityBills: propertyUtilityBills }, periodOf(manilaToday())),
    propertyBills, manilaToday()) : null;
  const billBadge = billTodo && isManager ? billTodo.waiting.length + billTodo.ready.length
    + unreplacedCancelled({ property: property!, tenancies: propertyTenancies, readings: propertyReadings, bills: propertyBills, utilityBills: propertyUtilityBills }).length : 0;
  const movingOut = propertyTenancies.find((t) => t.id === movingOutId) ?? null;
  const canCreate = online && !!userId && !busy;
  const newProperty = (primary: boolean) => <Button variant={primary ? 'default' : 'outline'} className="h-11 sm:h-9" onClick={() => setDialog({ type: 'setup' })} disabled={!canCreate}>
    <Plus className="h-4 w-4" />New property</Button>;
  const inSheet = dialog?.type === 'tenant' || dialog?.type === 'bill' || dialog?.type === 'pending';
  // With a bill: what is still owed on earlier bills and what was paid on this one, for the SOA and its Messenger copy.
  const billInfo = (t: RentalTenancy, bill?: Pick<RentalBill, 'dueOn'> & { id?: string }) => ({ propertyName: property?.name ?? '',
    ownerName: property?.ownerName || property?.lessorName || state.myName || '',
    ownerAddress: property?.ownerAddress || property?.address || '', renterName: renterName(t.renterId), roomName: unitName(t.unitId),
    lateFeeCentavos: property?.lateFeeCentavos ?? 0, accounts: propertyAccounts,
    previousBalanceCentavos: bill ? previousBalance(t.id, { ...bill, id: bill.id ?? '' } as RentalBill, propertyBills, propertyPayments) : 0,
    paidCentavos: bill?.id ? billPaid(bill.id, propertyPayments) : 0 });
  // Everything a payment's receipt needs; the whole property's bills and payments, so "left on these bills" is right.
  const receipt = (p: RentalPayment): ReceiptContext => {
    const { propertyName, ownerName, ownerAddress, renterName, roomName } = billInfo(propertyTenancies.find((t) => t.id === p.tenancyId)!);
    return { propertyName, ownerName, ownerAddress, renterName, roomName, bills: propertyBills, payments: propertyPayments };
  };
  const payingTenancy = propertyTenancies.find((t) => t.id === paying?.tenancyId);
  const hasFooter = dialog && dialog.type !== 'share' && dialog.type !== 'linkReady' && !inSheet;
  // People from the owner's other properties, once each (by name and mobile), most recently moved in first.
  const others = (() => {
    const homes = new Map(properties.filter((p) => p.id !== property?.id && p.createdBy === property?.createdBy).map((p) => [p.id, p.name]));
    const latest = (renterId: string) => tenancies.filter((t) => t.renterId === renterId).map((t) => t.moveIn).sort().at(-1) ?? '';
    const key = (r: { fullName: string; phone: string }) => `${r.fullName.trim().toLowerCase()}|${r.phone.replace(/\D/g, '')}`;
    const here = new Set(propertyRenters.map(key));
    const seen = new Set<string>();
    return state.renters.filter((r) => homes.has(r.propertyId)).map((r) => ({ renter: r, propertyName: homes.get(r.propertyId)!, since: latest(r.id) }))
      .sort((a, b) => b.since.localeCompare(a.since))
      .filter(({ renter }) => !here.has(key(renter)) && !seen.has(key(renter)) && !!seen.add(key(renter)));
  })();

  return <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft size={16} />Dashboard</Link>
    <h1 className="mb-4 text-2xl font-bold tracking-tight">Rentals</h1>
      <main className="space-y-5">
    {!online ? <Empty icon={WifiOff} title="You’re offline">Connect to the internet to manage rentals.</Empty>
      : !userId ? <Empty icon={KeyRound} title="Signed out">Sign in to manage rentals.</Empty>
      : loading ? <div role="status" aria-label="Loading rentals" className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-muted/40" /><div className="grid gap-4 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-xl bg-muted/40" /><div className="h-44 animate-pulse rounded-xl bg-muted/40" /></div></div>
      : error ? <div role="alert"><Empty icon={Building2} title="Could not load rentals" action={
          <Button variant="outline" onClick={() => void refetch()}>Retry</Button>}>Check your connection, then try again.</Empty></div>
      : !property ? <Empty icon={House} title="No properties yet" action={newProperty(true)}>
          Add your property first, then its rooms. It takes about a minute.</Empty>
      : <>
        <section aria-label="Property" className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 text-2xl font-bold tracking-tight">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="inline-flex max-w-full items-center gap-2 rounded-md text-left hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="truncate">{property.name}</span>
                        <ChevronDown aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="sr-only"> (switch property)</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      {ordered.map((p) => {
                        const taken = tenancies.filter((t) => t.propertyId === p.id && t.moveOut === null).length;
                        const total = p.units.reduce((sum, u) => sum + u.capacity, 0);
                        return <DropdownMenuItem key={p.id} className="gap-3 py-2" onSelect={() => setSelectedId(p.id)}>
                          <Check aria-hidden className={cn('h-4 w-4 shrink-0', p.id !== property.id && 'invisible')} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{p.name}</span>
                            <span className="block text-xs text-muted-foreground">{taken} of {total} beds taken{p.archivedAt && ' · Archived'}</span>
                          </span>
                        </DropdownMenuItem>;
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-3 py-2" disabled={!canCreate} onSelect={() => setDialog({ type: 'setup' })}>
                        <Plus aria-hidden className="h-4 w-4" />New property</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </h2>
                {role && <RoleBadge role={role} />}
                {property.archivedAt && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>}
              </div>
              {property.address && <p className="text-sm text-muted-foreground">{property.address}</p>}
            </div>
            {isOwner && <div className="flex gap-2">
              <Button variant="outline" className="h-11 sm:h-9" onClick={() => setDialog({ type: 'property', id: property.id })}><Pencil className="h-4 w-4" />Edit</Button>
              <Button variant="outline" className="h-11 sm:h-9" onClick={() => setDialog({ type: 'share' })}><Share2 className="h-4 w-4" />Share</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label="More property actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onSelect={() => void tryAct({ type: 'archiveProperty', id: property.id, archived: !property.archivedAt },
                    property.archivedAt ? 'Property restored' : 'Property archived')}>
                    {property.archivedAt ? <><ArchiveRestore className="h-4 w-4" />Unarchive</> : <><Archive className="h-4 w-4" />Archive</>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>}
          </div>
        </section>


        <div className="space-y-3">
          <div role="group" aria-label="View" className="flex w-full gap-1 border-b sm:gap-6">
            {(['home', 'rooms', 'tenants', 'bills'] as const).map((v) => <button key={v} type="button" aria-pressed={view === v}
              onClick={() => { setView(v); setMetersFromHome(false); setCancelledPeriod(null); setAmountsFromHome(false); }}
              className="-mb-px inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent px-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:font-semibold aria-pressed:text-primary sm:flex-none sm:text-base">
              {v === 'home' ? 'Home' : v === 'rooms' ? 'Rooms' : v === 'tenants' ? 'Tenants' : 'Bills'}
              {v === 'bills' && billBadge > 0 && <span aria-hidden className="inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold leading-5 text-white">{billBadge}</span>}
            </button>)}
          </div>
          {view === 'rooms' && isOwner && property.units.length > 0 && <Button variant="outline" className="h-11 sm:h-9" onClick={() => setDialog({ type: 'room', id: null })}>
            <Plus className="h-4 w-4" />Add room</Button>}
        </div>

        {view === 'home' ? <HomeView property={property} tenancies={propertyTenancies} renters={propertyRenters} bills={propertyBills} payments={propertyPayments}
              readings={propertyReadings} canManage={isManager} canEdit={isOwner} contractTexts={state.contractTexts} links={state.links}
              onReadMeters={() => { setView('bills'); setMetersFromHome(true); }} onOpenBills={() => setView('bills')}
              onOpenBill={(billId) => setDialog({ type: 'bill', billId })} onAddTenant={(unitId) => setDialog({ type: 'addTenant', unitId })}
              onAddRoom={() => setDialog({ type: 'room', id: null })} onOpenTenant={(renterId) => setDialog({ type: 'tenant', renterId })}
              onReviewCancelled={(period) => { setCancelledPeriod(period); setView('bills'); }}
              onAddBillAmounts={() => { setAmountsFromHome(true); setView('bills'); }} utilityBills={propertyUtilityBills}
              onMarkEarlierPaid={() => void tryAct({ type: 'markEarlierPaid', propertyId: property.id }, 'Earlier SOAs marked paid')} />
          : view === 'rooms' ? property.units.length === 0
          ? <Empty icon={DoorClosed} title="No rooms yet" action={isOwner && <Button onClick={() => setDialog({ type: 'room', id: null })}>
              <Plus className="h-4 w-4" />Add room</Button>}>Add each room you rent out. If you rent the whole house, add one room called “Whole house”.</Empty>
          : <RoomsBoard property={property} tenancies={propertyTenancies} renters={propertyRenters} canManage={isManager} canEdit={isOwner} links={state.links}
              onAddTenant={(unitId) => setDialog({ type: 'addTenant', unitId })}
              onOpenTenant={(renterId) => setDialog({ type: 'tenant', renterId })}
              onMoveOut={setMovingOutId}
              onEditRoom={(id) => setDialog({ type: 'room', id })}
              onDeleteRoom={(id) => setConfirm({ title: `Delete ${unitName(id)}?`, confirmText: 'Delete room', done: 'Room deleted',
                action: { type: 'removeUnit', id }, description: 'Rooms that have had tenants can’t be deleted.' })} />
          : view === 'tenants' ? <TenantsList renters={propertyRenters} tenancies={propertyTenancies} unitName={unitName} links={state.links}
              onOpen={(renterId) => setDialog({ type: 'tenant', renterId })} />
          : <BillsView property={property} tenancies={propertyTenancies} renters={propertyRenters} canManage={isManager} busy={busy} run={run}
              readings={propertyReadings} bills={propertyBills} payments={propertyPayments} utilityBills={propertyUtilityBills} startWithAmounts={amountsFromHome} statementInfo={billInfo} startWithMeters={metersFromHome} startOnCancelled={cancelledPeriod ?? undefined}
              onOpenBill={(billId) => setDialog({ type: 'bill', billId })}
              onOpenPending={(tenancyId, period, skip) => setDialog({ type: 'pending', tenancyId, period, skip })} />}
      </>}
      </main>

    <ConfirmDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)} confirmText={confirm?.confirmText ?? ''}
      title={confirm?.title ?? ''} description={confirm?.description ?? ''}
      onConfirm={() => { if (confirm) void tryAct(confirm.action, confirm.done); setConfirm(null); }} />

    <MoveOutDialog tenancy={movingOut} unit={movingOut ? property?.units.find((u) => u.id === movingOut.unitId) : undefined}
      name={movingOut ? renterName(movingOut.renterId) : ''} busy={busy} onClose={() => setMovingOutId(null)}
      onConfirm={(moveOut, readings) => {
        if (movingOut) void run({ type: 'moveOut', tenancyId: movingOut.id, moveOut, readings }).then((result) => {
          const { warnings, finalBillId } = result as { warnings: string[]; finalBillId: string | null };
          toast.success(finalBillId ? 'Moved out. Final SOA generated.' : 'Moved out');
          warnings.forEach((w) => toast.warning(w));
          setDialog(null);
        }, (e) => toast.error(errorMessage(e)));
        setMovingOutId(null);
      }} />

    {property && <RecordPaymentDialog target={payingTenancy ? paying : null} name={payingTenancy ? renterName(payingTenancy.renterId) : ''}
      nameOf={(id) => renterName(propertyTenancies.find((t) => t.id === id)?.renterId ?? '')} propertyId={property.id}
      bills={propertyBills} payments={propertyPayments} busy={busy} onClose={() => setPaying(null)}
      onSave={async (input, proofs) => {
        const { failed } = await run({ type: 'recordPayment', tenancyId: paying!.tenancyId, input, proofs }) as { failed: string[] };
        toast.success('Payment recorded');
        if (failed.length) toast.warning(`Couldn’t attach ${failed.join(', ')}. Add it again from the payment.`);
        setPaying(null);
      }} />}

    <Dialog open={!!dialog && !inSheet} onOpenChange={(open) => !open && setDialog(null)}>
      <DialogContent className={cn('max-h-[90dvh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--muted-foreground)_transparent]',
        dialog?.type !== 'share' && dialog?.type !== 'room' && 'sm:max-w-xl',
        // Forms end in a sticky FormActions bar that replaces the bottom padding.
        hasFooter && 'pb-0')}>
        {dialog?.type === 'setup' && <>
          <DialogHeader><DialogTitle>Set up a property</DialogTitle>
            <DialogDescription>Three quick steps. Contract details can wait.</DialogDescription></DialogHeader>
          <SetupWizard myName={state.myName ?? ''} busy={busy} onCancel={() => setDialog(null)} onFinish={async (action) => {
            const { propertyId, failed } = await run(action) as { propertyId: string; failed: string[] };
            setSelectedId(propertyId);
            setView('rooms');
            setDialog(null);
            if (failed.length) toast.warning(`Saved, but couldn’t add ${failed.join(', ')}. Add it from the Rooms board.`);
            else toast.success(`${action.input.name} is ready. Tap an empty room to add a tenant.`);
          }} />
        </>}
        {dialog?.type === 'property' && property && <>
          <DialogHeader><DialogTitle>Edit property</DialogTitle>
            <DialogDescription>Owner and signer details are printed on contracts.</DialogDescription></DialogHeader>
          <PropertyForm property={property} myName={state.myName ?? ''} busy={busy} onCancel={() => setDialog(null)}
            accounts={isOwner && <PaymentAccountsEditor propertyId={property.id} accounts={propertyAccounts} busy={busy} run={run} qrUrl={state.qrUrl} />}
            contract={isOwner && <>
              <ContractTemplateEditor propertyId={property.id} template={state.templates[property.id] ?? DEFAULT_CLAUSES} busy={busy} run={run} />
              <LessorSignatureEditor property={property} busy={busy} run={run} />
            </>}
            onSave={async (input) => { await act({ type: 'saveProperty', id: dialog.id, input }, 'Property saved'); }} />
        </>}
        {dialog?.type === 'room' && property && (() => {
          const room = property.units.find((u) => u.id === dialog.id);
          return <>
            <DialogHeader><DialogTitle>{room ? `Edit ${room.name}` : 'Add room'}</DialogTitle>
              <DialogDescription>{property.name}</DialogDescription></DialogHeader>
            <UnitForm unit={room} busy={busy} onCancel={() => setDialog(null)}
              onSave={async (input) => { await act({ type: 'saveUnit', propertyId: property.id, id: dialog.id, input }, 'Room saved'); }} />
          </>;
        })()}
        {dialog?.type === 'addTenant' && property && (() => {
          const room = property.units.find((u) => u.id === dialog.unitId);
          const here = new Set(activeTenancies.filter((t) => t.unitId === dialog.unitId).map((t) => t.renterId));
          return room && <>
            <DialogHeader><DialogTitle>Add tenant to {room.name}</DialogTitle>
              <DialogDescription>{room.kind === 'bedspace' ? `Shared room · ${room.capacity - here.size} of ${room.capacity} beds free`
                : room.kind === 'whole' ? 'Whole house' : 'Private room'}
                {room.defaultRentCentavos > 0 && ` · ${formatPesos(room.defaultRentCentavos)}`}
                {room.extraPersonRentCentavos > 0 && room.defaultRentCentavos > 0 && ` + ${formatPesos(room.extraPersonRentCentavos)} per extra person`}
              </DialogDescription></DialogHeader>
            <AddTenantForm unit={room} rentDueDay={property.rentDueDay} renters={propertyRenters.filter((r) => !here.has(r.id))} others={isManager ? others : []}
              busy={busy} onCancel={() => setDialog(null)}
              onSave={async (action, sendLink) => {
                const { tenancyId, warnings } = await run(action) as { tenancyId: string; warnings: string[] };
                const name = action.renter?.fullName ?? renterName(action.renterId ?? '');
                toast.success(`${name} moved in`);
                warnings.forEach((w) => toast.warning(w));
                setDialog(sendLink ? { type: 'linkReady', tenancyId, name } : null);
              }} />
          </>;
        })()}
        {dialog?.type === 'linkReady' && <>
          <DialogHeader><DialogTitle>Send {dialog.name} their link</DialogTitle>
            <DialogDescription>Paste it in Messenger or any chat app.</DialogDescription></DialogHeader>
          <LinkReady name={dialog.name} tenancyId={dialog.tenancyId} busy={busy} run={run} onDone={() => setDialog(null)} />
        </>}
        {dialog?.type === 'share' && property && <>
          <DialogHeader><DialogTitle>Share {property.name}</DialogTitle>
            <DialogDescription>Only accepted friends can be added.</DialogDescription></DialogHeader>
          <ShareDialog propertyId={property.id} busy={busy} run={run} listMembers={state.listMembers} listFriends={state.listFriends} />
        </>}
      </DialogContent>
    </Dialog>

    <Sheet open={inSheet} onOpenChange={(open) => !open && setDialog(null)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[480px]">
        {dialog?.type === 'tenant' && property && (() => {
          const renter = propertyRenters.find((r) => r.id === dialog.renterId);
          return renter && <TenantSheet renter={renter} tenancies={propertyTenancies}
            bills={propertyBills} payments={propertyPayments} unitName={unitName} canManage={isManager} busy={busy} run={run}
            fileUrl={fileUrl} paymentProofUrl={paymentProofUrl} receipt={receipt}
            contractInfo={{ property, texts: state.contractTexts, template: state.templates[property.id] ?? DEFAULT_CLAUSES, links: state.links }} onMoveOut={setMovingOutId} onRecordPayment={(tenancyId) => setPaying({ tenancyId })}
            onSaveDetails={async (input) => { await run({ type: 'saveRenter', propertyId: property.id, id: renter.id, input }); toast.success('Tenant saved'); }}
            deleteAction={<Button type="button" variant="ghost" className="px-2 text-destructive hover:text-destructive" onClick={() => setConfirm({
              title: `Delete ${renter.fullName}?`, confirmText: 'Delete', done: 'Tenant deleted', action: { type: 'removeRenter', id: renter.id },
              description: 'Their contact details and ID files are removed permanently. Tenants who have rented here before can’t be deleted.' })}>
              <Trash2 className="h-4 w-4" />Delete tenant</Button>} />;
        })()}
        {(dialog?.type === 'bill' || dialog?.type === 'pending') && property && (() => {
          const bills = state.bills.filter((b) => b.propertyId === property.id);
          const bill = dialog.type === 'bill' ? bills.find((b) => b.id === dialog.billId) : undefined;
          const tenancy = propertyTenancies.find((t) => t.id === (bill?.tenancyId ?? (dialog.type === 'pending' ? dialog.tenancyId : '')));
          if (!tenancy) return null;
          if (bill) return <BillSheet bill={bill} info={billInfo(tenancy, bill)} canManage={isManager} busy={busy} payments={propertyPayments} qrUrl={state.qrUrl}
            onRecordPayment={() => setPaying({ tenancyId: tenancy.id, billId: bill.id })}
            onSaveLines={async (lines) => { await run({ type: 'updateBillLines', id: bill.id, lines }); }}
            onCancelBill={() => setConfirm({ title: `Cancel ${bill.number}?`, confirmText: 'Cancel this SOA', done: 'SOA cancelled',
              action: { type: 'voidBill', id: bill.id, reason: '' },
              description: [billPaid(bill.id, propertyPayments) > 0 && paidChangeWarning(billPaid(bill.id, propertyPayments)),
                'It stays in the list, marked cancelled, and this month can be billed again.'].filter(Boolean).join(' ') })}>
            <PaymentsList payments={propertyPayments.filter((p) => p.allocations.some((a) => a.billId === bill.id))} bills={bills}
              canManage={isManager} busy={busy} run={run} proofUrl={paymentProofUrl} empty="No payments on this SOA yet." receipt={receipt} />
          </BillSheet>;
          if (dialog.type !== 'pending') return null;
          const pending = pendingBill({ property, tenancies: propertyTenancies, bills, utilityBills: propertyUtilityBills,
            readings: state.readings.filter((r) => r.propertyId === property.id) }, tenancy.id, dialog.period, { skipUtilities: dialog.skip });
          if (pending.state !== 'ready') return null;
          const draft = { period: dialog.period, dueOn: pending.dueOn, lines: pending.lines };
          return <BillSheet bill={draft} info={billInfo(tenancy, draft)} canManage={isManager} busy={busy}
            credit={tenancyCredit(tenancy.id, propertyPayments)} onSaveLines={async () => undefined}
            onIssue={async () => {
              const { issued } = await run({ type: 'issueBills', inputs: [{ tenancyId: tenancy.id, kind: 'monthly', ...draft }] }) as { issued: number };
              if (issued) { toast.success('SOA generated'); setDialog(null); } else toast.error('Couldn’t generate this SOA. Try again.');
            }} />;
        })()}
      </SheetContent>
    </Sheet>
  </div>;
}



function Empty({ icon: Icon, title, action, children }: { icon: typeof House; title: string; action?: ReactNode; children: ReactNode }) {
  return <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
    <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
    <p className="mt-3 font-medium">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}
