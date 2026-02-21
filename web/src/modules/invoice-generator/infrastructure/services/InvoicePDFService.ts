import { supabase } from '@core/infrastructure/config/supabase';
import { Logger } from '@core/infrastructure/services';

const BUCKET_NAME = 'invoices';

export class InvoicePDFService {
  /**
   * Upload a PDF blob to Supabase Storage.
   * Path pattern: {userId}/{invoiceId}.pdf
   */
  static async upload(
    userId: string,
    invoiceId: string,
    pdfBlob: Blob
  ): Promise<{ path: string; fileSize: number }> {
    try {
      const storagePath = `${userId}/${invoiceId}.pdf`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, pdfBlob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      return {
        path: data.path,
        fileSize: pdfBlob.size,
      };
    } catch (error) {
      Logger.error('Error uploading invoice PDF', error);
      throw new Error('Failed to upload invoice PDF');
    }
  }

  /**
   * Delete a PDF from Supabase Storage.
   */
  static async delete(storagePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      if (error) throw error;
    } catch (error) {
      Logger.error('Error deleting invoice PDF', error);
      throw new Error('Failed to delete invoice PDF');
    }
  }

  /**
   * Generate a signed URL for temporary access (default 1 hour).
   */
  static async getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, expiresIn);

      if (error) throw error;

      return data.signedUrl;
    } catch (error) {
      Logger.error('Error generating signed URL for invoice PDF', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Download a PDF from Supabase Storage.
   */
  static async download(storagePath: string): Promise<Blob> {
    try {
      const { data, error } = await supabase.storage.from(BUCKET_NAME).download(storagePath);
      if (error) throw error;
      return data;
    } catch (error) {
      Logger.error('Error downloading invoice PDF', error);
      throw new Error('Failed to download invoice PDF');
    }
  }
}
