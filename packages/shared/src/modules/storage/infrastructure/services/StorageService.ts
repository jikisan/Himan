import { getSupabase } from '../../../../config/index.js';
import { getLogger } from '../../../../services/index.js';

const BUCKET_NAME = 'user-files';

export class StorageService {
  /**
   * Upload a file to Supabase Storage
   */
  static async upload(
    userId: string,
    fileId: string,
    file: File
  ): Promise<{ path: string; url: string }> {
    try {
      const fileExtension = file.name.split('.').pop() || '';
      const storagePath = `${userId}/${fileId}.${fileExtension}`;

      // Upload file
      const { data, error } = await getSupabase().storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(storagePath);

      return {
        path: data.path,
        url: urlData.publicUrl,
      };
    } catch (error) {
      getLogger().error('Error uploading file', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async delete(storagePath: string): Promise<void> {
    try {
      const { error } = await getSupabase().storage.from(BUCKET_NAME).remove([storagePath]);

      if (error) {
        throw error;
      }
    } catch (error) {
      getLogger().error('Error deleting file', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get public URL for a file
   */
  static getPublicUrl(storagePath: string): string {
    const { data } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  /**
   * Download a file
   */
  static async download(storagePath: string): Promise<Blob> {
    try {
      const { data, error } = await getSupabase().storage.from(BUCKET_NAME).download(storagePath);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      getLogger().error('Error downloading file', error);
      throw new Error('Failed to download file');
    }
  }

  /**
   * Generate a signed URL for temporary access (expires in 1 hour)
   */
  static async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    try {
      const { data, error } = await getSupabase().storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      getLogger().error('Error generating signed URL', error);
      throw new Error('Failed to generate signed URL');
    }
  }
}
