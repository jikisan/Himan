import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GetCurrentUsage } from '@himan/shared/subscriptions';
import type { TierType } from '@himan/shared/subscriptions';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { SubscriptionRepository, UsageLimitsRepository } from '../../infrastructure';

export const planKeys = {
  all: ['plan'] as const,
  mine: (userId: string) => [...planKeys.all, userId] as const,
};

/** The signed-in user's plan and how much of it they've used (read-only, for Settings). */
export const usePlan = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const subscriptions = useMemo(() => new SubscriptionRepository(), []);
  const usageLimits = useMemo(() => new UsageLimitsRepository(), []);

  const { data, isLoading } = useQuery({
    queryKey: planKeys.mine(userId ?? ''),
    queryFn: async () => {
      const [subscription, usage] = await Promise.all([
        subscriptions.findByUserId(userId!),
        usageLimits.findByUserId(userId!),
      ]);
      return { subscription, usage };
    },
    enabled: !!userId,
  });

  const tier: TierType = data?.subscription?.tier ?? 'free';
  const isAdmin = data?.subscription?.role === 'admin';
  const usageStats = data?.usage ? GetCurrentUsage.calculateUsageStats(tier, data.usage) : null;

  return { tier, isAdmin, usageStats, loading: isLoading };
};
