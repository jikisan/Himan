import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Archive, ArchiveRestore, ArrowLeft, BedDouble, Building2, DoorClosed, House, KeyRound, MoreHorizontal, Pencil, Plus,
  Share2, Trash2, Users, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatPesos, hasRentalRole, manilaToday, unitOccupancy } from '@himan/shared/rentals';
import type { RentalTenancy, RentalUnit } from '@himan/shared/rentals';
import { useRentals } from '../hooks/useRentals';
import type { RentalAction } from '../hooks/useRentals';
import { PropertyForm } from '../components/PropertyForm';
import { UnitForm } from '../components/UnitForm';
import { RenterForm } from '../components/RenterForm';
import { RenterFiles } from '../components/RenterFiles';
import { StartTenancyForm } from '../components/StartTenancyForm';
import { ShareDialog } from '../components/ShareDialog';
import { Initials, RoleBadge } from '../components/Badges';
import { inputClass } from '../components/Field';
import { cn } from '@core/presentation/utils';
import { errorMessage } from '../utils/errorMessage';

export type RentalsState = ReturnType<typeof useRentals>;
type DialogState = { type: 'property'; id: string | null } | { type: 'unit'; id: string | null }
  | { type: 'renter'; id: string | null } | { type: 'tenancy' } | { type: 'share' } | null;
type Confirm = { title: string; description: string; confirmText: string; action: RentalAction; done: string } | null;

const KIND_ICON = { whole: House, room: DoorClosed, bedspace: BedDouble } as const;
const KIND_LABEL = { whole: 'Whole house', room: 'Room', bedspace: 'Bedspace' } as const;
const day = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');

export function RentalsPage() {
  const rentals = useRentals();
  return <RentalsContent key={rentals.userId ?? 'signed-out'} {...rentals} />;
}

