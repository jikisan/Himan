import { getSupabase } from '../../../../config/index.js';
import type {
  PasswordType,
  CreatePasswordDto,
  UpdatePasswordDto,
  PasswordFilters,
} from '../../domain';
import { EncryptionService } from '../services';
import { getLogger } from '../../../../services/index.js';

export class PasswordRepository {
  async findAll(filters?: PasswordFilters, userId?: string): Promise<PasswordType[]> {
    let query = getSupabase()
      .from('passwords')
      .select('*')
      .order('is_favorite', { ascending: false })
      .order('updated_at', { ascending: false });

    if (filters?.categoryId !== undefined) {
      if (filters.categoryId === null) {
        query = query.is('category_id', null);
      } else {
        query = query.eq('category_id', filters.categoryId);
      }
    }

    if (filters?.searchQuery) {
      // Sanitize search query to prevent SQL injection
      const sanitized = filters.searchQuery.replace(/[%_\\]/g, '\\$&');
      query = query.or(
        `title.ilike.%${sanitized}%,username.ilike.%${sanitized}%,url.ilike.%${sanitized}%`
      );
    }

    if (filters?.isFavorite !== undefined) {
      query = query.eq('is_favorite', filters.isFavorite);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch passwords: ${error.message}`);
    }

    // Decrypt passwords before returning
    const decryptedPasswords = await Promise.all(
      (data || []).map(async (item) => {
        const decrypted = await this.mapToEntity(item, userId);
        return decrypted;
      })
    );

    return decryptedPasswords;
  }

  async findById(id: string, userId?: string): Promise<PasswordType | null> {
    const { data, error } = await getSupabase()
      .from('passwords')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch password: ${error.message}`);
    }

    return this.mapToEntity(data, userId);
  }

  async create(dto: CreatePasswordDto): Promise<PasswordType> {
    // Encrypt password before storing
    const encryptedPassword = await EncryptionService.encrypt(
      dto.password,
      dto.userId
    );

    const { data, error } = await getSupabase()
      .from('passwords')
      .insert({
        title: dto.title,
        username: dto.username,
        encrypted_password: encryptedPassword,
        url: dto.url,
        notes: dto.notes,
        category_id: dto.categoryId,
        user_id: dto.userId,
        is_favorite: dto.isFavorite ?? false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create password: ${error.message}`);
    }

    return this.mapToEntity(data, dto.userId);
  }

  async update(id: string, dto: UpdatePasswordDto, userId?: string): Promise<PasswordType> {
    const updateData: Record<string, unknown> = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.url !== undefined) updateData.url = dto.url;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.categoryId !== undefined) updateData.category_id = dto.categoryId;
    if (dto.isFavorite !== undefined) updateData.is_favorite = dto.isFavorite;

    // Encrypt new password if provided
    if (dto.password !== undefined && userId) {
      const encryptedPassword = await EncryptionService.encrypt(
        dto.password,
        userId
      );
      updateData.encrypted_password = encryptedPassword;
    }

    const { data, error } = await getSupabase()
      .from('passwords')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }

    return this.mapToEntity(data, userId);
  }

  async delete(id: string): Promise<void> {
    const { error } = await getSupabase().from('passwords').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete password: ${error.message}`);
    }
  }

  private async mapToEntity(data: Record<string, unknown>, userId?: string): Promise<PasswordType> {
    // Decrypt password
    let decryptedPassword = '';
    if (userId && data.encrypted_password) {
      try {
        decryptedPassword = await EncryptionService.decrypt(
          data.encrypted_password as string,
          userId
        );
      } catch (error) {
        getLogger().error('Failed to decrypt password', error);
        decryptedPassword = '[Decryption Failed]';
      }
    }

    return {
      id: data.id as string,
      title: data.title as string,
      username: data.username as string | null,
      password: decryptedPassword,
      url: data.url as string | null,
      notes: data.notes as string | null,
      categoryId: data.category_id as string | null,
      userId: data.user_id as string,
      isFavorite: data.is_favorite as boolean,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
