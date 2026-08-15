import { View, Text } from 'react-native';
import type { StoreType } from '@himan/shared/grocery';
import type { StorePrice } from '@/modules/grocery/presentation/hooks/useProductStores';
import { LABEL } from './constants';
import { ProductStoreEditList } from './ProductStoreEditList';
import { ProductStorePicker } from './ProductStorePicker';

interface ProductStoreEditSectionProps {
  prices: StorePrice[];
  unattachedStores: StoreType[];
  priceDrafts: Record<string, string>;
  aisleDrafts: Record<string, string>;
  onPriceChange: (storeId: string, value: string) => void;
  onPriceCommit: (storeId: string, value: string) => void;
  onAisleChange: (storeId: string, value: string) => void;
  onAisleCommit: (storeId: string, value: string) => void;
  onRemoveStore: (storeId: string) => void;
  showStorePicker: boolean;
  onShowStorePicker: () => void;
  onAddStore: (storeId: string) => Promise<void>;
}

export function ProductStoreEditSection({
  prices,
  unattachedStores,
  priceDrafts,
  aisleDrafts,
  onPriceChange,
  onPriceCommit,
  onAisleChange,
  onAisleCommit,
  onRemoveStore,
  showStorePicker,
  onShowStorePicker,
  onAddStore,
}: ProductStoreEditSectionProps) {
  return (
    <View>
      <Text className={LABEL}>Where to buy</Text>
      <ProductStoreEditList
        prices={prices}
        priceDrafts={priceDrafts}
        aisleDrafts={aisleDrafts}
        onPriceChange={onPriceChange}
        onPriceCommit={onPriceCommit}
        onAisleChange={onAisleChange}
        onAisleCommit={onAisleCommit}
        onRemoveStore={onRemoveStore}
      />
      <ProductStorePicker
        visible={showStorePicker}
        unattachedStores={unattachedStores}
        onShow={onShowStorePicker}
        onAddStore={onAddStore}
      />
    </View>
  );
}
