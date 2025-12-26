// Password Types
export interface PasswordType {
  id: string;
  title: string;
  username: string | null;
  password: string; // Decrypted password
  url: string | null;
  notes: string | null;
  categoryId: string | null;
  userId: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePasswordDto {
  title: string;
  username?: string | null;
  password: string;
  url?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  userId: string;
  isFavorite?: boolean;
}

export interface UpdatePasswordDto {
  title?: string;
  username?: string | null;
  password?: string;
  url?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  isFavorite?: boolean;
}

export interface PasswordFilters {
  categoryId?: string | null;
  searchQuery?: string;
  isFavorite?: boolean;
}

// Category Types
export interface CategoryType {
  id: string;
  name: string;
  icon: string | null;
  userId: string;
  passwordCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryDto {
  name: string;
  icon?: string | null;
  userId: string;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string | null;
}
