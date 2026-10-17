import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArchiveRestore, ArrowLeft, Building2, DoorClosed, House, KeyRound, MoreHorizontal, Pencil, Plus,
  Share2, Trash2, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { formatPesos, hasRentalRole, manilaToday, nextDueDate, pendingBill } from '@himan/shared/rentals';
import type { RentalTenancy } from '@himan/shared/rentals';
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
import { BillSheet } from '../components/BillSheet';
import { cn } from '@core/presentation/utils';
import { errorMessage } from '../utils/errorMessage';

export type RentalsState = ReturnType<typeof useRentals>;
type DialogState = { type: 'setup' } | { type: 'property'; id: string } | { type: 'room'; id: string | null }
  | { type: 'addTenant'; unitId: string } | { type: 'tenant'; renterId: string } | { type: 'share' }
  | { type: 'bill'; billId: string } | { type: 'pending'; tenancyId: string; period: string; skip: boolean } | null;
type Confirm = { title: string; description: string; confirmText: string; action: RentalAction; done: string } | null;

export function RentalsPage() {
  const rentals = useRentals();
  return <RentalsContent key={rentals.userId ?? 'signed-out'} {...rentals} />;
}

function RentalsContent(state: RentalsState) {
  const { properties, tenancies, loading, error, online, userId, busy, run, refetch, fileUrl } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'rooms' | 'tenants' | 'bills'>('rooms');
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [movingOutId, setMovingOutId] = useState<string | null>(null);
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
  const beds = property?.units.reduce((sum, u) => sum + u.capacity, 0) ?? 0;
  const rentRoll = activeTenancies.reduce((sum, t) => sum + (t.contracts.find((c) => c.status === 'active')?.monthlyRentCentavos ?? 0), 0);
  const tenantCount = new Set(activeTenancies.map((t) => t.renterId)).size;
  const freeRooms = (property?.units ?? []).filter((u) => activeTenancies.filter((t) => t.unitId === u.id).length < u.capacity).map((u) => u.name);
  const today = manilaToday();
  const dueSoon = activeTenancies.flatMap((tenancy) => {
    const contract = tenancy.contracts.find((c) => c.status === 'active');
    if (!contract) return [];
    const date = nextDueDate(contract.dueDay, today);
    const inDays = differenceInCalendarDays(parseISO(date), parseISO(today));
    return inDays <= 7 ? [{ tenancy, rent: contract.monthlyRentCentavos, date, inDays }] : [];
  }).sort((a, b) => a.inDays - b.inDays);
  const movingOut = propertyTenancies.find((t) => t.id === movingOutId) ?? null;
  const canCreate = online && !!userId && !busy;
  const newProperty = (primary: boolean) => <Button variant={primary ? 'default' : 'outline'} className="h-11 sm:h-9" onClick={() => setDialog({ type: 'setup' })} disabled={!canCreate}>
    <Plus className="h-4 w-4" />New property</Button>;
  const inSheet = dialog?.type === 'tenant' || dialog?.type === 'bill' || dialog?.type === 'pending';
  const billInfo = (t: RentalTenancy) => ({ propertyName: property?.name ?? '', ownerName: property?.ownerName || property?.lessorName || state.myName || '',
    ownerAddress: property?.ownerAddress || property?.address || '', renterName: renterName(t.renterId), roomName: unitName(t.unitId),
    lateFeeCentavos: property?.lateFeeCentavos ?? 0 });
  const hasFooter = dialog && dialog.type !== 'share' && !inSheet;

  return <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft size={16} />Dashboard</Link>
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside aria-label="Properties" className="min-w-0 lg:w-60 lg:shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Rentals</h1>
        {online && userId && !loading && !error && property && <>
          <p className="mt-4 mb-1 hidden px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground lg:block">Properties</p>
          <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mt-0 lg:flex-col lg:gap-1 lg:overflow-visible">
            {ordered.map((p) => {
              const taken = tenancies.filter((t) => t.propertyId === p.id && t.moveOut === null).length;
              const total = p.units.reduce((sum, u) => sum + u.capacity, 0);
              return <li key={p.id} className="shrink-0 lg:shrink">
                <button type="button" aria-pressed={p.id === property.id} onClick={() => setSelectedId(p.id)}
                  className={cn('flex w-44 flex-col gap-2 rounded-lg border border-transparent p-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full',
                    'aria-pressed:border-primary/50 aria-pressed:bg-muted aria-pressed:shadow-sm', p.archivedAt && 'opacity-60')}>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{p.name}{p.archivedAt && <span className="sr-only"> (archived)</span>}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{taken}/{total}</span>
                  </span>
                  <Meter value={taken} max={total} />
                </button>
              </li>;
            })}
          </ul>
          <div className="mt-2">{newProperty(false)}</div>
        </>}
      </aside>

      <main className="min-w-0 flex-1 space-y-5">
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
                <h2 className="text-2xl font-bold tracking-tight">{property.name}</h2>
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
          <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <Stat label="Monthly rent" value={formatPesos(rentRoll)} className="col-span-2 sm:col-span-1">
              {tenantCount} {tenantCount === 1 ? 'tenant' : 'tenants'}</Stat>
            <Stat label="Beds taken" value={<>{activeTenancies.length} <span className="text-xs font-medium text-muted-foreground sm:text-base">of {beds}</span></>}>
              <Meter value={activeTenancies.length} max={beds} /></Stat>
            <Stat label="Free beds" value={beds - activeTenancies.length}>{beds === 0 ? 'Add a room first' : freeRooms.join(' · ') || 'Every bed is taken'}</Stat>
          </dl>
        </section>

        {dueSoon.length > 0 && <section aria-labelledby="rentals-due" className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="rentals-due" className="font-semibold">Rent due in the next 7 days</h3>
            <span className="text-xs text-muted-foreground">From each tenant’s due day</span>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dueSoon.map(({ tenancy, rent, date, inDays }) => <li key={tenancy.id}>
              <button type="button" onClick={() => setDialog({ type: 'tenant', renterId: tenancy.renterId })}
                className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span aria-hidden className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <span className="text-[10px] font-bold uppercase leading-none">{format(parseISO(date), 'MMM')}</span>
                  <span className="text-base font-bold leading-tight">{format(parseISO(date), 'd')}</span></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-medium">{renterName(tenancy.renterId)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{unitName(tenancy.unitId)} · {inDays === 0 ? 'today' : inDays === 1 ? 'tomorrow' : `in ${inDays} days`}</span></span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatPesos(rent)}</span>
              </button>
            </li>)}
          </ul>
        </section>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="group" aria-label="View" className="flex w-full rounded-lg bg-muted p-1 sm:inline-flex sm:w-auto [&>button]:flex-1 sm:[&>button]:flex-none">
            {(['rooms', 'tenants', 'bills'] as const).map((v) => <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className="min-h-11 rounded-md px-4 sm:min-h-9 text-sm font-medium text-muted-foreground transition-colors aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {v === 'rooms' ? 'Rooms' : v === 'tenants' ? 'Tenants' : 'Bills'}</button>)}
          </div>
          {view === 'rooms' && isOwner && property.units.length > 0 && <Button variant="outline" className="h-11 sm:h-9" onClick={() => setDialog({ type: 'room', id: null })}>
            <Plus className="h-4 w-4" />Add room</Button>}
        </div>

        {view === 'rooms' ? property.units.length === 0
          ? <Empty icon={DoorClosed} title="No rooms yet" action={isOwner && <Button onClick={() => setDialog({ type: 'room', id: null })}>
              <Plus className="h-4 w-4" />Add room</Button>}>Add each room you rent out. If you rent the whole house, add one room called “Whole house”.</Empty>
          : <RoomsBoard property={property} tenancies={propertyTenancies} renters={propertyRenters} canManage={isManager} canEdit={isOwner}
              onAddTenant={(unitId) => setDialog({ type: 'addTenant', unitId })}
              onOpenTenant={(renterId) => setDialog({ type: 'tenant', renterId })}
              onMoveOut={setMovingOutId}
              onEditRoom={(id) => setDialog({ type: 'room', id })}
              onDeleteRoom={(id) => setConfirm({ title: `Delete ${unitName(id)}?`, confirmText: 'Delete room', done: 'Room deleted',
                action: { type: 'removeUnit', id }, description: 'Rooms that have had tenants can’t be deleted.' })} />
          : view === 'tenants' ? <TenantsList renters={propertyRenters} tenancies={propertyTenancies} unitName={unitName}
              onOpen={(renterId) => setDialog({ type: 'tenant', renterId })} />
          : <BillsView property={property} tenancies={propertyTenancies} renters={propertyRenters} canManage={isManager} busy={busy} run={run}
              readings={state.readings.filter((r) => r.propertyId === property.id)} bills={state.bills.filter((b) => b.propertyId === property.id)}
              onOpenBill={(billId) => setDialog({ type: 'bill', billId })}
              onOpenPending={(tenancyId, period, skip) => setDialog({ type: 'pending', tenancyId, period, skip })} />}
      </>}
      </main>
    </div>

    <ConfirmDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)} confirmText={confirm?.confirmText ?? ''}
      title={confirm?.title ?? ''} description={confirm?.description ?? ''}
      onConfirm={() => { if (confirm) void tryAct(confirm.action, confirm.done); setConfirm(null); }} />

    <MoveOutDialog tenancy={movingOut} unit={movingOut ? property?.units.find((u) => u.id === movingOut.unitId) : undefined}
      name={movingOut ? renterName(movingOut.renterId) : ''} busy={busy} onClose={() => setMovingOutId(null)}
      onConfirm={(moveOut, readings) => {
        if (movingOut) void run({ type: 'moveOut', tenancyId: movingOut.id, moveOut, readings }).then((result) => {
          const { warnings, finalBillId } = result as { warnings: string[]; finalBillId: string | null };
          toast.success(finalBillId ? 'Moved out. Final bill issued.' : 'Moved out');
          warnings.forEach((w) => toast.warning(w));
          setDialog(null);
        }, (e) => toast.error(errorMessage(e)));
        setMovingOutId(null);
      }} />

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
            <AddTenantForm unit={room} rentDueDay={property.rentDueDay} renters={propertyRenters.filter((r) => !here.has(r.id))} busy={busy} onCancel={() => setDialog(null)}
              onSave={async (action) => {
                const { warnings } = await run(action) as { warnings: string[] };
                toast.success(`${action.renter?.fullName ?? renterName(action.renterId ?? '')} moved in`);
                warnings.forEach((w) => toast.warning(w));
                setDialog(null);
              }} />
          </>;
        })()}
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
            bills={state.bills.filter((b) => b.propertyId === property.id)} unitName={unitName} canManage={isManager} busy={busy} run={run}
            fileUrl={fileUrl} onMoveOut={setMovingOutId}
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
          const info = billInfo(tenancy);
          if (bill) return <BillSheet bill={bill} info={info} canManage={isManager} busy={busy}
            onSaveLines={async (lines) => { await run({ type: 'updateBillLines', id: bill.id, lines }); }}
            onCancelBill={() => setConfirm({ title: `Cancel ${bill.number}?`, confirmText: 'Cancel this bill', done: 'Bill cancelled',
              action: { type: 'voidBill', id: bill.id, reason: '' },
              description: 'It stays in the list, marked cancelled, and this month can be billed again.' })} />;
          if (dialog.type !== 'pending') return null;
          const pending = pendingBill({ property, tenancies: propertyTenancies, bills,
            readings: state.readings.filter((r) => r.propertyId === property.id) }, tenancy.id, dialog.period, { skipUtilities: dialog.skip });
          if (pending.state !== 'ready') return null;
          const draft = { period: dialog.period, dueOn: pending.dueOn, lines: pending.lines };
          return <BillSheet bill={draft} info={info} canManage={isManager} busy={busy} onSaveLines={async () => undefined}
            onIssue={async () => {
              const { issued } = await run({ type: 'issueBills', inputs: [{ tenancyId: tenancy.id, kind: 'monthly', ...draft }] }) as { issued: number };
              if (issued) { toast.success('Bill issued'); setDialog(null); } else toast.error('Couldn’t issue this bill. Try again.');
            }} />;
        })()}
      </SheetContent>
    </Sheet>
  </div>;
}

function Stat({ label, value, className, children }: { label: string; value: ReactNode; className?: string; children: ReactNode }) {
  return <div className={cn('min-w-0 rounded-lg bg-muted/30 px-3 py-2.5 sm:px-4 sm:py-3', className)}>
    <dt className="truncate text-xs text-muted-foreground sm:text-sm">{label}</dt>
    <dd className="mt-0.5 truncate text-lg font-bold tabular-nums sm:text-2xl">{value}</dd>
    <dd className="mt-1.5 truncate text-xs text-muted-foreground sm:text-sm">{children}</dd>
  </div>;
}

function Meter({ value, max }: { value: number; max: number }) {
  return <span aria-hidden className="block h-1.5 overflow-hidden rounded-full bg-muted">
    <span className="block h-full rounded-full bg-primary" style={{ width: `${max ? Math.min(value / max, 1) * 100 : 0}%` }} /></span>;
}

function Empty({ icon: Icon, title, action, children }: { icon: typeof House; title: string; action?: ReactNode; children: ReactNode }) {
  return <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
    <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
    <p className="mt-3 font-medium">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}
