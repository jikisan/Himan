import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardBadgeRepository } from '@himan/shared/dashboard';
import { todayISO } from '@himan/shared/receipts';
import { useAuth } from '@auth/presentation/hooks';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { DASHBOARD_APP_IDS, readDashboardLayout, readHiddenApps } from '../../domain/entities';
import type { DashboardAppId, DashboardLayout } from '../../domain/entities';
import { DashboardPreferencesRepository } from '../../infrastructure/api';
import { DASHBOARD_APPS } from '../components/appCatalog';

/** The apps this user may put on the dashboard, which of them are hidden, and a way to save that. */
export const useDashboardApps = () => {
  const { user } = useAuth();
  const { tier, isAdmin } = useSubscription();
  const repository = useMemo(() => new DashboardPreferencesRepository(), []);
  // Shows a save straight away; the auth listener then delivers the same value in user metadata.
  const [optimistic, setOptimistic] = useState<DashboardAppId[] | null>(null);
  const [saving, setSaving] = useState(false);

  const canAccessStorage = tier === 'enterprise' || isAdmin;
  const available = DASHBOARD_APP_IDS.map((id) => DASHBOARD_APPS[id]).filter(
    (app) => !app.needsStorageAccess || canAccessStorage
  );
  const hidden = optimistic ?? readHiddenApps(user?.user_metadata);
  const visible = available.filter((app) => !hidden.includes(app.id));

  const save = async (next: DashboardAppId[]) => {
    const previous = optimistic;
    setOptimistic(next);
    setSaving(true);
    try {
      await repository.saveHiddenApps(next);
    } catch (error) {
      setOptimistic(previous);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Switches at once and keeps the switch even if saving fails; it is only a view preference.
  const [layoutChoice, setLayoutChoice] = useState<DashboardLayout | null>(null);
  const layout = layoutChoice ?? readDashboardLayout(user?.user_metadata);
  const saveLayout = (next: DashboardLayout) => {
    setLayoutChoice(next);
    return repository.saveLayout(next);
  };

  // Counts of things needing attention, for the tile badges; none until they load, and none on failure.
  const badgeRepository = useMemo(() => new DashboardBadgeRepository(), []);
  const { data: badges = {} } = useQuery({
    queryKey: ['dashboard-badges', user?.id], queryFn: () => badgeRepository.counts(user!.id, todayISO()), enabled: !!user?.id, retry: false,
  });

  return { available, visible, hidden, saving, save, badges, layout, saveLayout };
};
