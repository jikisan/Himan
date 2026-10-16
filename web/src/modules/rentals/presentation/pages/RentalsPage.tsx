import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, Pencil, Plus, Share2, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { inputClass } from '../components/Field';
import { errorMessage } from '../utils/errorMessage';

export type RentalsState = ReturnType<typeof useRentals>;
type DialogState = { type: 'property'; id: string | null } | { type: 'unit'; id: string | null }
  | { type: 'renter'; id: string | null } | { type: 'tenancy' } | { type: 'share' } | null;

export function RentalsPage() {
  const rentals = useRentals();
  return <RentalsContent key={rentals.userId ?? 'signed-out'} {...rentals} />;
}

function RentalsContent(state: RentalsState) {
  const { properties, tenancies, loading, error, online, userId, busy, run, refetch, fileUrl } = state;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [ending, setEnding] = useState<RentalTenancy | null>(null);
  const [deletingRenter, setDeletingRenter] = useState<{ id: string; name: string } | null>(null);
  const ordered = [...properties].sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt));
  const property = ordered.find((p) => p.id === selectedId) ?? ordered[0];
  const role = property?.role;
  const act = async (action: RentalAction, message: string) => { await run(action); toast.success(message); setDialog(null); };
  const tryAct = (action: RentalAction, message: string) => act(action, message).catch((e) => toast.error(errorMessage(e)));
  const propertyRenters = state.renters.filter((r) => r.propertyId === property?.id);
const propertyTenancies = tenancies.filter((t) => t.propertyId === property?.id);
const label = (t: RentalTenancy) => `${state.renters.find((r) => r.id === t.renterId)?.fullName ?? 'Renter'} · ${property?.units.find((u) => u.id === t.unitId)?.name ?? 'Unit'}`;
  const editingUnit = dialog?.type === 'unit' ? property?.units.find((u) => u.id === dialog.id) : undefined;

  return <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16} />Dashboard</Link>
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-3xl font-semibold tracking-tight"><Building2 className="h-8 w-8 text-primary" />Rentals</h1>
        <p className="mt-2 text-muted-foreground">Your properties, renters and tenancies.</p></div>
      <Button onClick={() => setDialog({ type: 'property', id: null })} disabled={!online || !userId || busy}><Plus className="h-4 w-4" />New property</Button>
    </header>

    {!online ? <div role="status" className="rounded-xl border p-6 text-center">Connect to the internet to manage rentals.</div>
      : !userId ? <p>Sign in to manage rentals.</p>
      : loading ? <p role="status">Loading…</p>
      : error ? <div role="alert" className="rounded-xl border p-6 text-center"><p>Could not load rentals.</p>
          <Button variant="outline" onClick={() => void refetch()}>Retry</Button></div>
      : !property ? <div className="rounded-xl border p-10 text-center"><p className="font-medium">No properties yet</p>
          <p className="mt-2 text-muted-foreground">Add your house first, then its rooms or bedspaces.</p></div>
      : <>
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor="rentals-property">Property</label>
          <select id="rentals-property" className={`${inputClass} max-w-xs`} value={property.id} onChange={(e) => setSelectedId(e.target.value)}>
            {ordered.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archivedAt ? ' (archived)' : ''}</option>)}
          </select>
          <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">{role}</span>
          {hasRentalRole(role, 'owner') && <>
            <Button variant="outline" onClick={() => setDialog({ type: 'property', id: property.id })}><Pencil className="h-4 w-4" />Edit</Button>
            <Button variant="outline" onClick={() => void tryAct({ type: 'archiveProperty', id: property.id, archived: !property.archivedAt },
              property.archivedAt ? 'Property restored' : 'Property archived')}>{property.archivedAt ? 'Unarchive' : 'Archive'}</Button>
            <Button variant="outline" onClick={() => setDialog({ type: 'share' })}><Share2 className="h-4 w-4" />Share</Button>
          </>}
        </div>

        <Tabs defaultValue="units">
          <TabsList><TabsTrigger value="units">Units</TabsTrigger><TabsTrigger value="renters">Renters</TabsTrigger><TabsTrigger value="tenancies">Tenancies</TabsTrigger></TabsList>
          <TabsContent value="units" className="mt-4 space-y-3">
            {hasRentalRole(role, 'owner') && <Button onClick={() => setDialog({ type: 'unit', id: null })}><Plus className="h-4 w-4" />Add unit</Button>}
            {property.units.length === 0 && <p className="text-muted-foreground">No units yet. A whole house is one unit; rooms and bedspaces are one unit each.</p>}
            {property.units.map((unit) => <UnitRow key={unit.id} unit={unit} canEdit={hasRentalRole(role, 'owner')}
              occupancy={unitOccupancy(unit, tenancies)} onEdit={() => setDialog({ type: 'unit', id: unit.id })}
              onRemove={() => void tryAct({ type: 'removeUnit', id: unit.id }, 'Unit deleted')} />)}
          </TabsContent>
<TabsContent value="renters" className="mt-4 space-y-3">
  {hasRentalRole(role, 'manager') && <Button onClick={() => setDialog({ type: 'renter', id: null })}><Plus className="h-4 w-4" />Add renter</Button>}
  {propertyRenters.length === 0 && <p className="text-muted-foreground">No renters yet.</p>}
  {propertyRenters.map((r) => <button key={r.id} type="button" aria-label={`Open ${r.fullName}`}
    className="flex w-full items-center gap-3 rounded-xl border p-4 text-left hover:bg-muted/50"
    onClick={() => setDialog({ type: 'renter', id: r.id })}>
    <UserRound className="h-5 w-5 text-muted-foreground" />
    <span><span className="block font-medium">{r.fullName}</span>
      <span className="text-sm text-muted-foreground">{[r.phone, r.facebook].filter(Boolean).join(' · ') || 'No contact saved'}</span></span>
  </button>)}
