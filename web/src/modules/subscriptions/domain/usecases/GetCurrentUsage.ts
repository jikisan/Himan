import type { TierType, UsageLimitsType, UsageStats } from '../types';
import { TIER_LIMITS } from '../constants/tierLimits';

export class GetCurrentUsage {
  /**
   * Calculate usage statistics for display
   */
  static calculateUsageStats(tier: TierType, usage: UsageLimitsType): UsageStats {
    const limits = TIER_LIMITS[tier];

    return {
      notes: {
        current: usage.notesCount,
        limit: limits.maxNotes,
        percentage: this.calculatePercentage(usage.notesCount, limits.maxNotes),
      },
      folders: {
        current: usage.foldersCount,
        limit: limits.maxFolders,
        percentage: this.calculatePercentage(usage.foldersCount, limits.maxFolders),
      },
      passwords: {
        current: usage.passwordsCount,
        limit: limits.maxPasswords,
        percentage: this.calculatePercentage(usage.passwordsCount, limits.maxPasswords),
      },
      categories: {
        current: usage.categoriesCount,
        limit: limits.maxCategories,
        percentage: this.calculatePercentage(usage.categoriesCount, limits.maxCategories),
      },
      files: {
        current: usage.filesCount,
        limit: limits.maxFiles,
        percentage: this.calculatePercentage(usage.filesCount, limits.maxFiles),
      },
      storage: {
        current: usage.storageUsed,
        limit: limits.maxStorage,
        percentage: Math.min(Math.round((usage.storageUsed / limits.maxStorage) * 100), 100),
      },
      storageFolders: {
        current: usage.storageFoldersCount,
        limit: limits.maxStorageFolders,
        percentage: this.calculatePercentage(
          usage.storageFoldersCount,
          limits.maxStorageFolders
        ),
      },
    };
  }

  /**
   * Calculate usage percentage (returns null for unlimited)
   */
  private static calculatePercentage(current: number, limit: number | null): number | null {
    if (limit === null) {
      return null; // unlimited
    }
    return Math.min(Math.round((current / limit) * 100), 100);
  }

  /**
   * Check if usage is approaching limit (80% or more)
   */
  static isApproachingLimit(current: number, limit: number | null): boolean {
    if (limit === null) {
      return false; // unlimited
    }
    return current >= limit * 0.8;
  }

  /**
   * Check if user is at limit
   */
  static isAtLimit(current: number, limit: number | null): boolean {
    if (limit === null) {
      return false; // unlimited
    }
    return current >= limit;
  }
}
