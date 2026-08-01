// Grocery list
export interface GroceryListType {
  id: string;
  name: string;
  ownerId: string;
  isArchived: boolean;
  memberCount: number;
  itemCount: number;
  uncheckedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Grocery item
export interface GroceryItemType {
  id: string;
  listId: string;
  productId: string | null;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  isChecked: boolean;
  checkedBy: string | null;
  checkedAt: Date | null;
  price: number | null;
  addedBy: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Session item (snapshot of a grocery item at session start)
export interface SessionItemType {
  id: string;
  sessionId: string;
  groceryItemId: string | null;
  productId: string | null;
  listName: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  isPurchased: boolean;
  purchasedAt: Date | null;
  price: number | null; // estimated / snapshot price
  pricePaid: number | null;
  quantityPurchased: number | null;
  aisle: string | null;
  storeId: string | null;
}

// Grocery session
export interface GrocerySessionType {
  id: string;
  name: string | null;
  startedBy: string;
  storeName: string | null;
  storeId: string | null;
  status: 'active' | 'completed';
  startedAt: Date;
  completedAt: Date | null;
  items: SessionItemType[];
  members: SessionMemberType[];
}

// Store
export interface StoreType {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// Per-store product info
export interface ProductStoreType {
  id: string;
  productId: string;
  storeId: string;
  price: number | null;
  aisle: string | null;
  availability: boolean;
  sku: string | null;
  updatedAt: Date;
}

// User preferences (currency etc.)
export interface UserPreferencesType {
  userId: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

// Product catalog
export interface ProductType {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  brand: string | null;
  barcode: string | null;
  packageSize: string | null;
  imagePath: string | null;
  notes: string | null;
  isFavorite: boolean;
  defaultQuantity: number;
  defaultUnit: string | null;
  lifespanDays: number | null;
  lastPurchasedAt: Date | null;
  purchaseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Invitation
export interface GroceryInvitationType {
  id: string;
  listId: string;
  listName?: string;
  invitedBy: string;
  invitedByEmail?: string;
  invitedEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

// Member
export interface GroceryListMemberType {
  id: string;
  listId: string;
  userId: string;
  role: 'owner' | 'editor';
  invitedBy: string | null;
  joinedAt: Date;
  email?: string;
}

// Session member
export interface SessionMemberType {
  id: string;
  sessionId: string;
  userId: string;
  addedBy: string;
  joinedAt: Date;
  email?: string;
}

// Session presence
export interface SessionPresence {
  userId: string;
  displayName: string;
  onlineAt: string;
}

// DTOs
export interface CreateGroceryListDto {
  id?: string; // client-generated for offline
  name: string;
}

export interface UpdateGroceryListDto {
  name?: string;
  isArchived?: boolean;
}

export interface CreateGroceryItemDto {
  id?: string; // client-generated for offline
  listId: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  productId?: string;
}

export interface UpdateGroceryItemDto {
  name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  isChecked?: boolean;
  checkedBy?: string | null;
  checkedAt?: Date | null;
  price?: number | null;
  sortOrder?: number;
}

export interface CheckItemDto {
  checkedBy: string;
  price?: number | null;
}

export interface CreateGrocerySessionDto {
  id?: string; // client-generated for offline
  listIds: string[];
  storeName: string;
  name?: string;
  storeId?: string | null;
}

export interface AddSessionMemberDto {
  sessionId: string;
  email: string;
}

export interface UpdateSessionItemDto {
  name?: string;
  category?: string | null;
  quantity?: number;
  unit?: string | null;
  notes?: string | null;
  isPurchased?: boolean;
  purchasedAt?: Date | string | null;
  price?: number | null;
  pricePaid?: number | null;
  quantityPurchased?: number | null;
  aisle?: string | null;
  storeId?: string | null;
}

export interface AddSessionItemDto {
  id?: string; // client-generated for offline
  name: string;
  sessionId: string;
  listName?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  productId?: string;
  storeId?: string | null;
  aisle?: string;
}

export interface CreateProductDto {
  id?: string; // client-generated for offline
  name: string;
  category?: string;
  brand?: string;
  barcode?: string;
  packageSize?: string;
  imagePath?: string;
  notes?: string;
  isFavorite?: boolean;
  defaultQuantity?: number;
  defaultUnit?: string;
  lifespanDays?: number;
}

export interface UpdateProductDto {
  name?: string;
  category?: string;
  brand?: string;
  barcode?: string;
  packageSize?: string;
  imagePath?: string;
  notes?: string;
  isFavorite?: boolean;
  defaultQuantity?: number;
  defaultUnit?: string;
  lifespanDays?: number;
}

export interface CreateStoreDto {
  id?: string; // client-generated for offline
  name: string;
}

export interface UpdateStoreDto {
  name?: string;
}

export interface UpsertProductStoreDto {
  productId: string;
  storeId: string;
  price?: number | null;
  aisle?: string | null;
  availability?: boolean;
  sku?: string | null;
}

export interface UpdateUserPreferencesDto {
  currency?: string;
}

// Filters
export interface GroceryItemFilters {
  listId: string;
  isChecked?: boolean;
  category?: string;
  searchQuery?: string;
}

export interface ProductFilters {
  searchQuery?: string;
  category?: string;
  favorite?: boolean;
  barcode?: string;
  minPrice?: number;
  maxPrice?: number;
}

// Suggestion types
export interface ItemSuggestion {
  product: ProductType;
  reason: 'running_low' | 'frequently_bought' | 'recently_bought';
  confidence: number;
  estimatedDepletionDate: Date | null;
}
