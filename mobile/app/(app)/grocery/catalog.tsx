import { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ProductType } from '@himan/shared/grocery';
import { useProductCatalog } from '@/modules/grocery/presentation/hooks/useProductCatalog';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import { PaperSurface } from '@/modules/grocery/presentation/components/notebook';
import {
  CatalogHeader,
  CatalogProductList,
  ProductDialog,
} from '@/modules/grocery/presentation/components/catalog';

export default function CatalogScreen() {
  const { format } = useCurrency();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ProductType | null>(null);

  const filters = useMemo(() => ({ searchQuery: search.trim() || undefined }), [search]);
  const { products, loading, upsertProduct, updateProduct, deleteProduct } =
    useProductCatalog(filters);

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
          onSelect={setSelected}
          canCreate={canCreate}
          searchTerm={search.trim()}
          onCreate={handleCreate}
        />
      </SafeAreaView>

      <ProductDialog
        product={selected}
        onClose={() => setSelected(null)}
        onUpdate={async (id, dto) => {
          const updated = await updateProduct(id, dto);
          setSelected(updated);
        }}
        onDelete={async (p) => {
          setSelected(null);
          await deleteProduct(p.id);
        }}
        formatMoney={format}
      />
    </PaperSurface>
  );
}
