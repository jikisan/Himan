import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { CareerCvBlockType, CreateCareerCvBlockDto, UpdateCareerCvBlockDto } from '../../domain/types/index.js';

export class CareerCvBlockRepository {
  async findAll(userId: string): Promise<CareerCvBlockType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('career_cv_blocks')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching CV blocks', error);
      throw new Error('Failed to fetch CV blocks');
    }
  }

  async create(dto: CreateCareerCvBlockDto): Promise<CareerCvBlockType> {
    try {
      const position = dto.position ?? (await this.count(dto.userId));
      const { data, error } = await getSupabase()
        .from('career_cv_blocks')
        .insert({
          user_id: dto.userId,
          kind: dto.kind ?? 'custom',
          label: dto.label ?? '',
          title: dto.title,
          body: dto.body ?? '',
          tags: dto.tags ?? [],
          position,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating CV block', error);
      throw new Error('Failed to create CV block');
    }
  }

  async update(id: string, userId: string, dto: UpdateCareerCvBlockDto): Promise<CareerCvBlockType> {
    try {
      const { data, error } = await getSupabase()
        .from('career_cv_blocks')
        .update({
          ...(dto.kind !== undefined && { kind: dto.kind }),
          ...(dto.label !== undefined && { label: dto.label }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.body !== undefined && { body: dto.body }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error updating CV block', error);
      throw new Error('Failed to update CV block');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('career_cv_blocks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting CV block', error);
      throw new Error('Failed to delete CV block');
    }
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          getSupabase()
            .from('career_cv_blocks')
            .update({ position: index })
            .eq('id', id)
            .eq('user_id', userId),
        ),
      );
    } catch (error) {
      getLogger().error('Error reordering CV blocks', error);
      throw new Error('Failed to reorder CV blocks');
    }
  }

  private async count(userId: string): Promise<number> {
    const { count, error } = await getSupabase()
      .from('career_cv_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  }

  private mapToEntity(data: Record<string, unknown>): CareerCvBlockType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      kind: (data.kind as CareerCvBlockType['kind']) ?? 'custom',
      label: (data.label as string) ?? '',
      title: data.title as string,
      body: data.body as string,
      tags: (data.tags as string[]) ?? [],
      position: data.position as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
