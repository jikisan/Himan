import { supabase } from '@core/infrastructure/config';
import { Note } from '../../domain/entities';
import type {
  NoteRepository,
  CreateNoteDto,
  UpdateNoteDto,
} from '../../domain/types';

interface NoteRow {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  folder_id: string | null;
  user_id: string;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export class SupabaseNoteRepository implements NoteRepository {
  private mapToEntity(row: NoteRow): Note {
    return Note.create({
      id: row.id,
      title: row.title,
      content: row.content,
      excerpt: row.excerpt,
      folderId: row.folder_id,
      userId: row.user_id,
      isPinned: row.is_pinned,
      tags: row.tags || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  async findAll(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch notes: ${error.message}`);
    return (data || []).map((row) => this.mapToEntity(row));
  }

  async findById(id: string): Promise<Note | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch note: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async findByFolder(
    folderId: string | null,
    userId: string
  ): Promise<Note[]> {
    let query = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (folderId === null) {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch notes: ${error.message}`);
    return (data || []).map((row) => this.mapToEntity(row));
  }

  async search(
    query: string,
    userId: string,
    folderId?: string | null
  ): Promise<Note[]> {
    let supabaseQuery = supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    if (folderId !== undefined) {
      if (folderId === null) {
        supabaseQuery = supabaseQuery.is('folder_id', null);
      } else {
        supabaseQuery = supabaseQuery.eq('folder_id', folderId);
      }
    }

    const { data, error } = await supabaseQuery
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw new Error(`Failed to search notes: ${error.message}`);
    return (data || []).map((row) => this.mapToEntity(row));
  }

  async create(dto: CreateNoteDto): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        folder_id: dto.folderId,
        user_id: dto.userId,
        is_pinned: dto.isPinned ?? false,
        tags: dto.tags ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create note: ${error.message}`);

    return this.mapToEntity(data);
  }

  async update(id: string, dto: UpdateNoteDto): Promise<Note> {
    const updateData: Partial<NoteRow> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.excerpt !== undefined) updateData.excerpt = dto.excerpt;
    if (dto.folderId !== undefined) updateData.folder_id = dto.folderId;
    if (dto.isPinned !== undefined) updateData.is_pinned = dto.isPinned;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    const { data, error } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update note: ${error.message}`);

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('notes').delete().eq('id', id);

    if (error) throw new Error(`Failed to delete note: ${error.message}`);
  }
}
