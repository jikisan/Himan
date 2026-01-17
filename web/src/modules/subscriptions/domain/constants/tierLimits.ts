import type { TierType, TierLimits } from '../types';

/**
 * Tier limits configuration
 * null = unlimited
 */
export const TIER_LIMITS: Record<TierType, TierLimits> = {
  free: {
    maxNotes: 50,
    maxFolders: 5,
    maxNoteSize: 10000, // 10k characters
    maxPasswords: 25,
    maxCategories: 5,
    maxCards: 3,
    maxCardCategories: 3,
    maxFiles: 100,
    maxStorage: 500 * 1024 * 1024, // 500MB in bytes
    maxStorageFolders: 5,
  },
  beta: {
    maxNotes: 200,
    maxFolders: 20,
    maxNoteSize: 25000, // 25k characters
    maxPasswords: 100,
    maxCategories: 20,
    maxCards: 10,
    maxCardCategories: 10,
    maxFiles: 500,
    maxStorage: 2 * 1024 * 1024 * 1024, // 2GB in bytes
    maxStorageFolders: 20,
  },
  pro: {
    maxNotes: null, // unlimited
    maxFolders: null,
    maxNoteSize: 50000, // 50k characters
    maxPasswords: null,
    maxCategories: null,
    maxCards: 50,
    maxCardCategories: 30,
    maxFiles: null, // unlimited
    maxStorage: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    maxStorageFolders: null,
  },
  enterprise: {
    maxNotes: null, // unlimited
    maxFolders: null,
    maxNoteSize: 100000, // 100k characters
    maxPasswords: null,
    maxCategories: null,
    maxCards: null, // unlimited
    maxCardCategories: null, // unlimited
    maxFiles: null, // unlimited
    maxStorage: 50 * 1024 * 1024 * 1024, // 50GB in bytes
    maxStorageFolders: null,
  },
};

/**
 * Helper to check if a tier has unlimited access for a feature
 */
export const isUnlimited = (tier: TierType, feature: keyof TierLimits): boolean => {
  return TIER_LIMITS[tier][feature] === null;
};

/**
 * Get limit value for a specific tier and feature
 */
export const getLimit = (tier: TierType, feature: keyof TierLimits): number | null => {
  return TIER_LIMITS[tier][feature];
};

/**
 * Tier display names
 */
export const TIER_NAMES: Record<TierType, string> = {
  free: 'Free',
  beta: 'Beta',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

/**
 * Tier descriptions
 */
export const TIER_DESCRIPTIONS: Record<TierType, string> = {
  free: 'Individual users, basic needs',
  beta: 'Beta testers - Thank you for helping us improve!',
  pro: 'Power users, professionals',
  enterprise: 'Teams, businesses',
};

/**
 * Role display names
 */
export const ROLE_NAMES: Record<string, string> = {
  user: 'User',
  admin: 'Admin',
};

/**
 * Role descriptions
 */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  user: 'Standard user access',
  admin: 'Full administrative access with unlimited features',
};
