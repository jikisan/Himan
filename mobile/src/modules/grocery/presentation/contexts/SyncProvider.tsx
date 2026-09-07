import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { SyncQueue, SyncEngine } from '@himan/shared/grocery';
import type { SyncStatus, EnqueueInput } from '@himan/shared/grocery';
import { getLogger } from '@himan/shared';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { groceryKeys } from '../hooks/queryKeys';
import { SqliteSyncStorage } from '../../infrastructure/SqliteSyncStorage';
import { createOpExecutor, isRetryableError } from '../../infrastructure/opExecutor';

const logger = getLogger();

interface SyncContextValue {
  status: SyncStatus;
  /** Optimistically enqueue a write; drains immediately when online. */
  enqueue: (input: EnqueueInput) => Promise<void>;
  /** Manually retry a stalled outbox (e.g. tap on the sync badge). */
  retry: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SyncStatus>({ kind: 'synced' });

  const queue = useMemo(() => new SyncQueue(new SqliteSyncStorage()), []);
  const engineRef = useRef<SyncEngine | null>(null);

  useEffect(() => {
    engineRef.current = userId
      ? new SyncEngine(queue, createOpExecutor(userId), isRetryableError)
      : null;
  }, [queue, userId]);

  const refreshPendingStatus = useCallback(async () => {
    const count = await queue.size();
    setStatus(count > 0 ? { kind: 'offline-pending', count } : { kind: 'synced' });
  }, [queue]);

  const drain = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || engine.isDraining) return;
    if (!onlineManager.isOnline()) {
      await refreshPendingStatus();
      return;
    }

    setStatus({ kind: 'syncing' });
    try {
      const result = await engine.push();
      // Pull: reconcile DB-trigger side effects + other devices.
      if (result.pushed > 0) {
        await queryClient.invalidateQueries({ queryKey: groceryKeys.all });
      }
      if (result.dropped.length > 0) {
        logger.error('Sync dropped ops', result.dropped);
        setStatus({ kind: 'error', message: `${result.dropped.length} change(s) rejected` });
        return;
      }
      if (result.remaining > 0) {
        setStatus({ kind: 'offline-pending', count: result.remaining });
        return;
      }
      setStatus({ kind: 'synced' });
    } catch (err) {
      logger.error('Sync drain failed', err);
      await refreshPendingStatus();
    }
  }, [queryClient, refreshPendingStatus]);

  const enqueue = useCallback(
    async (input: EnqueueInput) => {
      await queue.enqueue(input);
      if (onlineManager.isOnline()) {
        void drain();
      } else {
        await refreshPendingStatus();
      }
    },
    [queue, drain, refreshPendingStatus]
  );

  // Drain on reconnect.
  useEffect(() => {
    const unsub = onlineManager.subscribe((isOnline) => {
      if (isOnline) void drain();
    });
    return unsub;
  }, [drain]);

  // Drain on foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void drain();
    });
    return () => sub.remove();
  }, [drain]);

  // Initial reconciliation once authed.
  useEffect(() => {
    if (userId) void drain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value = useMemo<SyncContextValue>(
    () => ({ status, enqueue, retry: drain }),
    [status, enqueue, drain]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
