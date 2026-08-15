import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useProductCatalog } from '@/modules/grocery/presentation/hooks/useProductCatalog';
import { PaperSurface } from '@/modules/grocery/presentation/components/notebook';
import {
  CatalogHeader,
  CatalogProductList,
} from '@/modules/grocery/presentation/components/catalog';

export default function CatalogScreen() {
  const router = useRouter();

  const [search, setSearch] = useState('');

  const filters = useMemo(() => ({ searchQuery: search.trim() || undefined }), [search]);
  const { products, loading, upsertProduct } = useProductCatalog(filters);

  const canCreate =
    search.trim().length > 0 &&
    !products.some((p) => p.name.toLowerCase() === search.trim().toLowerCase());

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    await upsertProduct({ name });
    setSearch('');
  };

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <CatalogHeader search={search} onSearchChange={setSearch} />
        <CatalogProductList
          products={products}
          loading={loading}
          onSelect={(p) => router.push(`/grocery/catalog/${p.id}`)}
          canCreate={canCreate}
          searchTerm={search.trim()}
          onCreate={handleCreate}
        />
      </SafeAreaView>
    </PaperSurface>
  );
}
