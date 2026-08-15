import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useProductCatalog } from '@/modules/grocery/presentation/hooks/useProductCatalog';
import { useProductStores } from '@/modules/grocery/presentation/hooks/useProductStores';
import { useCurrency } from '@/modules/grocery/presentation/hooks/useCurrency';
import {
  PaperSurface,
  SectionHeading,
  CategoryChip,
  PressableScale,
} from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';
import { ProductStoreViewTable } from './ProductDialog/ProductStoreViewTable';

export function ProductDetailScreen() {
  const router = useRouter();
  const { format } = useCurrency();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { products, deleteProduct } = useProductCatalog();
  const product = products.find((p) => p.id === productId) ?? null;

  const { prices } = useProductStores(productId ?? null);

  const handleDelete = () => {
    if (!product) return;
    Alert.alert('Delete product?', `Remove "${product.name}" from your catalog.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          router.back();
          await deleteProduct(product.id);
        },
      },
    ]);
  };

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-rule dark:border-rule-dark">
          <PressableScale
            onPress={() => router.back()}
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <Feather name="chevron-left" size={22} color={c.ink} />
            <Text className="text-ink dark:text-ink-dark font-serif">Catalog</Text>
          </PressableScale>

          {product ? (
            <View className="flex-row items-center gap-1.5">
              <PressableScale
                onPress={() => router.push(`/grocery/catalog/${product.id}/edit`)}
                hitSlop={6}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: c.surface }}
              >
                <Feather name="edit-2" size={16} color={c.inkSoft} />
              </PressableScale>
              <PressableScale
                onPress={handleDelete}
                hitSlop={6}
                className="w-9 h-9 rounded-full items-center justify-center bg-surface dark:bg-surface-dark"
              >
                <Feather name="trash-2" size={15} color={c.margin} />
              </PressableScale>
            </View>
          ) : null}
        </View>

        {product ? (
          <ScrollView
            contentContainerStyle={{ padding: 22 }}
            showsVerticalScrollIndicator={false}
          >
            <SectionHeading size="lg">{product.name}</SectionHeading>
            {product.category || product.brand ? (
              <View className="flex-row items-center gap-2 mt-2">
                {product.category ? <CategoryChip category={product.category} /> : null}
                {product.brand ? (
                  <Text className="text-[13px] text-ink-soft dark:text-ink-softdark font-serif">
                    {product.brand}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View className="mt-6">
              <ProductStoreViewTable prices={prices} formatMoney={format} />
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </PaperSurface>
  );
}
