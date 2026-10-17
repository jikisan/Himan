import type { LucideIcon } from 'lucide-react';
import { cn } from '@core/presentation/utils';

export const AppIcon = ({ icon: Icon, color, size = 'sm' }: { icon: LucideIcon; color: string; size?: 'sm' | 'lg' }) => (
  <span
    aria-hidden
    className={cn(
      'inline-flex shrink-0 items-center justify-center bg-gradient-to-b text-white shadow-sm',
      color,
      size === 'lg' ? 'h-16 w-16 rounded-2xl' : 'h-8 w-8 rounded-lg'
    )}
  >
    <Icon className={size === 'lg' ? 'h-8 w-8' : 'h-4 w-4'} />
  </span>
);
