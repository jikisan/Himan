import { supabase } from '@core/infrastructure/config';
import { HIDDEN_APPS_METADATA_KEY } from '../../domain/entities';
import type { DashboardAppId } from '../../domain/entities';

/**
 * Keeps dashboard choices in the user's auth metadata, so they follow the
 * account across devices without a table of their own.
 */
export class DashboardPreferencesRepository {
  async saveHiddenApps(hidden: DashboardAppId[]): Promise<void> {
    const { error } = await supabase.auth.updateUser({ data: { [HIDDEN_APPS_METADATA_KEY]: hidden } });
    if (error) throw error;
  }
}
