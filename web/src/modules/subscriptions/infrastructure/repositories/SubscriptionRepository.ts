import { supabase } from '@core/infrastructure/config/supabase';
import type { SubscriptionType, TierType, RoleType } from '../../domain';

export class SubscriptionRepository {
  /**
   * Get user's subscription by user ID
   */
  async findByUserId(userId: string): Promise<SubscriptionType | null> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No subscription found
        return null;
      }
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * Update user's subscription tier
   */
  async updateTier(userId: string, tier: TierType): Promise<SubscriptionType> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ tier })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update subscription tier: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * Update user's role
   */
  async updateRole(userId: string, role: RoleType): Promise<SubscriptionType> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ role })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update subscription role: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * Set subscription expiration date
   */
  async setValidUntil(userId: string, validUntil: Date | null): Promise<SubscriptionType> {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .update({ valid_until: validUntil?.toISOString() })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update subscription validity: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /**
   * Map database record to domain entity
   */
  private mapToEntity(data: Record<string, unknown>): SubscriptionType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      tier: data.tier as TierType,
      role: (data.role as RoleType) || 'user', // Default to 'user' if not set
      validUntil: data.valid_until ? new Date(data.valid_until as string) : null,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
