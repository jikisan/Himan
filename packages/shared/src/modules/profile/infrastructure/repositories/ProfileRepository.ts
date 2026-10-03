import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { ProfileType, ProfileUpsertDto } from '../../domain/types/index.js';

export class ProfileRepository {
  async get(userId: string): Promise<ProfileType | null> {
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error fetching profile', error);
      throw new Error('Failed to fetch profile');
    }
  }

  async upsert(dto: ProfileUpsertDto): Promise<ProfileType> {
    try {
      const { data, error } = await getSupabase()
        .from('profiles')
        .upsert(
          {
            user_id: dto.userId,
            full_name: dto.fullName,
            headline: dto.headline,
            bio: dto.bio,
            location: dto.location,
            email: dto.email,
            phone: dto.phone,
            website: dto.website,
            links: dto.links,
            handle: dto.handle,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error saving profile', error);
      throw new Error('Failed to save profile');
    }
  }

  private mapToEntity(data: Record<string, unknown>): ProfileType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      fullName: (data.full_name as string) ?? null,
      headline: (data.headline as string) ?? null,
      bio: (data.bio as string) ?? null,
      location: (data.location as string) ?? null,
      email: (data.email as string) ?? null,
      phone: (data.phone as string) ?? null,
      website: (data.website as string) ?? null,
      links: (data.links as Record<string, string>) ?? {},
      handle: (data.handle as string) ?? null,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
