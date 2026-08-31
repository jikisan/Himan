import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { CareerRenderType, CreateCareerRenderDto } from '../../domain/types/index.js';

export class CareerRenderRepository {
  async findByItem(itemId: string): Promise<CareerRenderType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('career_renders')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching career renders', error);
      throw new Error('Failed to fetch career renders');
    }
  }

  async create(dto: CreateCareerRenderDto): Promise<CareerRenderType> {
    try {
      const { data, error } = await getSupabase()
        .from('career_renders')
        .insert({
          item_id: dto.itemId,
          kind: dto.kind,
          length: dto.length,
          job_title: dto.jobTitle ?? null,
          company: dto.company ?? null,
          hiring_manager: dto.hiringManager ?? null,
          hook: dto.hook ?? null,
          body_text: dto.bodyText,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating career render', error);
      throw new Error('Failed to save generated letter');
    }
  }

  private mapToEntity(data: Record<string, unknown>): CareerRenderType {
    return {
      id: data.id as string,
      itemId: data.item_id as string,
      kind: data.kind as CareerRenderType['kind'],
      length: data.length as CareerRenderType['length'],
      jobTitle: (data.job_title as string) ?? null,
      company: (data.company as string) ?? null,
      hiringManager: (data.hiring_manager as string) ?? null,
      hook: (data.hook as string) ?? null,
      bodyText: data.body_text as string,
      createdAt: new Date(data.created_at as string),
    };
  }
}
