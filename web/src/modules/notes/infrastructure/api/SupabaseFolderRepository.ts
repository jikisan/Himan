import { supabase } from '@core/infrastructure/config';
import { Folder } from '../../domain/entities';
import type {
  FolderRepository,
  CreateFolderDto,
  UpdateFolderDto,
} from '../../domain/types';

interface FolderRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  note_count?: number;
}

export class SupabaseFolderRepository implements FolderRepository {
  private mapToEntity(row: FolderRow): Folder {
    return Folder.create({
      id: row.id,
      name: row.name,
      color: row.color ?? undefined,
      icon: row.icon ?? undefined,
      userId: row.user_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      noteCount: row.note_count ?? 0,
    });
  }

  async findAll(userId: string): Promise<Folder[]> {
    const { data, error } = await supabase
      .from('folders_with_count')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch folders: ${error.message}`);
    return (data || []).map((row) => this.mapToEntity(row as FolderRow));
  }

  async findById(id: string): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('folders_with_count')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch folder: ${error.message}`);
    }

    return this.mapToEntity(data as FolderRow);
  }

  async create(dto: CreateFolderDto): Promise<Folder> {
    const { data, error } = await supabase
      .from('folders')
      .insert({
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
        user_id: dto.userId,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create folder: ${error.message}`);

    return this.mapToEntity({ ...data, note_count: 0 } as FolderRow);
  }

  async update(id: string, dto: UpdateFolderDto): Promise<Folder> {
    const { data, error } = await supabase
      .from('folders')
      .update({
        name: dto.name,
        color: dto.color,
        icon: dto.icon,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update folder: ${error.message}`);

    return this.mapToEntity({ ...data, note_count: 0 } as FolderRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('folders').delete().eq('id', id);

    if (error) throw new Error(`Failed to delete folder: ${error.message}`);
  }
}
