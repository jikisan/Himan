import { cn } from '@core/presentation/utils';

interface UsageIndicatorProps {
  label: string;
  current: number;
  limit: number | null;
  className?: string;
}

export const UsageIndicator = ({ label, current, limit, className }: UsageIndicatorProps) => {
  // Calculate percentage for progress bar
  const percentage = limit === null ? 0 : Math.min((current / limit) * 100, 100);
  const isUnlimited = limit === null;
  const isApproachingLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-medium', isAtLimit && 'text-destructive')}>
          {isUnlimited ? (
            <span className="text-primary">Unlimited</span>
          ) : (
            <>
              {current} / {limit}
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              isAtLimit ? 'bg-destructive' : isApproachingLimit ? 'bg-yellow-500' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
