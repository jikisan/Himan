import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.js';

/** Supabase client typed against the generated `Database` schema. */
export type TypedSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  authStorage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
}

let _supabase: TypedSupabaseClient | null = null;

export function initSupabase(config: SupabaseConfig): TypedSupabaseClient {
  _supabase = createClient<Database>(config.url, config.anonKey, {
    auth: {
      ...(config.authStorage && { storage: config.authStorage }),
    },
  });
  return _supabase;
}

export function getSupabase(): TypedSupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return _supabase;
}
