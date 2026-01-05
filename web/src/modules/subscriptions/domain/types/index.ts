export type TierType = 'free' | 'beta' | 'pro' | 'enterprise';

export interface SubscriptionType {
  id: string;
  userId: string;
  tier: TierType;
  validUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageLimitsType {
  id: string;
  userId: string;
  notesCount: number;
  foldersCount: number;
  passwordsCount: number;
  categoriesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TierLimits {
  maxNotes: number | null; // null = unlimited
  maxFolders: number | null;
  maxNoteSize: number; // in characters
  maxPasswords: number | null;
  maxCategories: number | null;
}

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number | null;
}

export interface UsageStats {
  notes: {
    current: number;
    limit: number | null;
    percentage: number | null; // null for unlimited
  };
  folders: {
    current: number;
    limit: number | null;
    percentage: number | null;
  };
  passwords: {
    current: number;
    limit: number | null;
    percentage: number | null;
  };
  categories: {
    current: number;
    limit: number | null;
    percentage: number | null;
  };
}
