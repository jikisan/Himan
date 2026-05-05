import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  authStorage?: {
    getItem: (key: string) => Promise<string | null> | string | null;
    setItem: (key: string, value: string) => Promise<void> | void;
    removeItem: (key: string) => Promise<void> | void;
  };
}

let _supabase: SupabaseClient | null = null;

export function initSupabase(config: SupabaseConfig): SupabaseClient {
  _supabase = createClient(config.url, config.anonKey, {
    auth: {
      ...(config.authStorage && { storage: config.authStorage }),
    },
  });
  return _supabase;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return _supabase;
}
