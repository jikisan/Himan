import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { TierBadge, UsageIndicator } from '@subscriptions/presentation/components';
import { TIER_LIMITS, TIER_DESCRIPTIONS } from '@subscriptions/domain';
import { Loader2 } from 'lucide-react';

export const SubscriptionSettingsCard = () => {
  const { tier, usageStats, loading } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your account tier and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const limits = TIER_LIMITS[tier];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>Manage your account tier and usage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Tier */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">Current Tier:</span>
              <TierBadge tier={tier} />
            </div>
            <p className="text-sm text-muted-foreground">{TIER_DESCRIPTIONS[tier]}</p>
          </div>

          {/* Usage Stats */}
          {usageStats && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Usage</h4>
              <div className="space-y-3">
                <UsageIndicator
                  label="Notes"
                  current={usageStats.notes.current}
                  limit={usageStats.notes.limit}
                />
                <UsageIndicator
                  label="Folders"
                  current={usageStats.folders.current}
                  limit={usageStats.folders.limit}
                />
                <UsageIndicator
                  label="Passwords"
                  current={usageStats.passwords.current}
                  limit={usageStats.passwords.limit}
                />
                <UsageIndicator
                  label="Categories"
                  current={usageStats.categories.current}
                  limit={usageStats.categories.limit}
                />
              </div>
            </div>
          )}

          {/* Tier Limits Summary */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <h4 className="text-sm font-medium mb-3">Tier Limits</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Notes:</span>
                <span className="font-medium">
                  {limits.maxNotes === null ? 'Unlimited' : limits.maxNotes.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Folders:</span>
                <span className="font-medium">
                  {limits.maxFolders === null ? 'Unlimited' : limits.maxFolders.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Note Size:</span>
                <span className="font-medium">{limits.maxNoteSize.toLocaleString()} chars</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Passwords:</span>
                <span className="font-medium">
                  {limits.maxPasswords === null
                    ? 'Unlimited'
                    : limits.maxPasswords.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Categories:</span>
                <span className="font-medium">
                  {limits.maxCategories === null
                    ? 'Unlimited'
                    : limits.maxCategories.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Upgrade Info */}
          {tier !== 'enterprise' && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-muted-foreground">
                {tier === 'beta'
                  ? 'Thank you for being a beta tester! Contact us if you need to upgrade.'
                  : 'Need more capacity? Contact your administrator to upgrade your account tier.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
