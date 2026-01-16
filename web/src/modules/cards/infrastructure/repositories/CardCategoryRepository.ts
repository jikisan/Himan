import { supabase } from '@core/infrastructure/config/supabase';
import type {
  CardCategoryType,
  CreateCardCategoryDto,
  UpdateCardCategoryDto,
} from '../../domain';

export class CardCategoryRepository {
  async findAll(userId: string): Promise<CardCategoryType[]> {
    // First, get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('card_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (categoriesError) {
      throw new Error(`Failed to fetch card categories: ${categoriesError.message}`);
    }

    // Then get card counts for each category
    const categoriesWithCounts = await Promise.all(
      (categories || []).map(async (category) => {
        const { count, error: countError } = await supabase
          .from('credit_cards')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.id);

        if (countError) {
          console.error('Failed to fetch card count:', countError);
        }

        return this.mapToEntity({ ...category, card_count: count || 0 });
      })
    );

    return categoriesWithCounts;
  }

  async findAllWithCounts(userId: string): Promise<CardCategoryType[]> {
    return this.findAll(userId);
  }

  async findById(id: string, userId: string): Promise<CardCategoryType | null> {
    const { data, error } = await supabase
      .from('card_categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch card category: ${error.message}`);
    }

    // Get card count
    const { count } = await supabase
      .from('credit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    return this.mapToEntity({ ...data, card_count: count || 0 });
  }

  async create(dto: CreateCardCategoryDto): Promise<CardCategoryType> {
    const { data, error } = await supabase
      .from('card_categories')
      .insert({
        name: dto.name,
        icon: dto.icon,
        user_id: dto.userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create card category: ${error.message}`);
    }

    return this.mapToEntity({ ...data, card_count: 0 });
  }

  async update(id: string, dto: UpdateCardCategoryDto): Promise<CardCategoryType> {
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.icon !== undefined) updateData.icon = dto.icon;

    const { data, error } = await supabase
      .from('card_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update card category: ${error.message}`);
    }

    // Get card count
    const { count } = await supabase
      .from('credit_cards')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    return this.mapToEntity({ ...data, card_count: count || 0 });
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('card_categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete card category: ${error.message}`);
    }
  }

  private mapToEntity(data: Record<string, unknown>): CardCategoryType {
    return {
      id: data.id as string,
      name: data.name as string,
      icon: data.icon as string | null,
      userId: data.user_id as string,
      cardCount: data.card_count as number | undefined,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}