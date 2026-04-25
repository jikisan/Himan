import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let _supabase: SupabaseClient | null = null;

export function initSupabase(config: SupabaseConfig): SupabaseClient {
  _supabase = createClient(config.url, config.anonKey);
  return _supabase;
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return _supabase;
}
