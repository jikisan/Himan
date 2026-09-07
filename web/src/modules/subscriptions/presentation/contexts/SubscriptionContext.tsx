import { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type {
  SubscriptionType,
  UsageLimitsType,
  TierType,
  RoleType,
  FeatureAccessResult,
  UsageStats,
} from '../../domain';
import { CheckFeatureAccess, GetCurrentUsage } from '../../domain';
import { SubscriptionRepository, UsageLimitsRepository } from '../../infrastructure';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { Logger } from '@core/infrastructure/services';

interface SubscriptionContextType {
  subscription: SubscriptionType | null;
  usage: UsageLimitsType | null;
  usageStats: UsageStats | null;
  loading: boolean;
  error: string | null;
  tier: TierType;
  role: RoleType;
  isAdmin: boolean;
  canCreateNote: () => FeatureAccessResult;
  canCreateFolder: () => FeatureAccessResult;
  canCreatePassword: () => FeatureAccessResult;
  canCreateCategory: () => FeatureAccessResult;
  canCreateCard: () => FeatureAccessResult;
  canCreateCardCategory: () => FeatureAccessResult;
  canSaveNoteContent: (contentLength: number) => FeatureAccessResult;
  canUploadFile: (fileSize: number) => FeatureAccessResult;
  canCreateStorageFolder: () => FeatureAccessResult;
  refreshSubscription: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const [subscription, setSubscription] = useState<SubscriptionType | null>(null);
  const [usage, setUsage] = useState<UsageLimitsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const subscriptionRepo = useMemo(() => new SubscriptionRepository(), []);
  const usageRepo = useMemo(() => new UsageLimitsRepository(), []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- keyed on user.id, not the user object, since Supabase issues a new object reference on every token refresh
  const loadSubscription = useCallback(async () => {
    if (!user?.id) {
      setSubscription(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [subscriptionData, usageData] = await Promise.all([
        subscriptionRepo.findByUserId(user.id),
        usageRepo.findByUserId(user.id),
      ]);

      setSubscription(subscriptionData);
      setUsage(usageData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load subscription';
      setError(errorMessage);
      Logger.error('Error loading subscription', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, subscriptionRepo, usageRepo]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- keyed on user.id, not the user object, since Supabase issues a new object reference on every token refresh
  const refreshUsage = useCallback(async () => {
    if (!user?.id) return;

    try {
      const usageData = await usageRepo.findByUserId(user.id);
      setUsage(usageData);
    } catch (err) {
      Logger.error('Error refreshing usage', err);
    }
  }, [user?.id, usageRepo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount
    loadSubscription();
  }, [loadSubscription]);

  const tier: TierType = subscription?.tier ?? 'free';
  const role: RoleType = subscription?.role ?? 'user';
  const isAdmin = role === 'admin';

  const usageStats = useMemo(() => {
    if (!usage) return null;
    return GetCurrentUsage.calculateUsageStats(tier, usage);
  }, [tier, usage]);

  const canCreateNote = useCallback((): FeatureAccessResult => {
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true };
    }
    if (!usage) {
      return { allowed: false, reason: 'Unable to load usage data' };
    }
    return CheckFeatureAccess.canCreateNote(tier, usage);
  }, [tier, usage, isAdmin]);

  const canCreateFolder = useCallback((): FeatureAccessResult => {
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true };
    }
    if (!usage) {
      return { allowed: false, reason: 'Unable to load usage data' };
    }
    return CheckFeatureAccess.canCreateFolder(tier, usage);
  }, [tier, usage, isAdmin]);

  const canCreatePassword = useCallback((): FeatureAccessResult => {
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true };
    }
    if (!usage) {
      return { allowed: false, reason: 'Unable to load usage data' };
    }
    return CheckFeatureAccess.canCreatePassword(tier, usage);
  }, [tier, usage, isAdmin]);

  const canCreateCategory = useCallback((): FeatureAccessResult => {
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true };
    }
    if (!usage) {
      return { allowed: false, reason: 'Unable to load usage data' };
    }
    return CheckFeatureAccess.canCreateCategory(tier, usage);
  }, [tier, usage, isAdmin]);

  const canCreateCard = useCallback((): FeatureAccessResult => {
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true };
    }
    if (!usage) {
      return { allowed: false, reason: 'Unable to load usage data' };
    }
    return CheckFeatureAccess.canCreateCard(tier, usage);
  }, [tier, usage, isAdmin]);

  const canCreateCardCategory = useCallback((): FeatureAccessResult => {
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true };
    }
    if (!usage) {
      return { allowed: false, reason: 'Unable to load usage data' };
    }
    return CheckFeatureAccess.canCreateCardCategory(tier, usage);
  }, [tier, usage, isAdmin]);

  const canSaveNoteContent = useCallback(
    (contentLength: number): FeatureAccessResult => {
      // Admins bypass all limits
      if (isAdmin) {
        return { allowed: true };
      }
      return CheckFeatureAccess.canSaveNoteContent(tier, contentLength);
    },
    [tier, isAdmin]
  );

  const canUploadFile = useCallback(
    (fileSize: number): FeatureAccessResult => {
      // Admins bypass all limits
      if (isAdmin) {
        return { allowed: true };
      }
      if (!usage) {
        return { allowed: false, reason: 'Unable to load usage data' };
      }
      return CheckFeatureAccess.canUploadFile(tier, usage, fileSize);
    },
    [tier, usage, isAdmin]
  );

  const canCreateStorageFolder = useCallback((): FeatureAccessResult => {
    // Admins bypass all limits
    if (isAdmin) {
      return { allowed: true };
    }
    if (!usage) {
      return { allowed: false, reason: 'Unable to load usage data' };
    }
    return CheckFeatureAccess.canCreateStorageFolder(tier, usage);
  }, [tier, usage, isAdmin]);

  const value = {
    subscription,
    usage,
    usageStats,
    loading,
    error,
    tier,
    role,
    isAdmin,
    canCreateNote,
    canCreateFolder,
    canCreatePassword,
    canCreateCategory,
    canCreateCard,
    canCreateCardCategory,
    canSaveNoteContent,
    canUploadFile,
    canCreateStorageFolder,
    refreshSubscription,
    refreshUsage,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};
