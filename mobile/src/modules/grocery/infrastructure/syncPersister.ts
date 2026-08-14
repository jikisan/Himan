import type { Persister, PersistedClient } from '@tanstack/react-query-persist-client';
import { kvGet, kvSet, kvRemove } from './db';

const CACHE_KEY = 'rq-grocery-cache';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Revives ISO date strings lost to JSON.stringify back into Date objects. */
function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO_DATE_RE.test(value)
    ? new Date(value)
    : value;
}

/** React Query persister backed by the local SQLite kv table. */
export const sqlitePersister: Persister = {
  persistClient: async (client) => {
    await kvSet(CACHE_KEY, JSON.stringify(client));
  },
  restoreClient: async () => {
    const raw = await kvGet(CACHE_KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw, reviveDates) as PersistedClient;
    } catch {
      return undefined;
    }
  },
  removeClient: async () => {
    await kvRemove(CACHE_KEY);
  },
};
