import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GrocerySessionRepository, GrocerySession } from '@himan/shared/grocery';
import type { GrocerySessionType } from '@himan/shared/grocery';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { groceryKeys } from './queryKeys';

export interface HistoryDay {
  dateLabel: string;
  isoDate: string;
  errands: GrocerySession[];
  total: number;
}

/** Completed errands, grouped by day (newest first) with per-day totals. */
export function useErrandHistory() {
  const { user } = useAuth();
  const userId = user?.id;
  const repository = useMemo(() => new GrocerySessionRepository(), []);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: groceryKeys.history(),
    queryFn: () => repository.findByUserId(userId!),
    enabled: !!userId,
  });

  const days = useMemo<HistoryDay[]>(() => {
    const completed = (sessions as GrocerySessionType[])
      .filter((s) => s.status === 'completed')
      .map((s) => new GrocerySession(s));

    const map = new Map<string, GrocerySession[]>();
    for (const errand of completed) {
      const d = errand.completedAt ?? errand.startedAt;
      const iso = d.toISOString().slice(0, 10);
      const arr = map.get(iso) ?? [];
      arr.push(errand);
      map.set(iso, arr);
    }

    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([iso, errands]) => ({
        isoDate: iso,
        dateLabel: new Date(iso).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        errands,
        total: errands.reduce((sum, e) => sum + e.actualTotal, 0),
      }));
  }, [sessions]);

  return { days, isLoading };
}
