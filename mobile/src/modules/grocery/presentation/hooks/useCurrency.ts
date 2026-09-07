import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UserPreferencesRepository } from '@himan/shared/grocery';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { groceryKeys } from './queryKeys';

/** User currency symbol (default ₱) + a formatter. */
export function useCurrency() {
  const { user } = useAuth();
  const repo = useMemo(() => new UserPreferencesRepository(), []);

  const { data: currency = '₱' } = useQuery({
    queryKey: groceryKeys.preferences(),
    queryFn: async () => (await repo.get(user!.id)).currency,
    enabled: !!user?.id,
  });

  const format = useCallback((n: number) => `${currency}${n.toFixed(2)}`, [currency]);

  return { currency, format };
}
