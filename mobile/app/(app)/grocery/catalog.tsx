import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { ProductType } from '@himan/shared/grocery';
import { useProductCatalog } from '@/modules/grocery/presentation/hooks/useProductCatalog';
import { useProductStores } from '@/modules/grocery/presentation/hooks/useProductStores';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import {
  PaperSurface,
  SectionHeading,
  CategoryChip,
  SyncBadge,
} from '@/modules/grocery/presentation/components/notebook';
import { ProductRow } from '@/modules/grocery/presentation/components/catalog/ProductRow';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

export default function CatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const { format } = useCurrency();

  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selected, setSelected] = useState<ProductType | null>(null);

  const filters = useMemo(
    () => ({ searchQuery: search.trim() || undefined, favorite: favoritesOnly || undefined }),
    [search, favoritesOnly]
  );
  const { products, loading, upsertProduct, deleteProduct, toggleFavorite } =
    useProductCatalog(filters);

  const canCreate = search.trim().length > 0 && !products.some(
    (p) => p.name.toLowerCase() === search.trim().toLowerCase()
  );

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    await upsertProduct({ name });
    setSearch('');
  };

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-5 pt-2 pb-3 border-b border-rule dark:border-rule-dark">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-1 active:opacity-60">
              <Feather name="chevron-left" size={22} color={c.ink} />
              <Text className="text-ink dark:text-ink-dark font-serif">Notebook</Text>
            </Pressable>
            <SyncBadge />
          </View>
          <SectionHeading size="xl" className="mt-1">Pantry Catalog</SectionHeading>

          <View className="flex-row items-center gap-2 mt-3 rounded-2xl px-3 py-2 border border-rule dark:border-rule-dark">
            <Feather name="search" size={18} color={c.inkSoft} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search name, brand, barcode…"
              placeholderTextColor={c.inkSoft}
              className="flex-1 text-ink dark:text-ink-dark font-serif"
              autoCapitalize="none"
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Feather name="x" size={18} color={c.inkSoft} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setFavoritesOnly((v) => !v)}
            className="flex-row items-center gap-1.5 mt-2 self-start rounded-full px-3 py-1"
            style={{ backgroundColor: favoritesOnly ? `${c.accent}22` : 'transparent' }}
          >
            <Feather name="star" size={14} color={favoritesOnly ? c.accent : c.inkSoft} />
            <Text className="text-xs" style={{ color: favoritesOnly ? c.accent : c.inkSoft }}>
              Favorites
            </Text>
          </Pressable>
        </View>

        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ProductRow
              product={item}
              onPress={() => setSelected(item)}
              onToggleFavorite={() => toggleFavorite(item.id, !item.isFavorite)}
            />
          )}
          ListHeaderComponent={
            canCreate ? (
              <Pressable
                onPress={handleCreate}
                className="flex-row items-center gap-2 px-6 py-4 border-b border-rule dark:border-rule-dark active:bg-black/5"
              >
                <Feather name="plus-circle" size={20} color={c.accent} />
                <Text style={{ color: c.accent }}>Add “{search.trim()}” to catalog</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center px-8 py-20">
                <Feather name="book" size={36} color={c.inkSoft} />
                <Text className="mt-3 text-center text-ink-soft dark:text-ink-softdark font-serif">
                  Your catalog is empty. Search a product name and add it.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>

      <ProductSheet
        product={selected}
        onClose={() => setSelected(null)}
        onToggleFavorite={(p) => toggleFavorite(p.id, !p.isFavorite)}
        onDelete={async (p) => {
          setSelected(null);
          await deleteProduct(p.id);
        }}
        formatMoney={format}
        insetsBottom={insets.bottom}
      />
    </PaperSurface>
  );
}

function ProductSheet({
  product,
  onClose,
  onToggleFavorite,
  onDelete,
  formatMoney,
  insetsBottom,
}: {
  product: ProductType | null;
  onClose: () => void;
  onToggleFavorite: (p: ProductType) => void;
  onDelete: (p: ProductType) => void;
  formatMoney: (n: number) => string;
  insetsBottom: number;
}) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const { prices } = useProductStores(product?.id ?? null);

  return (
    <Modal visible={!!product} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="rounded-t-3xl bg-paper dark:bg-paper-dark px-5 pt-4"
            style={{ paddingBottom: Math.max(insetsBottom, 24), maxHeight: '80%' }}
          >
            {product ? (
              <ScrollView>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <SectionHeading size="lg">{product.name}</SectionHeading>
                    <View className="flex-row items-center gap-2 mt-1">
                      {product.category ? <CategoryChip category={product.category} /> : null}
                      {product.brand ? (
                        <Text className="text-xs text-ink-soft dark:text-ink-softdark font-serif">{product.brand}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Pressable onPress={() => onToggleFavorite(product)} hitSlop={8} className="p-1">
                    <Feather name="star" size={22} color={product.isFavorite ? c.accent : c.inkSoft} />
                  </Pressable>
                </View>

                <Text className="mt-5 mb-1 text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark font-serif">
                  Where to buy
                </Text>
                {prices.length === 0 ? (
                  <Text className="text-ink-soft dark:text-ink-softdark py-2 font-serif">
                    No store prices yet. Finish an errand to record them.
                  </Text>
                ) : (
                  prices.map((sp) => (
                    <View
                      key={sp.store.id}
                      className="flex-row items-center justify-between py-2.5 border-b border-rule dark:border-rule-dark"
                    >
                      <View>
                        <Text className="text-ink dark:text-ink-dark font-serif">{sp.store.name}</Text>
                        {sp.aisle ? (
                          <Text className="text-xs text-ink-soft dark:text-ink-softdark font-serif">Aisle {sp.aisle}</Text>
                        ) : null}
                      </View>
                      <Text className="text-ink dark:text-ink-dark font-serif" style={{ fontVariant: ['tabular-nums'] }}>
                        {sp.price != null ? formatMoney(sp.price) : '—'}
                      </Text>
                    </View>
                  ))
                )}

                <View className="flex-row gap-3 mt-6">
                  <Pressable
                    onPress={() =>
                      Alert.alert('Delete product?', `Remove “${product.name}” from your catalog.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(product) },
                      ])
                    }
                    className="flex-1 rounded-full py-3 items-center border"
                    style={{ borderColor: c.margin }}
                  >
                    <Text style={{ color: c.margin }}>Delete</Text>
                  </Pressable>
                  <Pressable onPress={onClose} className="flex-1 rounded-full py-3 items-center" style={{ backgroundColor: c.accent }}>
                    <Text className="font-semibold" style={{ color: colorScheme === 'dark' ? '#201e1d' : '#ffffff' }}>
                      Done
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
