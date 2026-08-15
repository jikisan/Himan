import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { StorePrice } from '@/modules/grocery/presentation/hooks/useProductStores';

interface UseStoreDraftsArgs {
  prices: StorePrice[];
  updateDetails: (args: { storeId: string; price?: number | null; aisle?: string | null }) => Promise<unknown>;
}

export function useStoreDrafts({ prices, updateDetails }: UseStoreDraftsArgs) {
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [aisleDrafts, setAisleDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setPriceDrafts(
      Object.fromEntries(prices.map((sp) => [sp.store.id, sp.price != null ? String(sp.price) : '']))
    );
    setAisleDrafts(Object.fromEntries(prices.map((sp) => [sp.store.id, sp.aisle ?? ''])));
  }, [prices]);

  const setPriceDraft = (storeId: string, value: string) =>
    setPriceDrafts((d) => ({ ...d, [storeId]: value }));

  const setAisleDraft = (storeId: string, value: string) =>
    setAisleDrafts((d) => ({ ...d, [storeId]: value }));

  const commitPrice = async (storeId: string, raw: string) => {
    const trimmed = raw.trim();
    const price = trimmed ? Number(trimmed) : null;
    if (price != null && Number.isNaN(price)) return;
    try {
      await updateDetails({ storeId, price });
    } catch (err) {
      Alert.alert('Could not save price', err instanceof Error ? err.message : String(err));
    }
  };

  const commitAisle = async (storeId: string, raw: string) => {
    try {
      await updateDetails({ storeId, aisle: raw.trim() || null });
    } catch (err) {
      Alert.alert('Could not save aisle', err instanceof Error ? err.message : String(err));
    }
  };

  return { priceDrafts, aisleDrafts, setPriceDraft, setAisleDraft, commitPrice, commitAisle };
}
