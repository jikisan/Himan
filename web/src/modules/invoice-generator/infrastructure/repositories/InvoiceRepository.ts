import { supabase } from '@core/infrastructure/config/supabase';
import { Logger } from '@core/infrastructure/services';
import type {
  InvoiceType,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceFilters,
  LineItem,
} from '../../domain/types';

export class InvoiceRepository {
  async findAll(userId: string, filters?: InvoiceFilters): Promise<InvoiceType[]> {
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filters?.folderId !== undefined) {
        if (filters.folderId === null) {
          query = query.is('folder_id', null);
        } else {
          query = query.eq('folder_id', filters.folderId);
        }
      }

      if (filters?.searchQuery) {
        query = query.or(
          `invoice_number.ilike.%${filters.searchQuery}%,bill_to.ilike.%${filters.searchQuery}%,company_details.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters?.isFavorite !== undefined) {
        query = query.eq('is_favorite', filters.isFavorite);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      Logger.error('Error fetching invoices', error);
      throw new Error('Failed to fetch invoices');
    }
  }

  async findById(id: string, userId: string): Promise<InvoiceType | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
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
      Logger.error('Error fetching invoice', error);
      throw new Error('Failed to fetch invoice');
    }
  }

  async create(dto: CreateInvoiceDto): Promise<InvoiceType> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: dto.userId,
          folder_id: dto.folderId ?? null,
          invoice_number: dto.invoiceNumber,
          po_number: dto.poNumber ?? null,
          company_details: dto.companyDetails ?? null,
          bill_to: dto.billTo ?? null,
          invoice_date: dto.invoiceDate ?? null,
          due_date: dto.dueDate ?? null,
          currency: dto.currency ?? 'PHP',
          line_items: JSON.stringify(dto.lineItems ?? []),
          tax_rate: dto.taxRate ?? null,
          discount: dto.discount ?? null,
          shipping_fee: dto.shippingFee ?? null,
          subtotal: dto.subtotal ?? null,
          tax_amount: dto.taxAmount ?? null,
          total: dto.total ?? null,
          notes: dto.notes ?? null,
          bank_details: dto.bankDetails ?? null,
          storage_path: dto.storagePath ?? null,
          file_size: dto.fileSize ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error creating invoice', error);
      throw new Error('Failed to create invoice');
    }
  }

  async update(id: string, userId: string, dto: UpdateInvoiceDto): Promise<InvoiceType> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.folderId !== undefined) updateData.folder_id = dto.folderId;
      if (dto.invoiceNumber !== undefined) updateData.invoice_number = dto.invoiceNumber;
      if (dto.poNumber !== undefined) updateData.po_number = dto.poNumber;
      if (dto.companyDetails !== undefined) updateData.company_details = dto.companyDetails;
      if (dto.billTo !== undefined) updateData.bill_to = dto.billTo;
      if (dto.invoiceDate !== undefined) updateData.invoice_date = dto.invoiceDate;
      if (dto.dueDate !== undefined) updateData.due_date = dto.dueDate;
      if (dto.currency !== undefined) updateData.currency = dto.currency;
      if (dto.lineItems !== undefined) updateData.line_items = JSON.stringify(dto.lineItems);
      if (dto.taxRate !== undefined) updateData.tax_rate = dto.taxRate;
      if (dto.discount !== undefined) updateData.discount = dto.discount;
      if (dto.shippingFee !== undefined) updateData.shipping_fee = dto.shippingFee;
      if (dto.subtotal !== undefined) updateData.subtotal = dto.subtotal;
      if (dto.taxAmount !== undefined) updateData.tax_amount = dto.taxAmount;
      if (dto.total !== undefined) updateData.total = dto.total;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.bankDetails !== undefined) updateData.bank_details = dto.bankDetails;
      if (dto.storagePath !== undefined) updateData.storage_path = dto.storagePath;
      if (dto.fileSize !== undefined) updateData.file_size = dto.fileSize;
      if (dto.isFavorite !== undefined) updateData.is_favorite = dto.isFavorite;

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error updating invoice', error);
      throw new Error('Failed to update invoice');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      Logger.error('Error deleting invoice', error);
      throw new Error('Failed to delete invoice');
    }
  }

  private mapToEntity(data: Record<string, unknown>): InvoiceType {
    const rawLineItems = data.line_items;
    let lineItems: LineItem[] = [];
    if (typeof rawLineItems === 'string') {
      lineItems = JSON.parse(rawLineItems) as LineItem[];
    } else if (Array.isArray(rawLineItems)) {
      lineItems = rawLineItems as LineItem[];
    }

    return {
      id: data.id as string,
      userId: data.user_id as string,
      folderId: (data.folder_id as string) ?? null,
      invoiceNumber: data.invoice_number as string,
      poNumber: (data.po_number as string) ?? null,
      companyDetails: (data.company_details as string) ?? null,
      billTo: (data.bill_to as string) ?? null,
      invoiceDate: (data.invoice_date as string) ?? null,
      dueDate: (data.due_date as string) ?? null,
      currency: data.currency as string,
      lineItems,
      taxRate: data.tax_rate !== null ? Number(data.tax_rate) : null,
      discount: data.discount !== null ? Number(data.discount) : null,
      shippingFee: data.shipping_fee !== null ? Number(data.shipping_fee) : null,
      subtotal: data.subtotal !== null ? Number(data.subtotal) : null,
      taxAmount: data.tax_amount !== null ? Number(data.tax_amount) : null,
      total: data.total !== null ? Number(data.total) : null,
      notes: (data.notes as string) ?? null,
      bankDetails: (data.bank_details as string) ?? null,
      storagePath: (data.storage_path as string) ?? null,
      fileSize: data.file_size !== null ? Number(data.file_size) : null,
      isFavorite: data.is_favorite as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
