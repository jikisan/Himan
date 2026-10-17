import { useMemo, useState } from 'react';
import { useAuth } from '@auth/presentation/hooks';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { DASHBOARD_APP_IDS, readHiddenApps } from '../../domain/entities';
import type { DashboardAppId } from '../../domain/entities';
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

  return { available, visible, hidden, saving, save };
};
