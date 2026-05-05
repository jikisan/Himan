import { initSupabase } from '@himan/shared';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const value = await SecureStore.getItemAsync(key);
    if (value) return value;

    // Try chunked
    const chunkCountStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (!chunkCountStr) return null;
    const chunkCount = parseInt(chunkCountStr, 10);
    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}.chunk.${i}`);
      if (!chunk) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },
  setItem: async (key: string, value: string) => {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    // Store in chunks
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}.chunks`, String(chunkCount));
    for (let i = 0; i < chunkCount; i++) {
      await SecureStore.setItemAsync(
        `${key}.chunk.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
    const chunkCountStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (!chunkCountStr) return;
    const chunkCount = parseInt(chunkCountStr, 10);
    await SecureStore.deleteItemAsync(`${key}.chunks`);
    for (let i = 0; i < chunkCount; i++) {
      await SecureStore.deleteItemAsync(`${key}.chunk.${i}`);
    }
  },
};

export const supabase = initSupabase({
  url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  authStorage: ExpoSecureStoreAdapter,
});
