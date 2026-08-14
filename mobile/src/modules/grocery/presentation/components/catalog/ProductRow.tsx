import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { ProductType } from '@himan/shared/grocery';
import { CategoryChip } from '../notebook/CategoryChip';
import { notebook } from '../../theme/notebook';

export function ProductRow({
  product,
  onPress,
  onToggleFavorite,
}: {
  product: ProductType;
  onPress: () => void;
  onToggleFavorite: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-5 py-3.5 border-b border-rule dark:border-rule-dark active:bg-black/5"
    >
      <View className="flex-1">
        <Text className="text-[17px] font-serif text-ink dark:text-ink-dark">{product.name}</Text>
        <View className="flex-row items-center gap-2 mt-0.5">
          {product.category ? <CategoryChip category={product.category} /> : null}
          {product.brand ? (
            <Text className="text-[14px] font-serif text-ink-soft dark:text-ink-softdark">{product.brand}</Text>
          ) : null}
          {product.purchaseCount > 0 ? (
            <Text className="text-[14px] font-serif text-ink-soft dark:text-ink-softdark">
              bought {product.purchaseCount}×
            </Text>
          ) : null}
        </View>
      </View>
      <Pressable onPress={onToggleFavorite} hitSlop={10} className="p-1 active:opacity-60">
        <Feather
          name="star"
          size={20}
          color={product.isFavorite ? c.accent : c.inkSoft}
          style={{ opacity: product.isFavorite ? 1 : 0.5 }}
        />
      </Pressable>
    </Pressable>
  );
}
