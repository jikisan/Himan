import { getSupabase } from '../../../../config/index.js';
import type { ProductStoreType, UpsertProductStoreDto } from '../../domain/index.js';

export class ProductStoreRepository {
  async findByProduct(productId: string): Promise<ProductStoreType[]> {
    const { data, error } = await getSupabase()
      .from('product_stores')
      .select('*')
      .eq('product_id', productId);

    if (error) {
      throw new Error(`Failed to fetch product stores: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async findByStore(storeId: string): Promise<ProductStoreType[]> {
    const { data, error } = await getSupabase()
      .from('product_stores')
      .select('*')
      .eq('store_id', storeId);

    if (error) {
      throw new Error(`Failed to fetch store products: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async upsert(dto: UpsertProductStoreDto): Promise<ProductStoreType> {
    const row: Record<string, unknown> = {
      product_id: dto.productId,
      store_id: dto.storeId,
    };
    if (dto.price !== undefined) row.price = dto.price;
    if (dto.aisle !== undefined) row.aisle = dto.aisle;
    if (dto.availability !== undefined) row.availability = dto.availability;
    if (dto.sku !== undefined) row.sku = dto.sku;

    const { data, error } = await getSupabase()
      .from('product_stores')
      .upsert(row, { onConflict: 'product_id,store_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert product store: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(productId: string, storeId: string): Promise<void> {
    const { error } = await getSupabase()
      .from('product_stores')
      .delete()
      .eq('product_id', productId)
      .eq('store_id', storeId);

    if (error) {
      throw new Error(`Failed to delete product store: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): ProductStoreType {
    return {
      id: data.id as string,
      productId: data.product_id as string,
      storeId: data.store_id as string,
      price: data.price != null ? Number(data.price) : null,
      aisle: (data.aisle as string | null) ?? null,
      availability: (data.availability as boolean) ?? true,
      sku: (data.sku as string | null) ?? null,
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
