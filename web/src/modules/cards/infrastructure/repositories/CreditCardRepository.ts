import { supabase } from '@core/infrastructure/config/supabase';
import type {
  CreditCardType,
  CreateCreditCardDto,
  UpdateCreditCardDto,
  CreditCardFilters,
} from '../../domain';
import { CardEncryptionService } from '../services';
import { Logger } from '@core/infrastructure/services';

export class CreditCardRepository {
  async findAll(filters?: CreditCardFilters, userId?: string): Promise<CreditCardType[]> {
    let query = supabase
      .from('credit_cards')
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
        `card_name.ilike.%${sanitized}%,bank_name.ilike.%${sanitized}%,card_issuer.ilike.%${sanitized}%`
      );
    }

    if (filters?.isFavorite !== undefined) {
      query = query.eq('is_favorite', filters.isFavorite);
    }

    if (filters?.cardType) {
      query = query.eq('card_type', filters.cardType);
    }

    if (filters?.cardIssuer) {
      query = query.eq('card_issuer', filters.cardIssuer);
    }

    if (filters?.expiringSoon) {
      const now = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(now.getMonth() + 3);
      query = query
        .lte('expiry_year', threeMonthsLater.getFullYear())
        .gte('expiry_year', now.getFullYear());
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch credit cards: ${error.message}`);
    }

    // Decrypt cards before returning
    const decryptedCards = await Promise.all(
      (data || []).map(async (item) => {
        const decrypted = await this.mapToEntity(item, userId);
        return decrypted;
      })
    );

    return decryptedCards;
  }

  async findById(id: string, userId?: string): Promise<CreditCardType | null> {
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch credit card: ${error.message}`);
    }

    return this.mapToEntity(data, userId);
  }

  async create(dto: CreateCreditCardDto): Promise<CreditCardType> {
    // Encrypt card number and CVV before storing
    const encryptedCardNumber = await CardEncryptionService.encrypt(
      dto.cardNumber,
      dto.userId
    );
    const encryptedCvv = await CardEncryptionService.encrypt(
      dto.cvv,
      dto.userId
    );

    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        card_name: dto.cardName,
        encrypted_card_number: encryptedCardNumber,
        encrypted_cvv: encryptedCvv,
        expiry_month: dto.expiryMonth,
        expiry_year: dto.expiryYear,
        bank_name: dto.bankName,
        card_issuer: dto.cardIssuer,
        card_type: dto.cardType,
        category_id: dto.categoryId,
        user_id: dto.userId,
        is_favorite: dto.isFavorite ?? false,
        notes: dto.notes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create credit card: ${error.message}`);
    }

    return this.mapToEntity(data, dto.userId);
  }

  async update(id: string, dto: UpdateCreditCardDto, userId?: string): Promise<CreditCardType> {
    const updateData: Record<string, unknown> = {};

    if (dto.cardName !== undefined) updateData.card_name = dto.cardName;
    if (dto.expiryMonth !== undefined) updateData.expiry_month = dto.expiryMonth;
    if (dto.expiryYear !== undefined) updateData.expiry_year = dto.expiryYear;
    if (dto.bankName !== undefined) updateData.bank_name = dto.bankName;
    if (dto.cardIssuer !== undefined) updateData.card_issuer = dto.cardIssuer;
    if (dto.cardType !== undefined) updateData.card_type = dto.cardType;
    if (dto.categoryId !== undefined) updateData.category_id = dto.categoryId;
    if (dto.isFavorite !== undefined) updateData.is_favorite = dto.isFavorite;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // Encrypt new card number if provided
    if (dto.cardNumber !== undefined && userId) {
      const encryptedCardNumber = await CardEncryptionService.encrypt(
        dto.cardNumber,
        userId
      );
      updateData.encrypted_card_number = encryptedCardNumber;
    }

    // Encrypt new CVV if provided
    if (dto.cvv !== undefined && userId) {
      const encryptedCvv = await CardEncryptionService.encrypt(
        dto.cvv,
        userId
      );
      updateData.encrypted_cvv = encryptedCvv;
    }

    const { data, error } = await supabase
      .from('credit_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update credit card: ${error.message}`);
    }

    return this.mapToEntity(data, userId);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete credit card: ${error.message}`);
    }
  }

  private async mapToEntity(data: Record<string, unknown>, userId?: string): Promise<CreditCardType> {
    // Decrypt card number and CVV
    let decryptedCardNumber = '';
    let decryptedCvv = '';

    if (userId) {
      if (data.encrypted_card_number) {
        try {
          decryptedCardNumber = await CardEncryptionService.decrypt(
            data.encrypted_card_number as string,
            userId
          );
        } catch (error) {
          Logger.error('Failed to decrypt card number', error);
          decryptedCardNumber = '[Decryption Failed]';
        }
      }

      if (data.encrypted_cvv) {
        try {
          decryptedCvv = await CardEncryptionService.decrypt(
            data.encrypted_cvv as string,
            userId
          );
        } catch (error) {
          Logger.error('Failed to decrypt CVV', error);
          decryptedCvv = '[Decryption Failed]';
        }
      }
    }

    return {
      id: data.id as string,
      cardName: data.card_name as string,
      cardNumber: decryptedCardNumber,
      cvv: decryptedCvv,
      expiryMonth: data.expiry_month as number,
      expiryYear: data.expiry_year as number,
      bankName: data.bank_name as string | null,
      cardIssuer: data.card_issuer as string | null,
      cardType: data.card_type as string | null,
      categoryId: data.category_id as string | null,
      userId: data.user_id as string,
      isFavorite: data.is_favorite as boolean,
      notes: data.notes as string | null,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}