import { View, Text, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import type { StorePrice } from '@/modules/grocery/presentation/hooks/useProductStores';
import { PressableScale } from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';
import { INPUT_CARD } from './constants';

interface ProductStoreEditListProps {
  prices: StorePrice[];
  priceDrafts: Record<string, string>;
  aisleDrafts: Record<string, string>;
  onPriceChange: (storeId: string, value: string) => void;
  onPriceCommit: (storeId: string, value: string) => void;
  onAisleChange: (storeId: string, value: string) => void;
  onAisleCommit: (storeId: string, value: string) => void;
  onRemoveStore: (storeId: string) => void;
}

export function ProductStoreEditList({
  prices,
  priceDrafts,
  aisleDrafts,
  onPriceChange,
  onPriceCommit,
  onAisleChange,
  onAisleCommit,
  onRemoveStore,
}: ProductStoreEditListProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  if (prices.length === 0) {
    return (
      <Text className="text-[13px] text-ink-soft dark:text-ink-softdark font-serif mb-2">
        No stores yet. Add one below.
      </Text>
    );
  }

  return (
    <View className="gap-2.5">
      {prices.map((sp) => (
        <View key={sp.store.id} className="rounded-2xl bg-surface dark:bg-surface-dark p-3.5">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-[15px] font-serifsemi text-ink dark:text-ink-dark">
              {sp.store.name}
            </Text>
            <PressableScale
              onPress={() => onRemoveStore(sp.store.id)}
              hitSlop={8}
              className="w-7 h-7 rounded-full items-center justify-center"
            >
              <Feather name="trash-2" size={14} color={c.inkSoft} />
            </PressableScale>
          </View>
          <View className="flex-row items-start gap-2">
            <View className="flex-[1.2]">
              <Text className="text-[11px] font-serifsemi uppercase tracking-wide text-ink-soft dark:text-ink-softdark mb-1">
                Price
              </Text>
              <View className="flex-row items-center rounded-lg bg-paper dark:bg-paper-dark px-3">
                <Feather name="tag" size={13} color={c.inkSoft} />
                <TextInput
                  value={priceDrafts[sp.store.id] ?? ''}
                  onChangeText={(v) => onPriceChange(sp.store.id, v.replace(/[^0-9.]/g, ''))}
                  onBlur={() => onPriceCommit(sp.store.id, priceDrafts[sp.store.id] ?? '')}
                  placeholder="0.00"
                  placeholderTextColor={c.inkSoft}
                  keyboardType="decimal-pad"
                  className="flex-1 py-2 pl-2 text-ink dark:text-ink-dark font-serif"
                  style={{ fontVariant: ['tabular-nums'] }}
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-[11px] font-serifsemi uppercase tracking-wide text-ink-soft dark:text-ink-softdark mb-1">
                Aisle
              </Text>
              <TextInput
                value={aisleDrafts[sp.store.id] ?? ''}
                onChangeText={(v) => onAisleChange(sp.store.id, v)}
                onBlur={() => onAisleCommit(sp.store.id, aisleDrafts[sp.store.id] ?? '')}
                placeholder="Aisle / section"
                placeholderTextColor={c.inkSoft}
                className={INPUT_CARD}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
