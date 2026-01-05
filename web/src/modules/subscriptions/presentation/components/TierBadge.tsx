import { cn } from '@core/presentation/utils';
import type { TierType } from '../../domain';
import { TIER_NAMES } from '../../domain';

interface TierBadgeProps {
  tier: TierType;
  className?: string;
}

export const TierBadge = ({ tier, className }: TierBadgeProps) => {
  const getBadgeStyles = () => {
    switch (tier) {
      case 'free':
        return 'bg-muted text-muted-foreground border-border';
      case 'beta':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
      case 'pro':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'enterprise':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30';
    }
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        getBadgeStyles(),
        className
      )}
    >
      {TIER_NAMES[tier]}
    </span>
  );
};
