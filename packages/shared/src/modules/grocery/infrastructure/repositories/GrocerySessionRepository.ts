import { getSupabase } from '../../../../config/index.js';
import type {
  GrocerySessionType,
  SessionItemType,
  CreateGrocerySessionDto,
  UpdateSessionItemDto,
} from '../../domain/index.js';

export class GrocerySessionRepository {
  async findActiveForUser(userId: string): Promise<GrocerySessionType | null> {
    const { data, error } = await getSupabase()
      .from('grocery_sessions')
      .select('*, grocery_session_items(*)')
      .eq('started_by', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch active session: ${error.message}`);
    }

    return data ? this.mapToEntity(data) : null;
  }

  async findByUserId(userId: string): Promise<GrocerySessionType[]> {
    const { data, error } = await getSupabase()
      .from('grocery_sessions')
      .select('*, grocery_session_items(*)')
      .eq('started_by', userId)
      .order('started_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async getRecentStoreNames(userId: string, limit = 5): Promise<string[]> {
    const { data, error } = await getSupabase()
      .from('grocery_sessions')
      .select('store_name')
      .eq('started_by', userId)
      .not('store_name', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch recent stores: ${error.message}`);
    }

    const seen = new Set<string>();
    return (data || [])
      .map((row) => row.store_name as string)
      .filter((name) => {
        const lower = name.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
  }

  async create(dto: CreateGrocerySessionDto, userId: string): Promise<GrocerySessionType> {
    const supabase = getSupabase();

    // 1. Create the session
    const { data: session, error: sessionError } = await supabase
      .from('grocery_sessions')
      .insert({
        started_by: userId,
        store_name: dto.storeName,
        status: 'active',
      })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // 2. Fetch items from selected lists with list names
    const { data: listData, error: listError } = await supabase
      .from('grocery_lists')
      .select('id, name')
      .in('id', dto.listIds);

    if (listError) {
      throw new Error(`Failed to fetch lists: ${listError.message}`);
    }

    const listNameMap = new Map(
      (listData || []).map((l) => [l.id as string, l.name as string])
    );

    const { data: items, error: itemsError } = await supabase
      .from('grocery_items')
      .select('*')
      .in('list_id', dto.listIds)
      .eq('is_checked', false)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to fetch items: ${itemsError.message}`);
    }

    // 3. Snapshot items into session_items
    const sessionItems = (items || []).map((item) => ({
      session_id: session.id,
      grocery_item_id: item.id,
      list_name: listNameMap.get(item.list_id as string) ?? 'Unknown',
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes,
      is_purchased: false,
    }));

    let insertedItems: SessionItemType[] = [];

    if (sessionItems.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('grocery_session_items')
        .insert(sessionItems)
        .select();

      if (insertError) {
        throw new Error(`Failed to create session items: ${insertError.message}`);
      }

      insertedItems = (inserted || []).map((row) => this.mapSessionItem(row));
    }

    return {
      ...this.mapSessionRow(session),
      items: insertedItems,
    };
  }

  async complete(id: string): Promise<GrocerySessionType> {
    const { data, error } = await getSupabase()
      .from('grocery_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*, grocery_session_items(*)')
      .single();

    if (error) {
      throw new Error(`Failed to complete session: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async cancel(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('grocery_sessions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to cancel session: ${error.message}`);
    }
  }

  async updateSessionItem(
    id: string,
    dto: UpdateSessionItemDto
  ): Promise<SessionItemType> {
    const updateData: Record<string, unknown> = {};

    if (dto.isPurchased !== undefined) updateData.is_purchased = dto.isPurchased;
    if (dto.purchasedAt !== undefined)
      updateData.purchased_at = dto.purchasedAt?.toISOString() ?? null;
    if (dto.price !== undefined) updateData.price = dto.price;

    const { data, error } = await getSupabase()
      .from('grocery_session_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session item: ${error.message}`);
    }

    return this.mapSessionItem(data);
  }

  private mapToEntity(data: Record<string, unknown>): GrocerySessionType {
    const sessionItems = data.grocery_session_items as Array<Record<string, unknown>> | undefined;

    return {
      ...this.mapSessionRow(data),
      items: (sessionItems || []).map((row) => this.mapSessionItem(row)),
    };
  }

  private mapSessionRow(data: Record<string, unknown>): Omit<GrocerySessionType, 'items'> {
    return {
      id: data.id as string,
      startedBy: data.started_by as string,
      storeName: data.store_name as string | null,
      status: data.status as 'active' | 'completed',
      startedAt: new Date(data.started_at as string),
      completedAt: data.completed_at
        ? new Date(data.completed_at as string)
        : null,
    };
  }

  private mapSessionItem(data: Record<string, unknown>): SessionItemType {
    return {
      id: data.id as string,
      sessionId: data.session_id as string,
      groceryItemId: data.grocery_item_id as string | null,
      listName: data.list_name as string,
      name: data.name as string,
      category: (data.category as string | null) ?? null,
      quantity: Number(data.quantity ?? 1),
      unit: (data.unit as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
      isPurchased: (data.is_purchased as boolean) ?? false,
      purchasedAt: data.purchased_at
        ? new Date(data.purchased_at as string)
        : null,
      price: data.price != null ? Number(data.price) : null,
    };
  }
}
