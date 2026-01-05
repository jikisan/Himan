import { supabase } from '@core/infrastructure/config/supabase';
import type { UsageLimitsType } from '../../domain';

export class UsageLimitsRepository {
  /**
   * Get user's usage limits by user ID
   */
  async findByUserId(userId: string): Promise<UsageLimitsType | null> {
    const { data, error } = await supabase
      .from('usage_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No usage record found
        return null;
      }
      throw new Error(`Failed to fetch usage limits: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * Refresh usage counts from actual data
   * This can be used to sync if counters get out of sync
   */
  async refreshCounts(userId: string): Promise<UsageLimitsType> {
    // Get actual counts from all tables
    const [notesResult, foldersResult, passwordsResult, categoriesResult] = await Promise.all([
      supabase.from('notes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('folders').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('passwords').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase
        .from('password_categories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    // Update usage_limits with actual counts
    const { data, error } = await supabase
      .from('usage_limits')
      .update({
        notes_count: notesResult.count ?? 0,
        folders_count: foldersResult.count ?? 0,
        passwords_count: passwordsResult.count ?? 0,
        categories_count: categoriesResult.count ?? 0,
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to refresh usage counts: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * Map database record to domain entity
   */
  private mapToEntity(data: Record<string, unknown>): UsageLimitsType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      notesCount: data.notes_count as number,
      foldersCount: data.folders_count as number,
      passwordsCount: data.passwords_count as number,
      categoriesCount: data.categories_count as number,
      filesCount: (data.files_count as number) || 0,
      storageUsed: (data.storage_used as number) || 0,
      storageFoldersCount: (data.storage_folders_count as number) || 0,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
