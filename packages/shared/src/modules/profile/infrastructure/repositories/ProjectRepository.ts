import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';
import type { ProjectType, CreateProjectDto, UpdateProjectDto } from '../../domain/types/index.js';

function toDateString(date: Date | null | undefined): string | null | undefined {
  if (date === undefined) return undefined;
  return date ? date.toISOString().slice(0, 10) : null;
}

export class ProjectRepository {
  async findAll(userId: string): Promise<ProjectType[]> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_projects')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      getLogger().error('Error fetching projects', error);
      throw new Error('Failed to fetch projects');
    }
  }

  async create(dto: CreateProjectDto): Promise<ProjectType> {
    try {
      const position = dto.position ?? (await this.count(dto.userId));
      const { data, error } = await getSupabase()
        .from('profile_projects')
        .insert({
          user_id: dto.userId,
          name: dto.name,
          description: dto.description ?? null,
          url: dto.url ?? null,
          tech: dto.tech ?? [],
          platform: dto.platform ?? [],
          start_date: toDateString(dto.startDate) ?? null,
          end_date: toDateString(dto.endDate) ?? null,
          outcome: dto.outcome ?? null,
          proof_metric: dto.proofMetric ?? null,
          proof_label: dto.proofLabel ?? null,
          category: dto.category ?? null,
          featured: dto.featured ?? false,
          images: dto.images ?? [],
          position,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error creating project', error);
      throw new Error('Failed to create project');
    }
  }

  async update(id: string, userId: string, dto: UpdateProjectDto): Promise<ProjectType> {
    try {
      const { data, error } = await getSupabase()
        .from('profile_projects')
        .update({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.url !== undefined && { url: dto.url }),
          ...(dto.tech !== undefined && { tech: dto.tech }),
          ...(dto.platform !== undefined && { platform: dto.platform }),
          ...(dto.startDate !== undefined && { start_date: toDateString(dto.startDate) }),
          ...(dto.endDate !== undefined && { end_date: toDateString(dto.endDate) }),
          ...(dto.outcome !== undefined && { outcome: dto.outcome }),
          ...(dto.proofMetric !== undefined && { proof_metric: dto.proofMetric }),
          ...(dto.proofLabel !== undefined && { proof_label: dto.proofLabel }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.featured !== undefined && { featured: dto.featured }),
          ...(dto.images !== undefined && { images: dto.images }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      getLogger().error('Error updating project', error);
      throw new Error('Failed to update project');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await getSupabase()
        .from('profile_projects')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      getLogger().error('Error deleting project', error);
      throw new Error('Failed to delete project');
    }
  }

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          getSupabase().from('profile_projects').update({ position: index }).eq('id', id).eq('user_id', userId),
        ),
      );
    } catch (error) {
      getLogger().error('Error reordering projects', error);
      throw new Error('Failed to reorder projects');
    }
  }

  private async count(userId: string): Promise<number> {
    const { count, error } = await getSupabase()
      .from('profile_projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;
    return count ?? 0;
  }

  private mapToEntity(data: Record<string, unknown>): ProjectType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      description: (data.description as string) ?? null,
      url: (data.url as string) ?? null,
      tech: (data.tech as string[]) ?? [],
      platform: (data.platform as string[]) ?? [],
      startDate: data.start_date ? new Date(data.start_date as string) : null,
      endDate: data.end_date ? new Date(data.end_date as string) : null,
      outcome: (data.outcome as string) ?? null,
      proofMetric: (data.proof_metric as string) ?? null,
      proofLabel: (data.proof_label as string) ?? null,
      category: (data.category as string) ?? null,
      featured: (data.featured as boolean) ?? false,
      images: (data.images as string[]) ?? [],
      position: data.position as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
