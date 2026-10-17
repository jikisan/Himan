import { Loader2 } from 'lucide-react';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { TierBadge } from '@subscriptions/presentation/components';
import { TIER_LIMITS } from '@subscriptions/domain';
import { cn } from '@core/presentation/utils';
import { SettingsRow, SettingsSection } from './SettingsSection';

const formatBytes = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${+(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

interface UsageRowProps {
  label: string;
  current: number;
  /** null means the plan has no cap on this. */
  limit: number | null;
  format?: (value: number) => string;
}

/** What you've used against what the plan allows, in one line, with a bar when there's a cap. */
const UsageRow = ({ label, current, limit, format = (n) => n.toLocaleString() }: UsageRowProps) => {
  const percent = limit ? Math.min((current / limit) * 100, 100) : 0;
  const full = limit !== null && current >= limit;
  const near = limit !== null && percent >= 80;

  return (
    <div className="space-y-1.5 px-4 py-3">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn('tabular-nums text-muted-foreground', full && 'font-medium text-destructive')}>
          {limit === null ? (
            <>
              {format(current)} <span className="text-primary">· No limit</span>
            </>
          ) : (
            `${format(current)} of ${format(limit)}`
          )}
        </span>
      </div>
      {limit !== null && (
        <div
          role="progressbar"
          aria-label={`${label} used`}
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn('h-full transition-all duration-300', full ? 'bg-destructive' : near ? 'bg-yellow-500' : 'bg-primary')}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
};

export const PlanUsageSection = () => {
  const { tier, isAdmin, usageStats, loading } = useSubscription();

  if (loading) {
    return (
      <SettingsSection title="Plan & usage">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Loading plan" />
        </div>
      </SettingsSection>
    );
  }

  const footer = isAdmin
    ? 'You’re an admin, so none of these limits apply to you.'
    : tier === 'beta'
      ? 'Thanks for testing Himan! Contact us if you need more room.'
      : tier === 'enterprise'
        ? undefined
        : 'Need more room? Ask your administrator to upgrade your plan.';

  return (
    <SettingsSection title="Plan & usage" footer={footer}>
      <SettingsRow label="Plan">
        <TierBadge tier={tier} />
        {isAdmin && (
          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
            Admin
          </span>
        )}
      </SettingsRow>
      {usageStats && (
        <>
          <UsageRow label="Notes" current={usageStats.notes.current} limit={usageStats.notes.limit} />
          <UsageRow label="Note folders" current={usageStats.folders.current} limit={usageStats.folders.limit} />
          <UsageRow label="Passwords" current={usageStats.passwords.current} limit={usageStats.passwords.limit} />
          <UsageRow label="Password categories" current={usageStats.categories.current} limit={usageStats.categories.limit} />
          <UsageRow label="Cards" current={usageStats.cards.current} limit={usageStats.cards.limit} />
          <UsageRow label="Files" current={usageStats.files.current} limit={usageStats.files.limit} />
          <UsageRow label="Storage" current={usageStats.storage.current} limit={usageStats.storage.limit} format={formatBytes} />
        </>
      )}
      <SettingsRow label="Longest note" description="Characters allowed in a single note">
        <span className="tabular-nums text-muted-foreground">{TIER_LIMITS[tier].maxNoteSize.toLocaleString()}</span>
      </SettingsRow>
    </SettingsSection>
  );
};
