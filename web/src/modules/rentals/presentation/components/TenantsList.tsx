import { useState } from 'react';
import { Banknote, CalendarDays, CircleAlert, DoorClosed, Search, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';
import { contractStage, formatPesos } from '@himan/shared/rentals';
import type { ContractText, RentalTenancy, Renter, TenancyLink } from '@himan/shared/rentals';
import { contractOpen, detailsStatus } from '../utils/contract';
import { ContractBadge } from './Badges';
import { inputClass } from './Field';
import { cn } from '@core/presentation/utils';

const AVATARS = ['bg-emerald-700', 'bg-sky-700', 'bg-violet-700', 'bg-amber-700', 'bg-rose-700', 'bg-teal-700'];
const avatarColor = (name: string) => AVATARS[[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % AVATARS.length];

/** A tile per tenant: initial, name, then room, rent and move-in date as icon lines; a red mark when they have something to do. */
export function TenantsList({ renters, tenancies, unitName, onOpen, links = [], contractTexts = [], todo }: {
  renters: Renter[]; tenancies: RentalTenancy[]; unitName(id: string): string; onOpen(renterId: string): void; links?: TenancyLink[];
  contractTexts?: ContractText[];
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
  })
    .filter(({ renter, rooms }) => (showPast || rooms.length > 0) && renter.fullName.toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-0 flex-1 basis-60">
        <Search aria-hidden className="pointer-events-none absolute inset-y-0 left-3 my-auto h-4 w-4 text-muted-foreground" />
        <input type="search" aria-label="Search tenants" placeholder="Search by name" className={cn(inputClass, 'pl-9')}
          value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
        Show past tenants
      </label>
    </div>
    {rows.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
      {query ? 'No tenant matches that name.' : 'No tenants yet. Add one from an empty room.'}</p>
      : <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{rows.map(({ renter, rooms, rent, since, status, contract }) => {
        const count = todo?.get(renter.id) ?? 0;
        return <li key={renter.id} className="relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-4 pt-5 text-center shadow-sm">
          {count > 0 && <CircleAlert role="img" aria-label={`${count} to do`} className="absolute right-3 top-3 h-5 w-5 text-red-500" />}
          <span aria-hidden className={cn('flex size-16 items-center justify-center rounded-full text-2xl font-bold text-white', avatarColor(renter.fullName))}>
            {renter.fullName.trim()[0]?.toUpperCase() ?? '?'}</span>
          <span className="flex min-w-0 max-w-full flex-col items-center gap-1">
            <span className="max-w-full truncate font-semibold">{renter.fullName}</span>
            {contract && <ContractBadge stage={contract} />}
            {status && <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{status}</span>}
          </span>
          <span className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><DoorClosed aria-hidden className="h-4 w-4" /><span className="sr-only">Room: </span>
              <span className={cn(rooms.length && 'text-foreground')}>{rooms.length ? rooms.join(', ') : 'Moved out'}</span></span>
            {rent > 0 && <span className="flex items-center gap-1.5 tabular-nums"><Banknote aria-hidden className="h-4 w-4" /><span className="sr-only">Rent: </span>
              <span className="text-foreground">{formatPesos(rent)}</span></span>}
            {since && <span className="flex items-center gap-1.5"><CalendarDays aria-hidden className="h-4 w-4" /><span className="sr-only">Since: </span>
              <span className="text-foreground">{format(parseISO(since), 'MMM d, yyyy')}</span></span>}
          </span>
          <Button variant="outline" className="mt-auto h-11 w-full sm:h-9" aria-label={`View ${renter.fullName}`}
            onClick={() => onOpen(renter.id)}><UserRound className="h-4 w-4" />View tenant</Button>
        </li>;
      })}</ul>}
  </div>;
}
