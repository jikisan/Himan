import { getSupabase } from '../../../config/index.js';
import { HIDDEN_APPS_METADATA_KEY } from '../domain/dashboardApps.js';
import type { DashboardAppId } from '../domain/dashboardApps.js';

/**
 * Keeps dashboard choices in the user's auth metadata, so they follow the
 * account across devices (web and mobile) without a table of their own.
 */
export class DashboardPreferencesRepository {
  async saveHiddenApps(hidden: DashboardAppId[]): Promise<void> {
    const { error } = await getSupabase().auth.updateUser({ data: { [HIDDEN_APPS_METADATA_KEY]: hidden } });
    if (error) throw error;
  }
}
