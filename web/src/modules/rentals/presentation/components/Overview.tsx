import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { BarChart3, Building2, CircleAlert, CircleCheck, ChevronRight, DoorClosed, ListChecks, Plus, ReceiptText, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatBillPesos, periodLabel } from '@himan/shared/rentals';
import type { AttentionItem, RentalProperty, RentalTenancy } from '@himan/shared/rentals';
import { cn } from '@core/presentation/utils';
import { SECTIONS, SECTION_TITLE } from '../utils/sections';
import type { Section } from '../utils/sections';

const SECTION_ICON: Record<Section, { icon: LucideIcon; color: string }> = {
  todo: { icon: ListChecks, color: 'bg-amber-600' },
  rooms: { icon: DoorClosed, color: 'bg-sky-700' },
  tenants: { icon: Users, color: 'bg-emerald-700' },
  bills: { icon: ReceiptText, color: 'bg-rose-700' },
  analytics: { icon: BarChart3, color: 'bg-violet-700' },
};

const TILE = 'relative flex min-h-36 flex-col gap-4 rounded-2xl border bg-card p-5 text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function Badge({ count }: { count: number }) {
  return count > 0 ? <span aria-hidden className="absolute right-3.5 top-3.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white shadow ring-2 ring-background">
    {count > 99 ? '99+' : count}</span> : null;
}

function TileIcon({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return <span aria-hidden className={cn('flex size-13 items-center justify-center rounded-2xl text-white', color)}><Icon className="h-7 w-7" /></span>;
}

function TileText({ title, detail }: { title: string; detail: ReactNode }) {
  return <span className="mt-auto flex min-w-0 flex-col gap-0.5">
    <span className="truncate text-lg font-semibold">{title}</span>
    <span className="truncate text-sm text-muted-foreground">{detail}</span>
  </span>;
}

/** The first screen: a tile per property, then the dashed tile that starts a new one. */
export function PropertyGrid({ properties, tenancies, todoFor, canCreate, onNew }: {
  properties: RentalProperty[]; tenancies: RentalTenancy[]; todoFor(propertyId: string): number; canCreate: boolean; onNew(): void;
}) {
  return <ul aria-label="Properties" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {properties.map((p) => {
      const taken = tenancies.filter((t) => t.propertyId === p.id && t.moveOut === null).length;
      const beds = p.units.reduce((sum, u) => sum + u.capacity, 0);
      const count = todoFor(p.id);
      return <li key={p.id}>
        <Link to={`/rentals/${p.id}`} className={cn(TILE, 'h-full', p.archivedAt && 'opacity-70')}
          aria-label={`${p.name}, ${taken} of ${beds} beds taken${count ? `, ${count} to do` : ''}${p.archivedAt ? ', archived' : ''}`}>
          <TileIcon icon={Building2} color="bg-indigo-600" />
          <TileText title={p.name} detail={<>{taken} of {beds} beds taken{p.archivedAt && ' · Archived'}</>} />
          <Badge count={count} />
        </Link>
      </li>;
    })}
    <li>
      <button type="button" onClick={onNew} disabled={!canCreate}
        className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/40 p-5 text-muted-foreground transition hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
        <span aria-hidden className="flex size-13 items-center justify-center rounded-full bg-muted"><Plus className="h-7 w-7" /></span>
        <span className="font-semibold">New property</span>
      </button>
    </li>
  </ul>;
}

/** The property screen's tiles, one per section. */
export function SectionTiles({ propertyId, details, badges }: {
  propertyId: string; details: Record<Section, string>; badges: Partial<Record<Section, number>>;
}) {
  return <nav aria-label="Property sections">
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {SECTIONS.map((s) => {
        const count = badges[s] ?? 0;
        return <li key={s}>
          <Link to={`/rentals/${propertyId}/${s}`} className={cn(TILE, 'h-full')}
            aria-label={`${SECTION_TITLE[s]}${count ? `, ${count} need${count === 1 ? 's' : ''} attention` : ''}`}>
            <TileIcon {...SECTION_ICON[s]} />
            <TileText title={SECTION_TITLE[s]} detail={details[s]} />
            <Badge count={count} />
          </Link>
        </li>;
      })}
    </ul>
  </nav>;
}

const when = (item: AttentionItem) => item.inDays < 0 ? `${-item.inDays} day${item.inDays === -1 ? '' : 's'} late`
  : item.inDays === 0 ? 'today' : item.inDays === 1 ? 'tomorrow' : `in ${item.inDays} days`;

/** The most urgent things, at most three, each with the button that deals with it; the rest wait on the To do screen. */
export function NeedsAttention({ items, todoHref, name, room, billPeriod, canManage, onRecordPayment, onOpenBill, onOpenTenant }: {
  items: AttentionItem[]; todoHref: string; name(renterId: string): string; room(unitId: string): string; billPeriod(billId: string): string | undefined;
  canManage: boolean; onRecordPayment(tenancyId: string, billId: string): void; onOpenBill(billId: string): void; onOpenTenant(renterId: string): void;
}) {
  if (!items.length) return <section aria-label="Needs attention" className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-4 shadow-sm">
    <CircleCheck aria-hidden className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
    <p className="min-w-0 flex-1 font-medium">All caught up</p>
    <Link to={todoHref} className="text-sm font-semibold text-primary hover:underline">See to do</Link>
  </section>;
  const action = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9';
  return <section aria-labelledby="rentals-attention" className="overflow-hidden rounded-2xl border border-destructive/40 bg-card shadow-sm">
    <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-4">
      <h2 id="rentals-attention" className="flex items-center gap-2 font-semibold text-destructive">
        <CircleAlert aria-hidden className="h-5 w-5" />Needs attention</h2>
      <Link to={todoHref} className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-primary hover:underline">
        {items.length > 3 ? `See all (${items.length})` : 'See all to do'}<ChevronRight aria-hidden className="h-4 w-4" /></Link>
    </div>
    <ul className="divide-y">{items.slice(0, 3).map((item) => {
      const who = name(item.renterId);
      const period = item.billId ? billPeriod(item.billId) : undefined;
      const title = item.kind === 'due_soon' ? `Rent due ${format(parseISO(item.date), 'MMM d')}`
        : `${period ? `${periodLabel(period).split(' ')[0]} bill` : 'Bill'} ${item.kind === 'overdue' ? 'overdue' : 'unpaid'}`;
      return <li key={item.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className={cn('block text-sm', item.kind === 'overdue' ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {who} · {room(item.unitId)} · {formatBillPesos(item.amountCentavos)} · {when(item)}</span>
        </span>
        {item.billId && canManage
          ? <button type="button" className={cn(action, 'bg-primary text-primary-foreground hover:bg-primary/90')}
            aria-label={`Record payment from ${who}`} onClick={() => onRecordPayment(item.tenancyId, item.billId!)}>Record payment</button>
          : item.billId ? <button type="button" className={cn(action, 'border bg-background hover:bg-muted/50')} onClick={() => onOpenBill(item.billId!)}>View SOA</button>
          : <button type="button" className={cn(action, 'border bg-background hover:bg-muted/50')} aria-label={`View ${who}`}
            onClick={() => onOpenTenant(item.renterId)}>View tenant</button>}
      </li>;
    })}</ul>
  </section>;
}
