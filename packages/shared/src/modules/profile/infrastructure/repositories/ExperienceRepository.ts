import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { ExperienceType, CreateExperienceDto, UpdateExperienceDto } from '../../domain/types/index.js';

function toDateString(date: Date | null | undefined): string | null | undefined {
  if (date === undefined) return undefined;
  return date ? date.toISOString().slice(0, 10) : null;
}

export class ExperienceRepository {
  async findAll(userId: string): Promise<ExperienceType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_experiences')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching experiences', error);
      throw new Error('Failed to fetch experiences');
    }
  }

  async create(dto: CreateExperienceDto): Promise<ExperienceType> {
    try {
      const position = dto.position ?? (await this.count(dto.userId));
      const { data, error } = await getSupabase()
        .from('profile_experiences')
        .insert({
          user_id: dto.userId,
          company: dto.company,
          title: dto.title,
          location: dto.location ?? null,
          start_date: toDateString(dto.startDate) ?? null,
          end_date: toDateString(dto.endDate) ?? null,
          is_current: dto.isCurrent ?? false,
          summary: dto.summary ?? null,
          bullets: dto.bullets ?? [],
          position,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating experience', error);
      throw new Error('Failed to create experience');
    }
  }

  async update(id: string, userId: string, dto: UpdateExperienceDto): Promise<ExperienceType> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_experiences')
        .update({
          ...(dto.company !== undefined && { company: dto.company }),
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.location !== undefined && { location: dto.location }),
          ...(dto.startDate !== undefined && { start_date: toDateString(dto.startDate) }),
          ...(dto.endDate !== undefined && { end_date: toDateString(dto.endDate) }),
          ...(dto.isCurrent !== undefined && { is_current: dto.isCurrent }),
          ...(dto.summary !== undefined && { summary: dto.summary }),
          ...(dto.bullets !== undefined && { bullets: dto.bullets }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error updating experience', error);
      throw new Error('Failed to update experience');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('profile_experiences')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting experience', error);
      throw new Error('Failed to delete experience');
    }
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          getSupabase()
            .from('profile_experiences')
            .update({ position: index })
            .eq('id', id)
            .eq('user_id', userId),
        ),
      );
    } catch (error) {
      getLogger().error('Error reordering experiences', error);
      throw new Error('Failed to reorder experiences');
    }
  }

  private async count(userId: string): Promise<number> {
    const { count, error } = await getSupabase()
      .from('profile_experiences')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  }

  private mapToEntity(data: Record<string, unknown>): ExperienceType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      company: data.company as string,
      title: data.title as string,
      location: (data.location as string) ?? null,
      startDate: data.start_date ? new Date(data.start_date as string) : null,
      endDate: data.end_date ? new Date(data.end_date as string) : null,
      isCurrent: data.is_current as boolean,
      summary: (data.summary as string) ?? null,
      bullets: (data.bullets as string[]) ?? [],
      position: data.position as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
