// Re-export all domain code from shared package
export {
  // Entities
  Subscription,
  UsageLimits,
  // Types
  type TierType,
  type RoleType,
  type SubscriptionType,
  type UsageLimitsType,
  type TierLimits,
  type FeatureAccessResult,
  type UsageStats,
  // Constants
  TIER_LIMITS,
  isUnlimited,
  getLimit,
  TIER_NAMES,
  TIER_DESCRIPTIONS,
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
  // Use cases
  CheckFeatureAccess,
  GetCurrentUsage,
} from '@himan/shared/subscriptions';
