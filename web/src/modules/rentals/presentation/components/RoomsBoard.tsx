import { DoorClosed, LogOut, MoreHorizontal, Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { contractStage, formatPesos, roomSpots } from '@himan/shared/rentals';
import type { ContractText, RentalProperty, RentalTenancy, RentalUnit, Renter, TenancyLink } from '@himan/shared/rentals';
import { detailsStatus } from '../utils/contract';
import { ContractBadge, Initials } from './Badges';
import { cn } from '@core/presentation/utils';

const ordinal = (n: number) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${tail}`;
};
const roomType = (unit: RentalUnit) =>
  (unit.kind === 'whole' ? 'Whole house' : unit.kind === 'room' ? 'Private room' : `Shared room · ${unit.capacity} beds`)
  + (unit.extraPersonRentCentavos && unit.defaultRentCentavos ? ` · +${formatPesos(unit.extraPersonRentCentavos)} per extra person` : '');
const rentLine = (t: RentalTenancy) => {
  const c = t.contracts.find((x) => x.status === 'active') ?? t.contracts[0];
  return c ? `${formatPesos(c.monthlyRentCentavos)}/mo · due every ${ordinal(c.dueDay)}` : 'No contract';
};

/** A tile per room: who lives there, a bar per bed (filled when taken), and an Add tenant slot per free bed; then the Add room tile. */
export function RoomsBoard({ property, tenancies, renters, canManage, canEdit, onAddTenant, onOpenTenant, onMoveOut,
  onEditRoom, onDeleteRoom, onAddRoom, links = [], contractTexts = [] }: {
  property: RentalProperty; tenancies: RentalTenancy[]; renters: Renter[]; canManage: boolean; canEdit: boolean;
  onAddTenant(unitId: string): void; onOpenTenant(renterId: string): void; onMoveOut(tenancyId: string): void;
  onEditRoom(unitId: string): void; onDeleteRoom(unitId: string): void; onAddRoom?(): void; links?: TenancyLink[]; contractTexts?: ContractText[];
}) {
  const name = (renterId: string) => renters.find((r) => r.id === renterId)?.fullName ?? 'Tenant';
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {property.units.map((unit) => {
        const headingId = `room-${unit.id}`;
        const spots = roomSpots(unit, tenancies);
        const free = spots.filter((t) => !t).length;
        return <section key={unit.id} aria-labelledby={headingId} className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <header className="flex items-center gap-2">
            <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sky-700 text-white"><DoorClosed className="h-6 w-6" /></span>
            <span className="flex-1" />
            <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', free
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400')}>
              {free ? `${free} free` : 'Full'}</span>
            {canEdit && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-11 px-2.5 sm:h-9" aria-label={`${unit.name} options`}><MoreHorizontal className="h-4 w-4" />More</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onSelect={() => onEditRoom(unit.id)}><Pencil className="h-4 w-4" />Edit room</DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={() => onDeleteRoom(unit.id)}>
                  <Trash2 className="h-4 w-4" />Delete room</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
          </header>
          <div className="min-w-0">
            <h3 id={headingId} className="truncate text-lg font-semibold">{unit.name}</h3>
            <p className="text-sm text-muted-foreground">{roomType(unit)}</p>
          </div>
          <span aria-hidden className="flex flex-wrap gap-1.5">{spots.map((t, i) => <span key={t?.id ?? `bed-${i}`}
            className={cn('h-2 w-6 rounded-full', t ? 'bg-sky-500' : 'border-[1.5px] border-muted-foreground/50')} />)}</span>
          <ul className="space-y-2">
            {spots.map((t, i) => <li key={t?.id ?? `free-${i}`}>
              {t ? <div className="space-y-2 rounded-xl bg-muted/40 p-3">
                <span className="flex min-w-0 items-center gap-3">
                  <Initials name={name(t.renterId)} />
                  <span className="min-w-0"><span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate font-medium">{name(t.renterId)}</span>
                    <ContractBadge stage={contractStage(t, contractTexts)} /></span>
                    <span className="block truncate text-sm tabular-nums text-muted-foreground">{rentLine(t)}</span>
                    {detailsStatus(links, t.id) && <span className="block truncate text-xs font-medium text-amber-700 dark:text-amber-300">{detailsStatus(links, t.id)}</span>}</span>
                </span>
                <span className="flex gap-2">
                  <Button variant="outline" className="h-11 flex-1 sm:h-9" aria-label={`View ${name(t.renterId)}`}
                    onClick={() => onOpenTenant(t.renterId)}><UserRound className="h-4 w-4" />View tenant</Button>
                  {canManage && <Button variant="outline" className="hidden h-9 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive sm:inline-flex" aria-label={`Move out ${name(t.renterId)}`}
                    onClick={() => onMoveOut(t.id)}><LogOut className="h-4 w-4" />Move out</Button>}
                </span>
              </div>
              : canManage ? <button type="button" onClick={() => onAddTenant(unit.id)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Plus className="h-4 w-4" />Add tenant
                  {unit.defaultRentCentavos > 0 && <span aria-hidden className="font-normal">· {formatPesos(unit.defaultRentCentavos)}/mo</span>}</button>
              : <p className="rounded-xl border border-dashed p-3 text-center text-sm text-muted-foreground">Empty</p>}
            </li>)}
          </ul>
        </section>;
      })}
      {canEdit && onAddRoom && <button type="button" onClick={onAddRoom}
        className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/40 p-5 text-muted-foreground transition hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span aria-hidden className="flex size-13 items-center justify-center rounded-full bg-muted"><Plus className="h-7 w-7" /></span>
        <span className="font-semibold">Add room</span>
      </button>}
  </div>;
}
