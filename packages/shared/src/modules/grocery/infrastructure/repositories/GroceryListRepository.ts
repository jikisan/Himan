import { getSupabase } from '../../../../config/index.js';
import type {
  GroceryListType,
  CreateGroceryListDto,
  UpdateGroceryListDto,
} from '../../domain/index.js';

export class GroceryListRepository {
  async findAll(_userId: string): Promise<GroceryListType[]> {
    const { data, error } = await getSupabase()
      .from('grocery_lists')
      .select(`
        *,
        grocery_list_members(count),
        grocery_items(count)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch grocery lists: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async findById(id: string): Promise<GroceryListType | null> {
    const { data, error } = await getSupabase()
      .from('grocery_lists')
      .select(`
        *,
        grocery_list_members(count),
        grocery_items(count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch grocery list: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async create(dto: CreateGroceryListDto, userId: string): Promise<GroceryListType> {
    const { data, error } = await getSupabase()
      .from('grocery_lists')
      .insert({
        name: dto.name,
        owner_id: userId,
      })
      .select(`
        *,
        grocery_list_members(count),
        grocery_items(count)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create grocery list: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, dto: UpdateGroceryListDto): Promise<GroceryListType> {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isArchived !== undefined) updateData.is_archived = dto.isArchived;

    const { data, error } = await getSupabase()
      .from('grocery_lists')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        grocery_list_members(count),
        grocery_items(count)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update grocery list: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('grocery_lists')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete grocery list: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): GroceryListType {
    const members = data.grocery_list_members as Array<{ count: number }> | undefined;
    const items = data.grocery_items as Array<{ count: number }> | undefined;

    const memberCount = members?.[0]?.count ?? 1;
    const itemCount = items?.[0]?.count ?? 0;

    return {
      id: data.id as string,
      name: data.name as string,
      ownerId: data.owner_id as string,
      isArchived: data.is_archived as boolean,
      memberCount,
      itemCount,
      uncheckedCount: itemCount,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
