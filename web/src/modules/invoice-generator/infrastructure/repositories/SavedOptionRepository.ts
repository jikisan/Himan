import { supabase } from '@core/infrastructure/config/supabase';
import { Logger } from '@core/infrastructure/services';
import type {
  InvoiceSavedOptionType,
  SavedOptionType,
  CreateSavedOptionDto,
  UpdateSavedOptionDto,
} from '../../domain/types';

export class SavedOptionRepository {
  async findAll(userId: string): Promise<InvoiceSavedOptionType[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_saved_options')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      Logger.error('Error fetching saved options', error);
      throw new Error('Failed to fetch saved options');
    }
  }

  async findAllByType(
    userId: string,
    optionType: SavedOptionType
  ): Promise<InvoiceSavedOptionType[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_saved_options')
        .select('*')
        .eq('user_id', userId)
        .eq('option_type', optionType)
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapToEntity);
    } catch (error) {
      Logger.error('Error fetching saved options by type', error);
      throw new Error('Failed to fetch saved options');
    }
  }

  async create(dto: CreateSavedOptionDto): Promise<InvoiceSavedOptionType> {
    try {
      const { data, error } = await supabase
        .from('invoice_saved_options')
        .insert({
          user_id: dto.userId,
          option_type: dto.optionType,
          label: dto.label,
          value: dto.value,
          is_default: dto.isDefault ?? false,
          sort_order: dto.sortOrder ?? 0,
        })
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error creating saved option', error);
      throw new Error('Failed to create saved option');
    }
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateSavedOptionDto
  ): Promise<InvoiceSavedOptionType> {
    try {
      const { data, error } = await supabase
        .from('invoice_saved_options')
        .update({
          ...(dto.label !== undefined && { label: dto.label }),
          ...(dto.value !== undefined && { value: dto.value }),
          ...(dto.isDefault !== undefined && { is_default: dto.isDefault }),
          ...(dto.sortOrder !== undefined && { sort_order: dto.sortOrder }),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return this.mapToEntity(data);
    } catch (error) {
      Logger.error('Error updating saved option', error);
      throw new Error('Failed to update saved option');
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invoice_saved_options')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      Logger.error('Error deleting saved option', error);
      throw new Error('Failed to delete saved option');
    }
  }

  private mapToEntity(data: Record<string, unknown>): InvoiceSavedOptionType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      optionType: data.option_type as SavedOptionType,
      label: data.label as string,
      value: data.value as string,
      isDefault: data.is_default as boolean,
      sortOrder: data.sort_order as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