function RentalsContent(state: RentalsState) {
  const { properties, tenancies, loading, error, online, userId, busy, run, refetch, fileUrl } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
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
  const unitName = (id: string) => property?.units.find((u) => u.id === id)?.name ?? 'Unit';
  const renterName = (id: string) => state.renters.find((r) => r.id === id)?.fullName ?? 'Renter';
  const label = (t: RentalTenancy) => `${renterName(t.renterId)} · ${unitName(t.unitId)}`;
  const editingUnit = dialog?.type === 'unit' ? property?.units.find((u) => u.id === dialog.id) : undefined;
  const beds = property?.units.reduce((sum, u) => sum + u.capacity, 0) ?? 0;
  const rentRoll = activeTenancies.reduce((sum, t) => sum + (t.contracts[0]?.monthlyRentCentavos ?? 0), 0);
  const canCreate = online && !!userId && !busy;
  const newProperty = (primary: boolean) => <Button variant={primary ? 'default' : 'outline'} onClick={() => setDialog({ type: 'property', id: null })} disabled={!canCreate}>
    <Plus className="h-4 w-4" />New property</Button>;

  return <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Building2 className="h-8 w-8 text-primary" />Rentals</h1>
        <p className="mt-2 text-muted-foreground">Your properties, renters and tenancies.</p>
      </div>
      {property && newProperty(false)}
    </header>

    {!online ? <Empty icon={WifiOff} title="You’re offline">Connect to the internet to manage rentals.</Empty>
      : !userId ? <Empty icon={KeyRound} title="Signed out">Sign in to manage rentals.</Empty>
      : loading ? <div role="status" aria-label="Loading rentals" className="space-y-4">
          <div className="h-28 animate-pulse rounded-xl bg-muted/40" /><div className="h-10 w-72 animate-pulse rounded-lg bg-muted/40" />
          <div className="h-48 animate-pulse rounded-xl bg-muted/40" /></div>
      : error ? <div role="alert"><Empty icon={Building2} title="Could not load rentals" action={
          <Button variant="outline" onClick={() => void refetch()}>Retry</Button>}>Check your connection, then try again.</Empty></div>
      : !property ? <Empty icon={House} title="No properties yet" action={newProperty(true)}>
          Add your house first, then its rooms or bedspaces.</Empty>
      : <>
        <section aria-label="Property" className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                {ordered.length > 1 ? <>
                  <label className="sr-only" htmlFor="rentals-property">Property</label>
                  <select id="rentals-property" className={cn(inputClass, 'w-auto max-w-full font-semibold sm:text-base')} value={property.id}
                    onChange={(e) => setSelectedId(e.target.value)}>
                    {ordered.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archivedAt ? ' (archived)' : ''}</option>)}
                  </select>
                </> : <h2 className="text-xl font-semibold">{property.name}</h2>}
                {role && <RoleBadge role={role} />}
                {property.archivedAt && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>}
              </div>
              {property.address && <p className="text-sm text-muted-foreground">{property.address}</p>}
            </div>
            {isOwner && <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialog({ type: 'property', id: property.id })}><Pencil className="h-4 w-4" />Edit</Button>
              <Button variant="outline" onClick={() => setDialog({ type: 'share' })}><Share2 className="h-4 w-4" />Share</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="More property actions"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onSelect={() => void tryAct({ type: 'archiveProperty', id: property.id, archived: !property.archivedAt },
                    property.archivedAt ? 'Property restored' : 'Property archived')}>
                    {property.archivedAt ? <><ArchiveRestore className="h-4 w-4" />Unarchive</> : <><Archive className="h-4 w-4" />Archive</>}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>}
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-4">
            <Stat label="Units" value={property.units.length} />
            <Stat label="Occupied" value={`${activeTenancies.length} of ${beds}`} />
            <Stat label="Renters" value={propertyRenters.length} />
            <Stat label="Monthly rent" value={formatPesos(rentRoll)} />
          </dl>
        </section>

        <Tabs defaultValue="units">
          <TabsList>
            <Tab value="units" count={property.units.length}>Units</Tab>
            <Tab value="renters" count={propertyRenters.length}>Renters</Tab>
            <Tab value="tenancies" count={activeTenancies.length}>Tenancies</Tab>
          </TabsList>

          <TabsContent value="units" className="mt-5 space-y-4">
            <TabBar hint="A whole house is one unit; each room or bedspace is its own unit.">
              {isOwner && <Button onClick={() => setDialog({ type: 'unit', id: null })}><Plus className="h-4 w-4" />Add unit</Button>}</TabBar>
            {property.units.length === 0 ? <Empty icon={DoorClosed} title="No units yet">Add the rooms, bedspaces or whole house you rent out.</Empty>
              : <ul className="divide-y rounded-xl border bg-card">{property.units.map((unit) => <UnitRow key={unit.id} unit={unit} canEdit={isOwner}
                occupancy={unitOccupancy(unit, tenancies)} onEdit={() => setDialog({ type: 'unit', id: unit.id })}
                onRemove={() => setConfirm({ title: `Delete ${unit.name}?`, confirmText: 'Delete unit', action: { type: 'removeUnit', id: unit.id },
                  done: 'Unit deleted', description: 'Units with tenancy history can’t be deleted.' })} />)}</ul>}
          </TabsContent>

          <TabsContent value="renters" className="mt-5 space-y-4">
            <TabBar hint="Contact details are shared with everyone on this property.">
              {isManager && <Button onClick={() => setDialog({ type: 'renter', id: null })}><Plus className="h-4 w-4" />Add renter</Button>}</TabBar>
            {propertyRenters.length === 0 ? <Empty icon={Users} title="No renters yet">Add a renter before starting their tenancy.</Empty>
              : <ul className="divide-y rounded-xl border bg-card">{propertyRenters.map((r) => {
                const living = activeTenancies.filter((t) => t.renterId === r.id).map((t) => unitName(t.unitId));
                return <li key={r.id}><button type="button" aria-label={`Open ${r.fullName}`}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors first:rounded-t-xl hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  onClick={() => setDialog({ type: 'renter', id: r.id })}>
                  <Initials name={r.fullName} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{r.fullName}</span>
                    <span className="block truncate text-sm text-muted-foreground">{[r.phone, r.facebook].filter(Boolean).join(' · ') || 'No contact saved'}</span></span>
                  <span className={`shrink-0 text-sm ${living.length ? '' : 'text-muted-foreground'}`}>{living.length ? living.join(', ') : 'Not renting'}</span>
                </button></li>;
              })}</ul>}
          </TabsContent>

          <TabsContent value="tenancies" className="mt-5 space-y-4">
            <TabBar hint="Advance pays the first month. Deposit is held until move-out.">
              {isManager && <Button onClick={() => setDialog({ type: 'tenancy' })}><Plus className="h-4 w-4" />Start tenancy</Button>}</TabBar>
            {propertyTenancies.length === 0 && <Empty icon={KeyRound} title="No tenancies yet">Start one when a renter moves in.</Empty>}
            {(['Active', 'Ended'] as const).map((group) => {
              const rows = propertyTenancies.filter((t) => (group === 'Active') === (t.moveOut === null));
              return rows.length > 0 && <section key={group} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group} · {rows.length}</h2>
                <ul className={`divide-y rounded-xl border bg-card ${group === 'Ended' ? 'text-muted-foreground' : ''}`}>
                  {rows.map((t) => { const c = t.contracts[0]; return <li key={t.id} className="flex flex-wrap items-center gap-3 p-4">
                    <Initials name={renterName(t.renterId)} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${group === 'Active' ? 'text-foreground' : ''}`}>{label(t)}</p>
                      <p className="text-sm text-muted-foreground tabular-nums">{c ? `${formatPesos(c.monthlyRentCentavos)}/mo · due day ${c.dueDay}` : 'No contract'}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{c && `${day(c.startDate)} – ${day(c.endDate)}`}
                        {t.moveOut && ` · moved out ${day(t.moveOut)}`}</p>
                    </div>
                    {!t.moveOut && isManager && <Button variant="outline" size="sm" onClick={() => setConfirm({
                      title: `End ${label(t)}?`, confirmText: 'End tenancy', done: 'Tenancy ended',
                      action: { type: 'endTenancy', id: t.id, moveOut: manilaToday() },
                      description: `Move-out is recorded as ${day(manilaToday())} and the contract ends. This can’t be undone here.` })}>End today</Button>}
                  </li>; })}
                </ul>
              </section>;
            })}
          </TabsContent>
        </Tabs>
      </>}

    <ConfirmDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)} confirmText={confirm?.confirmText ?? ''}
      title={confirm?.title ?? ''} description={confirm?.description ?? ''}
      onConfirm={() => { if (confirm) void tryAct(confirm.action, confirm.done); setConfirm(null); }} />

    <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
      <DialogContent className={cn('max-h-[90dvh] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--muted-foreground)_transparent]', dialog?.type !== 'share' && dialog?.type !== 'unit' && 'sm:max-w-xl',
        // Forms end in a sticky FormActions bar that replaces the bottom padding.
        (dialog?.type === 'property' || dialog?.type === 'unit' || dialog?.type === 'tenancy' || (dialog?.type === 'renter' && isManager)) && 'pb-0')}>
        {dialog?.type === 'property' && <>
          <DialogHeader><DialogTitle>{dialog.id ? 'Edit property' : 'New property'}</DialogTitle>
            <DialogDescription>Owner and lessor details are printed on contracts.</DialogDescription></DialogHeader>
          <PropertyForm property={dialog.id ? property : undefined} myName={state.myName ?? ''} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (input) => { await act({ type: 'saveProperty', id: dialog.id, input }, 'Property saved'); }} />
        </>}
        {dialog?.type === 'unit' && property && <>
          <DialogHeader><DialogTitle>{dialog.id ? `Edit ${editingUnit?.name ?? 'unit'}` : 'Add unit'}</DialogTitle>
            <DialogDescription>{property.name}</DialogDescription></DialogHeader>
          <UnitForm unit={editingUnit} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (input) => { await act({ type: 'saveUnit', propertyId: property.id, id: dialog.id, input }, 'Unit saved'); }} />
        </>}
        {dialog?.type === 'renter' && property && (() => {
          const renter = propertyRenters.find((r) => r.id === dialog.id);
          return <>
            <DialogHeader><DialogTitle>{renter ? renter.fullName : 'Add renter'}</DialogTitle>
              <DialogDescription>Visible to everyone you share {property.name} with.</DialogDescription></DialogHeader>
            {renter && isManager && <RenterFiles renter={renter} busy={busy} run={run} fileUrl={fileUrl} />}
            <RenterForm renter={renter} readOnly={!isManager} busy={busy} onCancel={() => setDialog(null)}
              onSave={async (input) => { await act({ type: 'saveRenter', propertyId: property.id, id: dialog.id, input }, 'Renter saved'); }}
              deleteAction={renter && <Button type="button" variant="ghost" className="px-2 text-destructive hover:text-destructive" onClick={() => setConfirm({
                title: `Delete ${renter.fullName}?`, confirmText: 'Delete', done: 'Renter deleted', action: { type: 'removeRenter', id: renter.id },
                description: 'Their contact details and ID files are removed permanently. Renters with tenancy history can’t be deleted.' })}>
                <Trash2 className="h-4 w-4" />Delete renter</Button>} />
          </>;
        })()}
        {dialog?.type === 'tenancy' && property && <>
          <DialogHeader><DialogTitle>Start tenancy</DialogTitle>
            <DialogDescription>Advance pays the first month. Deposit is held until move-out.</DialogDescription></DialogHeader>
          <StartTenancyForm units={property.units} renters={propertyRenters} tenancies={tenancies} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (input) => { await act({ type: 'startTenancy', input }, 'Tenancy started'); }} />
        </>}
        {dialog?.type === 'share' && property && <>
          <DialogHeader><DialogTitle>Share {property.name}</DialogTitle>
            <DialogDescription>Only accepted friends can be added.</DialogDescription></DialogHeader>
          <ShareDialog propertyId={property.id} busy={busy} run={run} listMembers={state.listMembers} listFriends={state.listFriends} />
        </>}
      </DialogContent>
    </Dialog>
  </div>;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-lg font-semibold tabular-nums">{value}</dd></div>;
}

function Tab({ value, count, children }: { value: string; count: number; children: string }) {
  return <TabsTrigger value={value} className="gap-2">{children}
    <span aria-hidden className="rounded-full bg-background/70 px-1.5 text-xs tabular-nums text-muted-foreground">{count}</span></TabsTrigger>;
}

function TabBar({ hint, children }: { hint: string; children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <p className="text-sm text-muted-foreground">{hint}</p>{children}</div>;
}

function Empty({ icon: Icon, title, action, children }: { icon: typeof House; title: string; action?: ReactNode; children: ReactNode }) {
  return <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
    <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
    <p className="mt-3 font-medium">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}

function UnitRow({ unit, occupancy, canEdit, onEdit, onRemove }: {
  unit: RentalUnit; occupancy: { occupied: number; capacity: number }; canEdit: boolean; onEdit: () => void; onRemove: () => void;
}) {
  const Icon = KIND_ICON[unit.kind];
  const utility = (name: string, mode: string, amount: number, per: string) =>
    mode === 'none' ? null : `${name} ${formatPesos(amount)}/${mode === 'fixed' ? 'mo' : per}`;
  const bills = [utility('Electric', unit.electricMode, unit.electricAmountCentavos, 'kWh'),
    utility('Water', unit.waterMode, unit.waterAmountCentavos, 'm³')].filter(Boolean);
  const full = occupancy.occupied >= occupancy.capacity;
  return <li className="flex items-center gap-3 p-4">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium">{unit.name}</p>
      <p className="truncate text-sm text-muted-foreground">{[KIND_LABEL[unit.kind], ...bills].join(' · ')}</p>
      <p aria-hidden className={`text-sm tabular-nums sm:hidden ${full ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
        {occupancy.occupied} / {occupancy.capacity} occupied{full && ' · Full'}</p>
    </div>
    <div className="hidden shrink-0 text-right sm:block">
      <p className={`text-sm tabular-nums ${full ? 'font-medium text-primary' : 'text-muted-foreground'}`}>{occupancy.occupied} / {occupancy.capacity} occupied</p>
      {full && <p className="text-xs font-medium text-primary">Full</p>}
      {occupancy.capacity > 1 && occupancy.capacity <= 12 && <div aria-hidden className="mt-1 flex justify-end gap-1">
        {Array.from({ length: occupancy.capacity }, (_, i) =>
          <span key={i} className={`size-1.5 rounded-full ${i < occupancy.occupied ? 'bg-primary' : 'bg-muted-foreground/25'}`} />)}
      </div>}
    </div>
    {canEdit && <div className="flex shrink-0 gap-1">
      <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Edit ${unit.name}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Delete ${unit.name}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
    </div>}
  </li>;
}
