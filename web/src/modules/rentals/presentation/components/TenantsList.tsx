import { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatPesos } from '@himan/shared/rentals';
import type { RentalTenancy, Renter, TenancyLink } from '@himan/shared/rentals';
import { detailsStatus } from '../utils/contract';
import { Initials } from './Badges';
import { inputClass } from './Field';
import { cn } from '@core/presentation/utils';

export function TenantsList({ renters, tenancies, unitName, onOpen, links = [] }: {
  renters: Renter[]; tenancies: RentalTenancy[]; unitName(id: string): string; onOpen(renterId: string): void; links?: TenancyLink[];
}) {
  const [query, setQuery] = useState('');
  const [showPast, setShowPast] = useState(false);
  const rows = renters.map((r) => {
    const active = tenancies.filter((t) => t.renterId === r.id && t.moveOut === null);
    const rent = active.reduce((sum, t) => sum + (t.contracts.find((c) => c.status === 'active')?.monthlyRentCentavos ?? 0), 0);
    const since = active.map((t) => t.moveIn).sort()[0];
    return { renter: r, rooms: active.map((t) => unitName(t.unitId)), rent, since, status: active.map((t) => detailsStatus(links, t.id)).find(Boolean) };
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
      : <div className="rounded-xl border bg-card shadow-sm">
        <div aria-hidden className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_1rem] gap-4 border-b px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground sm:grid">
          <span>Tenant</span><span>Room</span><span>Rent</span><span>Since</span><span />
        </div>
        <ul className="divide-y">{rows.map(({ renter, rooms, rent, since, status }) => <li key={renter.id}>
          <button type="button" onClick={() => onOpen(renter.id)}
            className="grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_1rem]">
            <span className="flex min-w-0 items-center gap-3"><Initials name={renter.fullName} />
              <span className="min-w-0"><span className="block truncate font-medium">{renter.fullName}</span>
                <span className="block truncate text-sm text-muted-foreground">{status
                  ? <span className="font-medium text-amber-700 dark:text-amber-300">{status}</span> : renter.phone || 'No number saved'}</span></span></span>
            <span className={cn('truncate text-sm', !rooms.length && 'text-muted-foreground')}>{rooms.length ? rooms.join(', ') : 'Moved out'}</span>
            <span className="hidden text-sm tabular-nums sm:block">{rent ? formatPesos(rent) : '—'}</span>
            <span className="hidden text-sm text-muted-foreground sm:block">{since ? format(parseISO(since), 'MMM yyyy') : '—'}</span>
            <ChevronRight aria-hidden className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </button>
        </li>)}</ul>
      </div>}
  </div>;
}
