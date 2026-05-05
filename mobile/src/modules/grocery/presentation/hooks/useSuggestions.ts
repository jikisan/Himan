import { useMemo } from 'react';
import { SuggestItems } from '@himan/shared/grocery';
import type { GroceryItemType } from '@himan/shared/grocery';
import { useProductCatalog } from './useProductCatalog';

export const useSuggestions = (listId: string | null, items: GroceryItemType[]) => {
  const { products } = useProductCatalog();

  const currentListItemNames = useMemo(
    () => items.map((item) => item.name),
    [items]
  );

  const suggestions = useMemo(() => {
    if (!listId || products.length === 0) return [];
    return SuggestItems.getSuggestions(products, currentListItemNames);
  }, [listId, products, currentListItemNames]);

  return { suggestions };
};
