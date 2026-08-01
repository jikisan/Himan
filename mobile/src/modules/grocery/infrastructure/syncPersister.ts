import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import { kvGet, kvSet, kvRemove } from './db';

const CACHE_KEY = 'rq-grocery-cache';

/** React Query persister backed by the local SQLite kv table. */
export const sqlitePersister: Persister = {
  persistClient: async (client) => {
    await kvSet(CACHE_KEY, JSON.stringify(client));
  },
  restoreClient: async () => {
    const raw = await kvGet(CACHE_KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as PersistedClient;
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    await kvRemove(CACHE_KEY);
  },
};
