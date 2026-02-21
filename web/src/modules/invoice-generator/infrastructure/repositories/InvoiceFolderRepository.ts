import { supabase } from '@core/infrastructure/config/supabase';
import { Logger } from '@core/infrastructure/services';
import type {
  InvoiceFolderType,
  CreateInvoiceFolderDto,
  UpdateInvoiceFolderDto,
} from '../../domain/types';

export class InvoiceFolderRepository {
  async findAll(userId: string): Promise<InvoiceFolderType[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_folders')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      Logger.error('Error fetching invoice folders', error);
      throw new Error('Failed to fetch invoice folders');
    }
  }

  async findById(id: string, userId: string): Promise<InvoiceFolderType | null> {
    try {
      const { data, error } = await supabase
        .from('invoice_folders')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error fetching invoice folder', error);
      throw new Error('Failed to fetch invoice folder');
    }
  }

  async create(dto: CreateInvoiceFolderDto): Promise<InvoiceFolderType> {
    try {
      const { data, error } = await supabase
        .from('invoice_folders')
        .insert({
          user_id: dto.userId,
          name: dto.name,
          ...(dto.invoiceNumberPrefix !== undefined && {
            invoice_number_prefix: dto.invoiceNumberPrefix,
          }),
          ...(dto.invoiceNumberFormat !== undefined && {
            invoice_number_format: dto.invoiceNumberFormat,
          }),
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error creating invoice folder', error);
      throw new Error('Failed to create invoice folder');
    }
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateInvoiceFolderDto
  ): Promise<InvoiceFolderType> {
    try {
      const { data, error } = await supabase
        .from('invoice_folders')
        .update({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.invoiceNumberPrefix !== undefined && {
            invoice_number_prefix: dto.invoiceNumberPrefix,
          }),
          ...(dto.invoiceNumberFormat !== undefined && {
            invoice_number_format: dto.invoiceNumberFormat,
          }),
          ...(dto.nextSequenceNumber !== undefined && {
            next_sequence_number: dto.nextSequenceNumber,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error updating invoice folder', error);
      throw new Error('Failed to update invoice folder');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoice_folders')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      Logger.error('Error deleting invoice folder', error);
      throw new Error('Failed to delete invoice folder');
    }
  }

  /**
   * Atomically increment the sequence number and return the updated folder.
   */
  async incrementSequence(id: string, userId: string): Promise<InvoiceFolderType> {
    try {
      const { data, error } = await supabase.rpc('increment_invoice_sequence', {
        folder_id: id,
        folder_user_id: userId,
      });

      if (error) {
        // Fallback: read-then-update if the RPC doesn't exist
        const folder = await this.findById(id, userId);
        if (!folder) throw new Error('Folder not found');
        return this.update(id, userId, {
          nextSequenceNumber: folder.nextSequenceNumber + 1,
        });
      }

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error incrementing invoice sequence', error);
      throw new Error('Failed to increment invoice sequence');
    }
  }

  private mapToEntity(data: Record<string, unknown>): InvoiceFolderType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      invoiceNumberPrefix: (data.invoice_number_prefix as string) ?? null,
      invoiceNumberFormat: data.invoice_number_format as string,
      nextSequenceNumber: data.next_sequence_number as number,
      invoicesCount: data.invoices_count as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
