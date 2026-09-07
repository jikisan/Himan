import { FlatList } from 'react-native';
import type { ProductType } from '@himan/shared/grocery';
import { ProductRow } from './ProductRow';
import { CatalogAddRow } from './CatalogAddRow';
import { CatalogEmptyState } from './CatalogEmptyState';

interface CatalogProductListProps {
  products: ProductType[];
  loading: boolean;
  onSelect: (product: ProductType) => void;
  canCreate: boolean;
  searchTerm: string;
  onCreate: () => void;
}

export function CatalogProductList({
  products,
  loading,
  onSelect,
  canCreate,
  searchTerm,
  onCreate,
}: CatalogProductListProps) {
  return (
    <FlatList
      data={products}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <ProductRow product={item} onPress={() => onSelect(item)} />}
      ListHeaderComponent={
        canCreate ? <CatalogAddRow name={searchTerm} onPress={onCreate} /> : null
      }
      ListEmptyComponent={!loading ? <CatalogEmptyState /> : null}
    />
  );
}
