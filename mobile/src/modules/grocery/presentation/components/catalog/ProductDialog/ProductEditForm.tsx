import { View, Text, TextInput } from 'react-native';
import { useColorScheme } from 'nativewind';
import type { StoreType } from '@himan/shared/grocery';
import type { StorePrice } from '@/modules/grocery/presentation/hooks/useProductStores';
import { PressableScale } from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';
import { INPUT } from './constants';
import { Field } from './Field';
import { ProductStoreEditSection } from './ProductStoreEditSection';

export interface ProductEditFormValues {
  name: string;
  brand: string;
  category: string;
  packageSize: string;
  lifespanDays: string;
  notes: string;
}

interface ProductEditFormProps {
  form: ProductEditFormValues;
  onFormChange: (patch: Partial<ProductEditFormValues>) => void;
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
  onSave: () => void;
  saving: boolean;
}

export function ProductEditForm({
  form,
  onFormChange,
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
  onSave,
  saving,
}: ProductEditFormProps) {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const accentTextColor = colorScheme === 'dark' ? '#201e1d' : '#ffffff';

  return (
    <View className="mt-6 gap-4">
      <Field label="Category">
        <TextInput
          value={form.category}
          onChangeText={(v) => onFormChange({ category: v })}
          placeholder="Dairy, Produce, Snacks…"
          placeholderTextColor={c.inkSoft}
          className={INPUT}
        />
      </Field>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Package size">
            <TextInput
              value={form.packageSize}
              onChangeText={(v) => onFormChange({ packageSize: v })}
              placeholder="500g, 1L, 12-pack"
              placeholderTextColor={c.inkSoft}
              className={INPUT}
            />
          </Field>
        </View>
        <View className="flex-1">
          <Field label="Lifespan (days)">
            <TextInput
              value={form.lifespanDays}
              onChangeText={(v) => onFormChange({ lifespanDays: v.replace(/[^0-9]/g, '') })}
              placeholder="Days until it runs out"
              placeholderTextColor={c.inkSoft}
              keyboardType="number-pad"
              className={INPUT}
            />
          </Field>
        </View>
      </View>

      <ProductStoreEditSection
        prices={prices}
        unattachedStores={unattachedStores}
        priceDrafts={priceDrafts}
        aisleDrafts={aisleDrafts}
        onPriceChange={onPriceChange}
        onPriceCommit={onPriceCommit}
        onAisleChange={onAisleChange}
        onAisleCommit={onAisleCommit}
        onRemoveStore={onRemoveStore}
        showStorePicker={showStorePicker}
        onShowStorePicker={onShowStorePicker}
        onAddStore={onAddStore}
      />

      <PressableScale
        onPress={onSave}
        disabled={saving || !form.name.trim()}
        className="rounded-2xl py-3.5 items-center mt-1"
        style={{
          backgroundColor: c.accent,
          opacity: saving || !form.name.trim() ? 0.5 : 1,
        }}
      >
        <Text className="text-[15px] font-serifsemi" style={{ color: accentTextColor }}>
          {saving ? 'Saving…' : 'Save changes'}
        </Text>
      </PressableScale>
    </View>
  );
}
