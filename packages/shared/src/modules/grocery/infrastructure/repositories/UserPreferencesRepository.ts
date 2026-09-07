import { getSupabase } from '../../../../config/index.js';
import type {
  UserPreferencesType,
  UpdateUserPreferencesDto,
} from '../../domain/index.js';

const DEFAULT_CURRENCY = '₱';

export class UserPreferencesRepository {
  async get(userId: string): Promise<UserPreferencesType> {
    const { data, error } = await getSupabase()
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    if (!data) {
      // Return defaults without persisting; row is created on first update.
      const now = new Date();
      return {
        userId,
        currency: DEFAULT_CURRENCY,
        createdAt: now,
        updatedAt: now,
      };
    }

    return this.mapToEntity(data);
  }

  async update(
    userId: string,
    dto: UpdateUserPreferencesDto
  ): Promise<UserPreferencesType> {
    const row: Record<string, unknown> = { user_id: userId };
    if (dto.currency !== undefined) row.currency = dto.currency;

    const { data, error } = await getSupabase()
      .from('user_preferences')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  private mapToEntity(data: Record<string, unknown>): UserPreferencesType {
    return {
      userId: data.user_id as string,
      currency: (data.currency as string) ?? DEFAULT_CURRENCY,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
