import { getSupabase } from '../../../../config/index.js';
import type {
  ProductType,
  CreateProductDto,
  UpdateProductDto,
  ProductFilters,
} from '../../domain/index.js';

export class ProductCatalogRepository {
  async findAll(userId: string, filters?: ProductFilters): Promise<ProductType[]> {
    let query = getSupabase()
      .from('product_catalog')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_count', { ascending: false })
      .order('name', { ascending: true });

    if (filters?.searchQuery) {
      const sanitized = filters.searchQuery.replace(/[%_\\]/g, '\\$&');
      query = query.or(`name.ilike.%${sanitized}%,brand.ilike.%${sanitized}%`);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.favorite) {
      query = query.eq('is_favorite', true);
    }

    if (filters?.barcode) {
      query = query.eq('barcode', filters.barcode);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    return (data || []).map((row) => this.mapToEntity(row));
  }

  async findByName(userId: string, name: string): Promise<ProductType | null> {
    const { data, error } = await getSupabase()
      .from('product_catalog')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', name)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find product: ${error.message}`);
    }

    return data ? this.mapToEntity(data) : null;
  }

  async upsert(userId: string, dto: CreateProductDto): Promise<ProductType> {
    // Try to find existing product by name (case-insensitive)
    const existing = await this.findByName(userId, dto.name);

    if (existing) {
      // Update with any new values
      const updateData: Record<string, unknown> = {};
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.brand !== undefined) updateData.brand = dto.brand;
      if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
      if (dto.packageSize !== undefined) updateData.package_size = dto.packageSize;
      if (dto.imagePath !== undefined) updateData.image_path = dto.imagePath;
      if (dto.notes !== undefined) updateData.notes = dto.notes;
      if (dto.isFavorite !== undefined) updateData.is_favorite = dto.isFavorite;
      if (dto.defaultQuantity !== undefined) updateData.default_quantity = dto.defaultQuantity;
      if (dto.defaultUnit !== undefined) updateData.default_unit = dto.defaultUnit;
      if (dto.lifespanDays !== undefined) updateData.lifespan_days = dto.lifespanDays;

      if (Object.keys(updateData).length > 0) {
        const { data, error } = await getSupabase()
          .from('product_catalog')
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update product: ${error.message}`);
        }

        return this.mapToEntity(data);
      }

      return existing;
    }

    // Create new product
    const { data, error } = await getSupabase()
      .from('product_catalog')
      .insert({
        ...(dto.id ? { id: dto.id } : {}),
        user_id: userId,
        name: dto.name,
        category: dto.category,
        brand: dto.brand,
        barcode: dto.barcode,
        package_size: dto.packageSize,
        image_path: dto.imagePath,
        notes: dto.notes,
        is_favorite: dto.isFavorite ?? false,
        default_quantity: dto.defaultQuantity ?? 1,
        default_unit: dto.defaultUnit,
        lifespan_days: dto.lifespanDays,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create product: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async findByBarcode(userId: string, barcode: string): Promise<ProductType | null> {
    const { data, error } = await getSupabase()
      .from('product_catalog')
      .select('*')
      .eq('user_id', userId)
      .eq('barcode', barcode)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find product by barcode: ${error.message}`);
    }

    return data ? this.mapToEntity(data) : null;
  }

  async toggleFavorite(id: string, isFavorite: boolean): Promise<ProductType> {
    const { data, error } = await getSupabase()
      .from('product_catalog')
      .update({ is_favorite: isFavorite })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to toggle favorite: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductType> {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.brand !== undefined) updateData.brand = dto.brand;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.packageSize !== undefined) updateData.package_size = dto.packageSize;
    if (dto.imagePath !== undefined) updateData.image_path = dto.imagePath;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.isFavorite !== undefined) updateData.is_favorite = dto.isFavorite;
    if (dto.defaultQuantity !== undefined) updateData.default_quantity = dto.defaultQuantity;
    if (dto.defaultUnit !== undefined) updateData.default_unit = dto.defaultUnit;
    if (dto.lifespanDays !== undefined) updateData.lifespan_days = dto.lifespanDays;

    const { data, error } = await getSupabase()
      .from('product_catalog')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update product: ${error.message}`);
    }

    return this.mapToEntity(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('product_catalog')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete product: ${error.message}`);
    }
  }

  async getCategories(userId: string): Promise<string[]> {
    const { data, error } = await getSupabase()
      .from('product_catalog')
      .select('category')
      .eq('user_id', userId)
      .not('category', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }

    const categories = new Set(
      (data || []).map((row) => row.category as string)
    );
    return Array.from(categories).sort();
  }

  private mapToEntity(data: Record<string, unknown>): ProductType {
    return {
      id: data.id as string,
      userId: data.user_id as string,
      name: data.name as string,
      category: data.category as string | null,
      brand: (data.brand as string | null) ?? null,
      barcode: (data.barcode as string | null) ?? null,
      packageSize: (data.package_size as string | null) ?? null,
      imagePath: (data.image_path as string | null) ?? null,
      notes: (data.notes as string | null) ?? null,
      isFavorite: (data.is_favorite as boolean) ?? false,
      defaultQuantity: Number(data.default_quantity),
      defaultUnit: data.default_unit as string | null,
      lifespanDays: data.lifespan_days as number | null,
      lastPurchasedAt: data.last_purchased_at
        ? new Date(data.last_purchased_at as string)
        : null,
      purchaseCount: data.purchase_count as number,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
