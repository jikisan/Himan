import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { ProductType } from '@himan/shared/grocery';
import { CategoryChip } from '../notebook/CategoryChip';
import { notebook } from '../../theme/notebook';

export function ProductRow({
  product,
  onPress,
}: {
  product: ProductType;
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 px-5 py-3.5 border-b border-rule dark:border-rule-dark active:bg-black/5"
    >
      <View className="flex-col flex-1">

        <View className="flex-row items-center gap-2 mt-0.5">
          <Text className="text-[17px] font-serif text-ink dark:text-ink-dark">{product.name}</Text>
          {product.packageSize ? (
              <Text className="text-[14px] font-serif text-ink-soft dark:text-ink-softdark">
                {product.packageSize}
              </Text>
          ) : null}
        </View>

        {product.category ? <CategoryChip category={product.category} /> : null}

      </View>
      <Feather name="chevron-right" size={18} color={c.inkFaint} />
    </Pressable>
  );
}
