export type TierType = 'free' | 'beta' | 'pro' | 'enterprise';
export type RoleType = 'user' | 'admin';

export interface SubscriptionType {
  id: string;
  userId: string;
  tier: TierType;
  role: RoleType;
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
  filesCount: number;
  storageUsed: number; // in bytes
  storageFoldersCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TierLimits {
  maxNotes: number | null; // null = unlimited
  maxFolders: number | null;
  maxNoteSize: number; // in characters
  maxPasswords: number | null;
  maxCategories: number | null;
  maxFiles: number | null;
  maxStorage: number; // in bytes
  maxStorageFolders: number | null;
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
  files: {
    current: number;
    limit: number | null;
    percentage: number | null;
  };
  storage: {
    current: number; // bytes
    limit: number; // bytes
    percentage: number;
  };
  storageFolders: {
    current: number;
    limit: number | null;
    percentage: number | null;
  };
}
