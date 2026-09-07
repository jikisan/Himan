import { getSupabase } from '../../../../config/index.js';
import type {
  GroceryItemType,
  CreateGroceryItemDto,
  UpdateGroceryItemDto,
  GroceryItemFilters,
  CheckItemDto,
} from '../../domain/index.js';

export class GroceryItemRepository {
  async findAll(filters: GroceryItemFilters): Promise<GroceryItemType[]> {
    let query = getSupabase()
      .from('grocery_items')
      .select('*')
      .eq('list_id', filters.listId)
      .order('is_checked', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (filters.isChecked !== undefined) {
      query = query.eq('is_checked', filters.isChecked);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.searchQuery) {
      const sanitized = filters.searchQuery.replace(/[%_\\]/g, '\\$&');
      query = query.or(
        `name.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch grocery items: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async findById(id: string): Promise<GroceryItemType | null> {
    const { data, error } = await getSupabase()
      .from('grocery_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch grocery item: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async create(dto: CreateGroceryItemDto, userId: string): Promise<GroceryItemType> {
    const { data, error } = await getSupabase()
      .from('grocery_items')
      .insert({
        ...(dto.id ? { id: dto.id } : {}),
        list_id: dto.listId,
        name: dto.name,
        category: dto.category,
        quantity: dto.quantity ?? 1,
        unit: dto.unit,
        notes: dto.notes,
        product_id: dto.productId,
        added_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create grocery item: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, dto: UpdateGroceryItemDto): Promise<GroceryItemType> {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.unit !== undefined) updateData.unit = dto.unit;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.isChecked !== undefined) updateData.is_checked = dto.isChecked;
    if (dto.checkedBy !== undefined) updateData.checked_by = dto.checkedBy;
    if (dto.checkedAt !== undefined) updateData.checked_at = dto.checkedAt;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.sortOrder !== undefined) updateData.sort_order = dto.sortOrder;

    const { data, error } = await getSupabase()
      .from('grocery_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update grocery item: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async checkItem(id: string, dto: CheckItemDto): Promise<GroceryItemType> {
    const { data, error } = await getSupabase()
      .from('grocery_items')
      .update({
        is_checked: true,
        checked_by: dto.checkedBy,
        checked_at: new Date().toISOString(),
        price: dto.price ?? null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to check grocery item: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async uncheckItem(id: string): Promise<GroceryItemType> {
    const { data, error } = await getSupabase()
      .from('grocery_items')
      .update({
        is_checked: false,
        checked_by: null,
        checked_at: null,
        price: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to uncheck grocery item: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('grocery_items')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete grocery item: ${error.message}`);
    }
  }

  async clearChecked(listId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('grocery_items')
      .delete()
      .eq('list_id', listId)
      .eq('is_checked', true);

    if (error) {
      throw new Error(`Failed to clear checked items: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): GroceryItemType {
    return {
      id: data.id as string,
      listId: data.list_id as string,
      productId: data.product_id as string | null,
      name: data.name as string,
      category: data.category as string | null,
      quantity: Number(data.quantity),
      unit: data.unit as string | null,
      notes: data.notes as string | null,
      isChecked: data.is_checked as boolean,
      checkedBy: data.checked_by as string | null,
      checkedAt: data.checked_at
        ? new Date(data.checked_at as string)
        : null,
      price: data.price !== null ? Number(data.price) : null,
      addedBy: data.added_by as string,
      sortOrder: data.sort_order as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
