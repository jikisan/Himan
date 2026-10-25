import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardBadgeRepository, DashboardPreferencesRepository, readHiddenApps } from '@himan/shared/dashboard';
import { todayISO } from '@himan/shared/receipts';
import type { DashboardAppId } from '@himan/shared/dashboard';
import { useAuth } from '@/modules/auth';
import { MOBILE_APPS } from '../screens/appCatalog';

/**
 * The apps on the phone, which of them are hidden, and a way to save that. Uses the same saved choice as the web dashboard
 * (the user's auth metadata), so hiding an app on one hides it on the other.
 */
export function useDashboardApps() {
  const { user } = useAuth();
  const repository = useMemo(() => new DashboardPreferencesRepository(), []);
  // Shows a save straight away; the auth listener then delivers the same value in user metadata.
  const [optimistic, setOptimistic] = useState<DashboardAppId[] | null>(null);
  const [saving, setSaving] = useState(false);
  const hidden = optimistic ?? readHiddenApps(user?.user_metadata);
  const visible = MOBILE_APPS.filter((app) => !hidden.includes(app.id));
  const save = async (next: DashboardAppId[]) => {
    const previous = optimistic;
    setOptimistic(next);
    setSaving(true);
    try { await repository.saveHiddenApps(next); } catch (error) { setOptimistic(previous); throw error; } finally { setSaving(false); }
  };
  // Counts of things needing attention, for the tile badges; none until they load, and none on failure.
  const badgeRepository = useMemo(() => new DashboardBadgeRepository(), []);
  const { data: badges = {} } = useQuery({
    queryKey: ['dashboard-badges', user?.id], queryFn: () => badgeRepository.counts(user!.id, todayISO()), enabled: !!user?.id, retry: false,
  });
  return { available: MOBILE_APPS, visible, hidden, saving, save, badges, name: user?.email?.split('@')[0] || 'there' };
}
