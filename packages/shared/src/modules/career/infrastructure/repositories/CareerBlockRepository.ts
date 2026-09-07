import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type {
  CareerBlockType,
  CareerBlockWithUsageType,
  CreateCareerBlockDto,
  UpdateCareerBlockDto,
} from '../../domain/types/index.js';

export class CareerBlockRepository {
  async findAll(userId: string): Promise<CareerBlockType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('career_blocks')
        .select('*')
        .eq('user_id', userId)
        .order('kind', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching career blocks', error);
      throw new Error('Failed to fetch career blocks');
    }
  }

  // Each block joined with how many items currently select it — used to
  // block deletion in the UI instead of surfacing the FK RESTRICT error
  // that career_item_blocks.block_id would otherwise raise.
  async findAllWithUsage(userId: string): Promise<CareerBlockWithUsageType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('career_blocks')
        .select('*, career_item_blocks(count)')
        .eq('user_id', userId)
        .order('kind', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;

      return (data || []).map((row) => ({
        ...this.mapToEntity(row),
        itemCount: (row.career_item_blocks?.[0]?.count as number) ?? 0,
      }));
    } catch (error) {
      getLogger().error('Error fetching career blocks with usage', error);
      throw new Error('Failed to fetch career blocks');
    }
  }

  async findById(id: string, userId: string): Promise<CareerBlockType | null> {
    try {
      const { data, error } = await getSupabase()
        .from('career_blocks')
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
      getLogger().error('Error fetching career block', error);
      throw new Error('Failed to fetch career block');
    }
  }

  async create(dto: CreateCareerBlockDto): Promise<CareerBlockType> {
    try {
      const { data, error } = await getSupabase()
        .from('career_blocks')
        .insert({
          user_id: dto.userId,
          kind: dto.kind,
          label: dto.label,
          body: dto.body,
          tags: dto.tags ?? [],
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating career block', error);
      throw new Error('Failed to create career block');
    }
  }

  async update(id: string, userId: string, dto: UpdateCareerBlockDto): Promise<CareerBlockType> {
    try {
      const { data, error } = await getSupabase()
        .from('career_blocks')
        .update({
          ...(dto.kind !== undefined && { kind: dto.kind }),
          ...(dto.label !== undefined && { label: dto.label }),
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
      getLogger().error('Error updating career block', error);
      throw new Error('Failed to update career block');
    }
  }

  // Fails with a Postgres FK error if the block is still selected by any
  // item's career_item_blocks row (ON DELETE RESTRICT). Callers should check
  // itemCount from findAllWithUsage before calling this.
  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('career_blocks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting career block', error);
      throw new Error('Failed to delete career block');
    }
  }

  private mapToEntity(data: Record<string, unknown>): CareerBlockType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      kind: data.kind as CareerBlockType['kind'],
      label: data.label as string,
      body: data.body as string,
      tags: (data.tags as string[]) ?? [],
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
