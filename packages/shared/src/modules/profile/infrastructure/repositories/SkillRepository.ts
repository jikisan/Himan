import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { SkillType, CreateSkillDto, UpdateSkillDto } from '../../domain/types/index.js';

export class SkillRepository {
  async findAll(userId: string): Promise<SkillType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_skills')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching skills', error);
      throw new Error('Failed to fetch skills');
    }
  }

  async create(dto: CreateSkillDto): Promise<SkillType> {
    try {
      const position = dto.position ?? (await this.count(dto.userId));
      const { data, error } = await getSupabase()
        .from('profile_skills')
        .insert({
          user_id: dto.userId,
          name: dto.name,
          category: dto.category ?? null,
          level: dto.level ?? null,
          position,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('Skill already exists');
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Skill already exists') throw error;
      getLogger().error('Error creating skill', error);
      throw new Error('Failed to create skill');
    }
  }

  async update(id: string, userId: string, dto: UpdateSkillDto): Promise<SkillType> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_skills')
        .update({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.level !== undefined && { level: dto.level }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') throw new Error('Skill already exists');
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Skill already exists') throw error;
      getLogger().error('Error updating skill', error);
      throw new Error('Failed to update skill');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('profile_skills')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting skill', error);
      throw new Error('Failed to delete skill');
    }
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          getSupabase().from('profile_skills').update({ position: index }).eq('id', id).eq('user_id', userId),
        ),
      );
    } catch (error) {
      getLogger().error('Error reordering skills', error);
      throw new Error('Failed to reorder skills');
    }
  }

  private async count(userId: string): Promise<number> {
    const { count, error } = await getSupabase()
      .from('profile_skills')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  }

  private mapToEntity(data: Record<string, unknown>): SkillType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      category: (data.category as string) ?? null,
      level: (data.level as string) ?? null,
      position: data.position as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
