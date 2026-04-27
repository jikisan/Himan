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
  listName: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  notes: string | null;
  isPurchased: boolean;
  purchasedAt: Date | null;
  price: number | null;
}

// Grocery session
export interface GrocerySessionType {
  id: string;
  startedBy: string;
  storeName: string | null;
  status: 'active' | 'completed';
  startedAt: Date;
  completedAt: Date | null;
  items: SessionItemType[];
  members: SessionMemberType[];
}

// Product catalog
export interface ProductType {
  id: string;
  userId: string;
  name: string;
  category: string | null;
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
  name: string;
}

export interface UpdateGroceryListDto {
  name?: string;
  isArchived?: boolean;
}

export interface CreateGroceryItemDto {
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
  listIds: string[];
  storeName: string;
}

export interface AddSessionMemberDto {
  sessionId: string;
  email: string;
}

export interface UpdateSessionItemDto {
  isPurchased?: boolean;
  purchasedAt?: Date | null;
  price?: number | null;
}

export interface CreateProductDto {
  name: string;
  category?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
  lifespanDays?: number;
}

export interface UpdateProductDto {
  name?: string;
  category?: string;
  defaultQuantity?: number;
  defaultUnit?: string;
  lifespanDays?: number;
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
}

// Suggestion types
export interface ItemSuggestion {
  product: ProductType;
  reason: 'running_low' | 'frequently_bought' | 'recently_bought';
  confidence: number;
  estimatedDepletionDate: Date | null;
}
