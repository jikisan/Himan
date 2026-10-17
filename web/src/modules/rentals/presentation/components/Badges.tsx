import { cn } from '@core/presentation/utils';
import type { RentalRole } from '@himan/shared/rentals';

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
