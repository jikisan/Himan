import { getSupabase } from '../../../../config/index.js';
import type {
  CategoryType,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../../domain';

export class CategoryRepository {
  async findAll(userId: string): Promise<CategoryType[]> {
    // First, get all categories
    const { data: categories, error: categoriesError } = await getSupabase()
      .from('password_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }

    // Then get password counts for each category
    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (category) => {
        const { count, error: countError } = await getSupabase()
          .from('passwords')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id);

        if (countError) {
          console.error('Failed to fetch password count:', countError);
        }

        return this.mapToEntity({ ...category, password_count: count || 0 });
      })
    );

    return categoriesWithCounts;
  }

  async findById(id: string): Promise<CategoryType | null> {
    const { data, error } = await getSupabase()
      .from('password_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch category: ${error.message}`);
    }

    // Get password count
    const { count } = await getSupabase()
      .from('passwords')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    return this.mapToEntity({ ...data, password_count: count || 0 });
  }

  async create(dto: CreateCategoryDto): Promise<CategoryType> {
    const { data, error } = await getSupabase()
      .from('password_categories')
      .insert({
        name: dto.name,
        icon: dto.icon,
        user_id: dto.userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create category: ${error.message}`);
    }

    return this.mapToEntity({ ...data, password_count: 0 });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryType> {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.icon !== undefined) updateData.icon = dto.icon;

    const { data, error } = await getSupabase()
      .from('password_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update category: ${error.message}`);
    }

    // Get password count
    const { count } = await getSupabase()
      .from('passwords')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    return this.mapToEntity({ ...data, password_count: count || 0 });
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from('password_categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): CategoryType {
    return {
      id: data.id as string,
      name: data.name as string,
      icon: data.icon as string | null,
      userId: data.user_id as string,
      passwordCount: data.password_count as number | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
