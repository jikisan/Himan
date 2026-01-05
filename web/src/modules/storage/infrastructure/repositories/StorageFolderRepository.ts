import { supabase } from '@core/infrastructure/config/supabase';
import { Logger } from '@core/infrastructure/services';
import type {
  StorageFolderType,
  CreateStorageFolderDto,
  UpdateStorageFolderDto,
} from '../../domain/types';

export class StorageFolderRepository {
  /**
   * Find all folders for a user
   */
  async findAll(userId: string): Promise<StorageFolderType[]> {
    try {
      const { data, error } = await supabase
        .from('storage_folders')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      Logger.error('Error fetching storage folders', error);
      throw new Error('Failed to fetch storage folders');
    }
  }

  /**
   * Find a folder by ID
   */
  async findById(id: string, userId: string): Promise<StorageFolderType | null> {
    try {
      const { data, error } = await supabase
        .from('storage_folders')
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
      Logger.error('Error fetching storage folder', error);
      throw new Error('Failed to fetch storage folder');
    }
  }

  /**
   * Create a new folder
   */
  async create(dto: CreateStorageFolderDto): Promise<StorageFolderType> {
    try {
      const { data, error } = await supabase
        .from('storage_folders')
        .insert({
          user_id: dto.userId,
          name: dto.name,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error creating storage folder', error);
      throw new Error('Failed to create storage folder');
    }
  }

  /**
   * Update a folder
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateStorageFolderDto
  ): Promise<StorageFolderType> {
    try {
      const { data, error } = await supabase
        .from('storage_folders')
        .update({
          name: dto.name,
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
      Logger.error('Error updating storage folder', error);
      throw new Error('Failed to update storage folder');
    }
  }

  /**
   * Delete a folder
   */
  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('storage_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      Logger.error('Error deleting storage folder', error);
      throw new Error('Failed to delete storage folder');
    }
  }

  /**
   * Map database record to domain entity
   */
  private mapToEntity(data: any): StorageFolderType {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      filesCount: data.files_count,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
