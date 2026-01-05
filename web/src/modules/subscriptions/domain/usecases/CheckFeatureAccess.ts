import type { TierType, FeatureAccessResult, UsageLimitsType } from '../types';
import { TIER_LIMITS, TIER_NAMES } from '../constants/tierLimits';

export class CheckFeatureAccess {
  /**
   * Check if user can create a new note
   */
  static canCreateNote(tier: TierType, currentUsage: UsageLimitsType): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxNotes;

    if (limit === null) {
      return { allowed: true };
    }

    if (currentUsage.notesCount >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${limit} notes. Please upgrade to continue.`,
        currentUsage: currentUsage.notesCount,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.notesCount,
      limit,
    };
  }

  /**
   * Check if user can create a new folder
   */
  static canCreateFolder(tier: TierType, currentUsage: UsageLimitsType): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxFolders;

    if (limit === null) {
      return { allowed: true };
    }

    if (currentUsage.foldersCount >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${limit} folders. Please upgrade to continue.`,
        currentUsage: currentUsage.foldersCount,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.foldersCount,
      limit,
    };
  }

  /**
   * Check if user can create a new password
   */
  static canCreatePassword(tier: TierType, currentUsage: UsageLimitsType): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxPasswords;

    if (limit === null) {
      return { allowed: true };
    }

    if (currentUsage.passwordsCount >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${limit} passwords. Please upgrade to continue.`,
        currentUsage: currentUsage.passwordsCount,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.passwordsCount,
      limit,
    };
  }

  /**
   * Check if user can create a new category
   */
  static canCreateCategory(tier: TierType, currentUsage: UsageLimitsType): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxCategories;

    if (limit === null) {
      return { allowed: true };
    }

    if (currentUsage.categoriesCount >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${limit} categories. Please upgrade to continue.`,
        currentUsage: currentUsage.categoriesCount,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.categoriesCount,
      limit,
    };
  }

  /**
   * Check if note content size is within tier limits
   */
  static canSaveNoteContent(tier: TierType, contentLength: number): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxNoteSize;

    if (contentLength > limit) {
      return {
        allowed: false,
        reason: `Note content exceeds the ${TIER_NAMES[tier]} tier limit of ${limit.toLocaleString()} characters. Current: ${contentLength.toLocaleString()} characters.`,
        currentUsage: contentLength,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: contentLength,
      limit,
    };
  }
}
