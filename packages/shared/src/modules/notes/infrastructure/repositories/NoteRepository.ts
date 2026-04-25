import { getSupabase } from '../../../../config/index.js';
import type {
  NoteType as Note,
  CreateNoteDto,
  UpdateNoteDto,
  NoteFilters,
} from '../../domain';

export class NoteRepository {
  async findAll(filters?: NoteFilters): Promise<Note[]> {
    let query = getSupabase()
      .from('notes')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (filters?.folderId !== undefined) {
      if (filters.folderId === null) {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', filters.folderId);
      }
    }

    if (filters?.searchQuery) {
      // Sanitize search query to prevent SQL injection
      const sanitized = filters.searchQuery.replace(/[%_\\]/g, '\\$&');
      query = query.or(
        `title.ilike.%${sanitized}%,content.ilike.%${sanitized}%`
      );
    }

    if (filters?.isPinned !== undefined) {
      query = query.eq('is_pinned', filters.isPinned);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }

    return (data || []).map(this.mapToEntity);
  }

  async findById(id: string): Promise<Note | null> {
    const { data, error } = await getSupabase()
      .from('notes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch note: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async create(dto: CreateNoteDto): Promise<Note> {
    const { data, error } = await getSupabase()
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

    if (error) {
      throw new Error(`Failed to create note: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, dto: UpdateNoteDto): Promise<Note> {
    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.excerpt !== undefined) updateData.excerpt = dto.excerpt;
    if (dto.folderId !== undefined) updateData.folder_id = dto.folderId;
    if (dto.isPinned !== undefined) updateData.is_pinned = dto.isPinned;
    if (dto.tags !== undefined) updateData.tags = dto.tags;

    const { data, error } = await getSupabase()
      .from('notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update note: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase().from('notes').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): Note {
    return {
      id: data.id as string,
      title: data.title as string,
      content: data.content as string,
      excerpt: data.excerpt as string,
      folderId: data.folder_id as string | null,
      userId: data.user_id as string,
      isPinned: data.is_pinned as boolean,
      tags: (data.tags as string[]) || [],
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
