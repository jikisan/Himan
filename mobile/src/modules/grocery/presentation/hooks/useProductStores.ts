import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProductStoreRepository, StoreRepository } from '@himan/shared/grocery';
import type { ProductStoreType, StoreType } from '@himan/shared/grocery';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { groceryKeys } from './queryKeys';

export interface StorePrice {
  store: StoreType;
  price: number | null;
  aisle: string | null;
}

/** Per-store pricing/aisle for a product, joined with store names. */
export function useProductStores(productId: string | null) {
  const { user } = useAuth();
  const userId = user?.id;
  const productStores = useMemo(() => new ProductStoreRepository(), []);
  const storeRepo = useMemo(() => new StoreRepository(), []);

  const { data: stores = [] } = useQuery({
    queryKey: groceryKeys.stores(),
    queryFn: () => storeRepo.findAll(userId!),
    enabled: !!userId,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: groceryKeys.productStores(productId!),
    queryFn: () => productStores.findByProduct(productId!),
    enabled: !!productId,
  });

  const prices = useMemo<StorePrice[]>(() => {
    const storeMap = new Map((stores as StoreType[]).map((s) => [s.id, s]));
    return (rows as ProductStoreType[])
      .map((r) => {
        const store = storeMap.get(r.storeId);
        return store ? { store, price: r.price, aisle: r.aisle } : null;
      })
      .filter((x): x is StorePrice => x !== null)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  }, [rows, stores]);

  return { prices, isLoading };
}
