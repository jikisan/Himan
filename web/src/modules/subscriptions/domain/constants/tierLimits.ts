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
  },
  beta: {
    maxNotes: 200,
    maxFolders: 20,
    maxNoteSize: 25000, // 25k characters
    maxPasswords: 100,
    maxCategories: 20,
  },
  pro: {
    maxNotes: null, // unlimited
    maxFolders: null,
    maxNoteSize: 50000, // 50k characters
    maxPasswords: null,
    maxCategories: null,
  },
  enterprise: {
    maxNotes: null, // unlimited
    maxFolders: null,
    maxNoteSize: 100000, // 100k characters
    maxPasswords: null,
    maxCategories: null,
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