</TabsContent>
<TabsContent value="tenancies" className="mt-4 space-y-3">
  {hasRentalRole(role, 'manager') && <Button onClick={() => setDialog({ type: 'tenancy' })}><Plus className="h-4 w-4" />Start tenancy</Button>}
  {(['Active', 'Ended'] as const).map((group) => {
    const rows = propertyTenancies.filter((t) => (group === 'Active') === (t.moveOut === null));
    return rows.length > 0 && <section key={group} className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">{group}</h2>
      {rows.map((t) => { const c = t.contracts[0]; return <div key={t.id} className="flex items-center justify-between rounded-xl border p-4">
        <div><p className="font-medium">{label(t)}</p>
          <p className="text-sm text-muted-foreground">{c ? `${formatPesos(c.monthlyRentCentavos)}/mo · due day ${c.dueDay} · ${c.startDate} → ${c.endDate}` : 'No contract'}
            {t.moveOut && ` · moved out ${t.moveOut}`}</p></div>
        {!t.moveOut && hasRentalRole(role, 'manager') && <Button variant="outline"
          onClick={() => setEnding(t)}>End today</Button>}
      </div>; })}
    </section>;
  })}
  {propertyTenancies.length === 0 && <p className="text-muted-foreground">No tenancies yet.</p>}
</TabsContent>
        </Tabs>
      </>}

    <ConfirmDialog open={!!ending} onOpenChange={(open) => !open && setEnding(null)} confirmText="End tenancy"
      title={ending ? `End ${label(ending)}?` : ''}
      description={`Move-out is recorded as ${manilaToday()} and the contract ends. This can’t be undone here.`}
      onConfirm={() => { if (ending) void tryAct({ type: 'endTenancy', id: ending.id, moveOut: manilaToday() }, 'Tenancy ended'); setEnding(null); }} />

    <ConfirmDialog open={!!deletingRenter} onOpenChange={(open) => !open && setDeletingRenter(null)} confirmText="Delete"
      title={deletingRenter ? `Delete ${deletingRenter.name}?` : ''}
      description="Their contact details and ID files are removed permanently. Renters with tenancy history can’t be deleted."
      onConfirm={() => { if (deletingRenter) void tryAct({ type: 'removeRenter', id: deletingRenter.id }, 'Renter deleted'); setDeletingRenter(null); }} />

    <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        {dialog?.type === 'property' && <>
          <DialogHeader><DialogTitle>{dialog.id ? 'Edit property' : 'New property'}</DialogTitle>
            <DialogDescription>Lessor details appear on contracts.</DialogDescription></DialogHeader>
          <PropertyForm property={dialog.id ? property : undefined} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (input) => { await act({ type: 'saveProperty', id: dialog.id, input }, 'Property saved'); }} />
        </>}
        {dialog?.type === 'unit' && property && <>
          <DialogHeader><DialogTitle>{dialog.id ? 'Edit unit' : 'Add unit'}</DialogTitle>
            <DialogDescription>Rates are what you charge, not Meralco’s.</DialogDescription></DialogHeader>
          <UnitForm unit={editingUnit} busy={busy} onCancel={() => setDialog(null)}
            onSave={async (input) => { await act({ type: 'saveUnit', propertyId: property.id, id: dialog.id, input }, 'Unit saved'); }} />
        </>}
        {dialog?.type === 'renter' && property && (() => {
  const renter = propertyRenters.find((r) => r.id === dialog.id);
  const canManage = hasRentalRole(role, 'manager');
  return <>
    <DialogHeader><DialogTitle>{renter ? renter.fullName : 'Add renter'}</DialogTitle>
      <DialogDescription>Contact details are visible to everyone you share this property with.</DialogDescription></DialogHeader>
    <RenterForm renter={renter} readOnly={!canManage} busy={busy} onCancel={() => setDialog(null)}
      onSave={async (input) => { await act({ type: 'saveRenter', propertyId: property.id, id: dialog.id, input }, 'Renter saved'); }} />
    {renter && canManage && <RenterFiles renter={renter} busy={busy} run={run} fileUrl={fileUrl} />}
    {renter && canManage && <Button variant="ghost" className="text-destructive"
      onClick={() => setDeletingRenter({ id: renter.id, name: renter.fullName })}><Trash2 className="h-4 w-4" />Delete renter</Button>}
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

function UnitRow({ unit, occupancy, canEdit, onEdit, onRemove }: {
  unit: RentalUnit; occupancy: { occupied: number; capacity: number }; canEdit: boolean; onEdit: () => void; onRemove: () => void;
}) {
  const utility = (mode: string, amount: number, per: string) =>
    mode === 'none' ? null : mode === 'fixed' ? `${formatPesos(amount)}/mo` : `${formatPesos(amount)}/${per}`;
  const bills = [utility(unit.electricMode, unit.electricAmountCentavos, 'kWh'), utility(unit.waterMode, unit.waterAmountCentavos, 'm³')].filter(Boolean);
  return <div className="flex items-center justify-between rounded-xl border p-4">
    <div><p className="font-medium">{unit.name}</p>
      <p className="text-sm text-muted-foreground">{occupancy.occupied} / {occupancy.capacity} occupied{bills.length ? ` · ${bills.join(' · ')}` : ''}</p></div>
    {canEdit && <div className="flex gap-2">
      <Button variant="ghost" size="icon" aria-label={`Edit ${unit.name}`} onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${unit.name}`} onClick={onRemove}><Trash2 className="h-4 w-4" /></Button>
    </div>}
  </div>;
}
