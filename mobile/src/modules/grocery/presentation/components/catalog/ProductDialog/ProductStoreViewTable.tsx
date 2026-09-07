import { View, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { StorePrice } from '@/modules/grocery/presentation/hooks/useProductStores';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';
import { LABEL } from './constants';

interface ProductStoreViewTableProps {
  prices: StorePrice[];
  formatMoney: (n: number) => string;
}

export function ProductStoreViewTable({ prices, formatMoney }: ProductStoreViewTableProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  if (prices.length === 0) {
    return (
      <View className="rounded-2xl bg-surface dark:bg-surface-dark p-4 items-center">
        <Feather name="shopping-cart" size={22} color={c.inkSoft} />
        <Text className="mt-2 text-center text-[13px] text-ink-soft dark:text-ink-softdark font-serif">
          No store prices yet. Finish an errand to record them.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center px-4">
        <Text className={`flex-1 ${LABEL} mb-0`}>Store</Text>
        <Text className={`w-24 text-center ${LABEL} mb-0`}>Aisle</Text>
        <Text className={`w-20 text-right ${LABEL} mb-0`}>Price</Text>
      </View>
      {prices.map((sp, i) => {
        const isBest = i === 0 && sp.price != null && prices.length > 1;
        return (
          <View
            key={sp.store.id}
            className="flex-row items-center rounded-2xl bg-surface dark:bg-surface-dark px-4 py-3"
          >
            <View className="flex-1 flex-row items-center gap-2">
              <Text className="text-[15px] font-serifsemi text-ink dark:text-ink-dark">
                {sp.store.name}
              </Text>
              {isBest ? (
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: c.sticky }}>
                  <Text
                    className="text-[10px] uppercase tracking-wider font-serifsemi"
                    style={{ color: c.accentText }}
                  >
                    Best
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              className="w-24 text-center text-[13px] font-serif text-ink-soft dark:text-ink-softdark"
              numberOfLines={1}
            >
              {sp.aisle || '—'}
            </Text>
            <Text
              className="w-20 text-right text-[15px] font-serifsemi"
              style={{
                fontVariant: ['tabular-nums'],
                color: isBest ? c.accentText : c.ink,
              }}
            >
              {sp.price != null ? formatMoney(sp.price) : '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
