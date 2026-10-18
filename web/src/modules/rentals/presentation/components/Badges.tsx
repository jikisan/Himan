import { differenceInCalendarDays, parseISO } from 'date-fns';
import { cn } from '@core/presentation/utils';
import { billBalance, billPaid, billState, formatBillPesos } from '@himan/shared/rentals';
import type { RentalBill, RentalPayment, RentalRole } from '@himan/shared/rentals';

export function Initials({ name, className }: { name: string; className?: string }) {
  const letters = name.split('@')[0].split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <span aria-hidden className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary', className)}>
    {letters || '?'}</span>;
}

const ROLE_STYLE: Record<RentalRole, string> = {
  owner: 'bg-primary/10 text-primary', manager: 'bg-secondary text-secondary-foreground', viewer: 'bg-muted text-muted-foreground',
};
export function RoleBadge({ role }: { role: RentalRole }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROLE_STYLE[role]}`}>{role}</span>;
}

const STATE_STYLE = {
  paid: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', partial: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  unpaid: 'bg-muted text-muted-foreground', overdue: 'bg-destructive/10 text-destructive', void: 'bg-muted text-muted-foreground',
} as const;
/** Paid · Partial ₱X left · Unpaid · Overdue (with how much is left, or how late when nothing was paid). */
export function BillStateBadge({ bill, payments, today, className }: { bill: RentalBill; payments: RentalPayment[]; today: string; className?: string }) {
  const state = billState(bill, payments, today);
  const left = `${formatBillPesos(billBalance(bill, payments))} left`;
  const late = differenceInCalendarDays(parseISO(today), parseISO(bill.dueOn));
  const text = state === 'paid' ? 'Paid' : state === 'partial' ? `Partial · ${left}` : state === 'unpaid' ? 'Unpaid' : state === 'void' ? 'Cancelled'
    : billPaid(bill.id, payments) > 0 ? `Overdue · ${left}` : `Overdue · ${late} day${late === 1 ? '' : 's'}`;
  return <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', STATE_STYLE[state], className)}>{text}</span>;
}
