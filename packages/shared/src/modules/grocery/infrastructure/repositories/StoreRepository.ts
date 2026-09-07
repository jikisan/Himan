import { getSupabase } from '../../../../config/index.js';
import type { StoreType, CreateStoreDto, UpdateStoreDto } from '../../domain/index.js';

export class StoreRepository {
  async findAll(userId: string): Promise<StoreType[]> {
    const { data, error } = await getSupabase()
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch stores: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async create(dto: CreateStoreDto, userId: string): Promise<StoreType> {
    const { data, error } = await getSupabase()
      .from('stores')
      .insert({
        ...(dto.id ? { id: dto.id } : {}),
        user_id: userId,
        name: dto.name.trim(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create store: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  /** Find an existing store by name (case-insensitive) or create it. */
  async upsert(dto: CreateStoreDto, userId: string): Promise<StoreType> {
    const { data: existing, error: findError } = await getSupabase()
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', dto.name.trim())
      .maybeSingle();

    if (findError) {
      throw new Error(`Failed to find store: ${findError.message}`);
    }

    if (existing) return this.mapToEntity(existing);
    return this.create(dto, userId);
  }

  async update(id: string, dto: UpdateStoreDto): Promise<StoreType> {
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();

    const { data, error } = await getSupabase()
      .from('stores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update store: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase().from('stores').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete store: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): StoreType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
