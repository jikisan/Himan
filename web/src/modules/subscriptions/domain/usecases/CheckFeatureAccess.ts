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
   * Check if user can create a new credit card
   */
  static canCreateCard(tier: TierType, currentUsage: UsageLimitsType): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxCards;

    if (limit === null) {
      return { allowed: true };
    }

    if (currentUsage.cardsCount >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${limit} credit cards. Please upgrade to continue.`,
        currentUsage: currentUsage.cardsCount,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.cardsCount,
      limit,
    };
  }

  /**
   * Check if user can create a new card category
   */
  static canCreateCardCategory(tier: TierType, currentUsage: UsageLimitsType): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxCardCategories;

    if (limit === null) {
      return { allowed: true };
    }

    if (currentUsage.cardCategoriesCount >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${limit} card categories. Please upgrade to continue.`,
        currentUsage: currentUsage.cardCategoriesCount,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.cardCategoriesCount,
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

  /**
   * Check if user can upload a file
   */
  static canUploadFile(
    tier: TierType,
    currentUsage: UsageLimitsType,
    fileSize: number
  ): FeatureAccessResult {
    const fileLimit = TIER_LIMITS[tier].maxFiles;
    const storageLimit = TIER_LIMITS[tier].maxStorage;

    // Check file count limit
    if (fileLimit !== null && currentUsage.filesCount >= fileLimit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${fileLimit} files. Please upgrade to continue.`,
        currentUsage: currentUsage.filesCount,
        limit: fileLimit,
      };
    }

    // Check storage space limit
    const newStorageUsed = currentUsage.storageUsed + fileSize;
    if (newStorageUsed > storageLimit) {
      const storageLimitMB = (storageLimit / (1024 * 1024)).toFixed(0);
      const currentUsageMB = (currentUsage.storageUsed / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

      return {
        allowed: false,
        reason: `Uploading this file would exceed your ${TIER_NAMES[tier]} tier storage limit of ${storageLimitMB}MB. Current usage: ${currentUsageMB}MB, File size: ${fileSizeMB}MB.`,
        currentUsage: currentUsage.storageUsed,
        limit: storageLimit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.filesCount,
      limit: fileLimit,
    };
  }

  /**
   * Check if user can create a storage folder
   */
  static canCreateStorageFolder(
    tier: TierType,
    currentUsage: UsageLimitsType
  ): FeatureAccessResult {
    const limit = TIER_LIMITS[tier].maxStorageFolders;

    if (limit === null) {
      return { allowed: true };
    }

    if (currentUsage.storageFoldersCount >= limit) {
      return {
        allowed: false,
        reason: `You've reached the ${TIER_NAMES[tier]} tier limit of ${limit} storage folders. Please upgrade to continue.`,
        currentUsage: currentUsage.storageFoldersCount,
        limit,
      };
    }

    return {
      allowed: true,
      currentUsage: currentUsage.storageFoldersCount,
      limit,
    };
  }
}
