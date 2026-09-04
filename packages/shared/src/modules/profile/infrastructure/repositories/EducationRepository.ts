import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { EducationType, CreateEducationDto, UpdateEducationDto } from '../../domain/types/index.js';

function toDateString(date: Date | null | undefined): string | null | undefined {
  if (date === undefined) return undefined;
  return date ? date.toISOString().slice(0, 10) : null;
}

export class EducationRepository {
  async findAll(userId: string): Promise<EducationType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_education')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching education', error);
      throw new Error('Failed to fetch education');
    }
  }

  async create(dto: CreateEducationDto): Promise<EducationType> {
    try {
      const position = dto.position ?? (await this.count(dto.userId));
      const { data, error } = await getSupabase()
        .from('profile_education')
        .insert({
          user_id: dto.userId,
          school: dto.school,
          degree: dto.degree ?? null,
          field: dto.field ?? null,
          location: dto.location ?? null,
          start_date: toDateString(dto.startDate) ?? null,
          end_date: toDateString(dto.endDate) ?? null,
          gpa: dto.gpa ?? null,
          achievements: dto.achievements ?? [],
          position,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating education', error);
      throw new Error('Failed to create education');
    }
  }

  async update(id: string, userId: string, dto: UpdateEducationDto): Promise<EducationType> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_education')
        .update({
          ...(dto.school !== undefined && { school: dto.school }),
          ...(dto.degree !== undefined && { degree: dto.degree }),
          ...(dto.field !== undefined && { field: dto.field }),
          ...(dto.location !== undefined && { location: dto.location }),
          ...(dto.startDate !== undefined && { start_date: toDateString(dto.startDate) }),
          ...(dto.endDate !== undefined && { end_date: toDateString(dto.endDate) }),
          ...(dto.gpa !== undefined && { gpa: dto.gpa }),
          ...(dto.achievements !== undefined && { achievements: dto.achievements }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error updating education', error);
      throw new Error('Failed to update education');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('profile_education')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting education', error);
      throw new Error('Failed to delete education');
    }
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          getSupabase()
            .from('profile_education')
            .update({ position: index })
            .eq('id', id)
            .eq('user_id', userId),
        ),
      );
    } catch (error) {
      getLogger().error('Error reordering education', error);
      throw new Error('Failed to reorder education');
    }
  }

  private async count(userId: string): Promise<number> {
    const { count, error } = await getSupabase()
      .from('profile_education')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  }

  private mapToEntity(data: Record<string, unknown>): EducationType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      school: data.school as string,
      degree: (data.degree as string) ?? null,
      field: (data.field as string) ?? null,
      location: (data.location as string) ?? null,
      startDate: data.start_date ? new Date(data.start_date as string) : null,
      endDate: data.end_date ? new Date(data.end_date as string) : null,
      gpa: (data.gpa as string) ?? null,
      achievements: (data.achievements as string[]) ?? [],
      position: data.position as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
