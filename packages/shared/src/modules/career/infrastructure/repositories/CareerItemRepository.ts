import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { CareerItemType, CreateCareerItemDto, UpdateCareerItemDto } from '../../domain/types/index.js';

// crypto.randomUUID() isn't typed without the DOM lib on every platform
// this package targets; getRandomValues is. 16 bytes matches the entropy
// of the SQL default (gen_random_uuid() with dashes stripped).
function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class CareerItemRepository {
  async findAll(userId: string): Promise<CareerItemType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('career_items')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching career items', error);
      throw new Error('Failed to fetch career items');
    }
  }

  async findById(id: string, userId: string): Promise<CareerItemType | null> {
    try {
      const { data, error } = await getSupabase()
        .from('career_items')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error fetching career item', error);
      throw new Error('Failed to fetch career item');
    }
  }

  async create(dto: CreateCareerItemDto): Promise<CareerItemType> {
    try {
      const { data, error } = await getSupabase()
        .from('career_items')
        .insert({ user_id: dto.userId, name: dto.name })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating career item', error);
      throw new Error('Failed to create career item');
    }
  }

  async update(id: string, userId: string, dto: UpdateCareerItemDto): Promise<CareerItemType> {
    try {
      const { data, error } = await getSupabase()
        .from('career_items')
        .update({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.cvFilePath !== undefined && { cv_file_path: dto.cvFilePath }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error updating career item', error);
      throw new Error('Failed to update career item');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('career_items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting career item', error);
      throw new Error('Failed to delete career item');
    }
  }

  // Issues a fresh share_token, which is what actually revokes any link
  // built from the old one. The caller (CareerStorageService.rotateShareToken)
  // deletes the old storage folder and re-uploads under the new token.
  async rotateShareToken(id: string, userId: string): Promise<CareerItemType> {
    try {
      const { data, error } = await getSupabase()
        .from('career_items')
        .update({
          share_token: randomToken(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error rotating career item share token', error);
      throw new Error('Failed to rotate share link');
    }
  }

  private mapToEntity(data: Record<string, unknown>): CareerItemType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      cvFilePath: (data.cv_file_path as string) ?? null,
      shareToken: data.share_token as string,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
