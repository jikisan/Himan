// Credit Card Types
export interface CreditCardType {
  id: string;
  cardName: string;
  cardNumber: string; // Decrypted in memory
  cvv: string; // Decrypted in memory
  expiryMonth: number;
  expiryYear: number;
  bankName: string | null;
  cardIssuer: string | null;
  cardType: string | null;
  categoryId: string | null;
  userId: string;
  isFavorite: boolean;
  notes: string | null;
  dueDay: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCreditCardDto {
  cardName: string;
  cardNumber: string;
  cvv: string;
  expiryMonth: number;
  expiryYear: number;
  bankName?: string | null;
  cardIssuer?: string | null;
  cardType?: string | null;
  categoryId?: string | null;
  userId: string;
  isFavorite?: boolean;
  notes?: string | null;
  dueDay?: number | null;
}

export interface UpdateCreditCardDto {
  cardName?: string;
  cardNumber?: string;
  cvv?: string;
  expiryMonth?: number;
  expiryYear?: number;
  bankName?: string | null;
  cardIssuer?: string | null;
  cardType?: string | null;
  categoryId?: string | null;
  isFavorite?: boolean;
  notes?: string | null;
  dueDay?: number | null;
}

export interface CreditCardFilters {
  categoryId?: string | null;
  searchQuery?: string;
  isFavorite?: boolean;
  cardType?: string;
  cardIssuer?: string;
  expiringSoon?: boolean;
}

// Category Types
export interface CardCategoryType {
  id: string;
  name: string;
  icon: string | null;
  userId: string;
  cardCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCardCategoryDto {
  name: string;
  icon?: string | null;
  userId: string;
}

export interface UpdateCardCategoryDto {
  name?: string;
  icon?: string | null;
}