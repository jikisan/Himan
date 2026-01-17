import { supabase } from '@core/infrastructure/config/supabase';
import { Logger } from '@core/infrastructure/services';
import type { FileType, CreateFileDto, UpdateFileDto, FileFilters } from '../../domain/types';

export class FileRepository {
  /**
   * Find all files for a user with optional filters
   */
  async findAll(userId: string, filters?: FileFilters): Promise<FileType[]> {
    try {
      let query = supabase.from('files').select('*').eq('user_id', userId).order('created_at', { ascending: false });

      // Apply folder filter
      if (filters?.folderId !== undefined) {
        if (filters.folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', filters.folderId);
        }
      }

      // Apply search filter
      if (filters?.searchQuery) {
        query = query.ilike('name', `%${filters.searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      Logger.error('Error fetching files', error);
      throw new Error('Failed to fetch files');
    }
  }

  /**
   * Find a file by ID
   */
  async findById(id: string, userId: string): Promise<FileType | null> {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error fetching file', error);
      throw new Error('Failed to fetch file');
    }
  }

  /**
   * Create a new file
   */
  async create(dto: CreateFileDto): Promise<FileType> {
    try {
      const { data, error } = await supabase
        .from('files')
        .insert({
          user_id: dto.userId,
          folder_id: dto.folderId || null,
          name: dto.name,
          size: dto.size,
          mime_type: dto.mimeType,
          description: dto.description || null,
          thumbnail_url: dto.thumbnailUrl || null,
          storage_path: dto.storagePath,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error creating file', error);
      throw new Error('Failed to create file');
    }
  }

  /**
   * Update a file
   */
  async update(id: string, userId: string, dto: UpdateFileDto): Promise<FileType> {
    try {
      const { data, error} = await supabase
        .from('files')
        .update({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.folderId !== undefined && { folder_id: dto.folderId }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.thumbnailUrl !== undefined && { thumbnail_url: dto.thumbnailUrl }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error updating file', error);
      throw new Error('Failed to update file');
    }
  }

  /**
   * Delete a file
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      Logger.error('Error deleting file', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Map database record to domain entity
   */
  private mapToEntity(data: any): FileType {
    return {
      id: data.id,
      userId: data.user_id,
      folderId: data.folder_id,
      name: data.name,
      size: data.size,
      mimeType: data.mime_type,
      description: data.description,
      thumbnailUrl: data.thumbnail_url,
      storagePath: data.storage_path,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
