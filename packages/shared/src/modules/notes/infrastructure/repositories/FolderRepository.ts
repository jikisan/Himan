import { getSupabase } from '../../../../config/index.js';
import type { FolderType as Folder, CreateFolderDto, UpdateFolderDto } from '../../domain';

export class FolderRepository {
  async findAll(): Promise<Folder[]> {
    const { data, error } = await getSupabase()
      .from('folders')
      .select(
        `
        *,
        note_count:notes(count)
      `
      )
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch folders: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  async findById(id: string): Promise<Folder | null> {
    const { data, error } = await getSupabase()
      .from('folders')
      .select(
        `
        *,
        note_count:notes(count)
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch folder: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async create(dto: CreateFolderDto): Promise<Folder> {
    const { data, error } = await getSupabase()
      .from('folders')
      .insert({
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
        user_id: dto.userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create folder: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, dto: UpdateFolderDto): Promise<Folder> {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.icon !== undefined) updateData.icon = dto.icon;

    const { data, error } = await getSupabase()
      .from('folders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update folder: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase().from('folders').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): Folder {
    const noteCountData = data.note_count as Array<{ count: number }> | undefined;
    const noteCount = noteCountData?.[0]?.count ?? 0;

    return {
      id: data.id as string,
      name: data.name as string,
      color: (data.color as string) || null,
      icon: (data.icon as string) || null,
      userId: data.user_id as string,
      noteCount: noteCount,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
