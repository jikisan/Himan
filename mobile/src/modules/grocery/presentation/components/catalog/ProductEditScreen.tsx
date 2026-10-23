import { useState } from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useProductCatalog } from '@/modules/grocery/presentation/hooks/useProductCatalog';
import { useProductStores } from '@/modules/grocery/presentation/hooks/useProductStores';
import {
  PaperSurface,
  SectionHeading,
  PressableScale,
} from '@/modules/grocery/presentation/components/notebook';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';
import { ProductEditForm } from './ProductDialog/ProductEditForm';
import { Field } from './ProductDialog/Field';
import { INPUT } from './ProductDialog/constants';
import { useProductEditForm } from './ProductDialog/useProductEditForm';
import { useStoreDrafts } from './ProductDialog/useStoreDrafts';
import { KeyboardSafe } from '@/modules/shared/components/KeyboardSafe';

export function ProductEditScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;

  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { products, updateProduct } = useProductCatalog();
  const product = products.find((p) => p.id === productId) ?? null;

  const { form, patchForm, saving, handleSave } = useProductEditForm(
    product,
    async (id, dto) => {
      await updateProduct(id, dto);
    }
  );

  const { prices, unattachedStores, updateDetails, removeStore } = useProductStores(
    productId ?? null
  );
  const { priceDrafts, aisleDrafts, setPriceDraft, setAisleDraft, commitPrice, commitAisle, flushDrafts } =
    useStoreDrafts({ prices, updateDetails });
  const [showStorePicker, setShowStorePicker] = useState(false);

  const handleAddStore = async (storeId: string) => {
    await updateDetails({ storeId, price: null });
    setShowStorePicker(false);
  };

  const handleSaveAll = async () => {
    await flushDrafts();
    await handleSave();
    router.back();
  };

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center px-5 pt-2 pb-3 border-b border-rule dark:border-rule-dark">
          <PressableScale
            onPress={() => router.back()}
            hitSlop={8}
            className="flex-row items-center gap-1"
          >
            <Feather name="chevron-left" size={22} color={c.ink} />
            <Text className="text-ink dark:text-ink-dark font-serif">Back</Text>
          </PressableScale>
        </View>

        <KeyboardSafe>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ padding: 22, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeading size="lg">Edit product</SectionHeading>

          {product ? (
            <View className="mt-6">
                <Field label="Name">
                  <TextInput
                    value={form.name}
                    onChangeText={(name) => patchForm({ name })}
                    placeholder="Product name"
                    placeholderTextColor={c.inkSoft}
                    className={INPUT}
                  />
                </Field>

                <ProductEditForm
                  form={form}
                  onFormChange={patchForm}
                  prices={prices}
                  unattachedStores={unattachedStores}
                  priceDrafts={priceDrafts}
                  aisleDrafts={aisleDrafts}
                  onPriceChange={setPriceDraft}
                  onPriceCommit={commitPrice}
                  onAisleChange={setAisleDraft}
                  onAisleCommit={commitAisle}
                  onRemoveStore={removeStore}
                  showStorePicker={showStorePicker}
                  onShowStorePicker={() => setShowStorePicker(true)}
                  onAddStore={handleAddStore}
                  onSave={handleSaveAll}
                  saving={saving}
                />
              </View>
          ) : null}
        </ScrollView>
        </KeyboardSafe>
      </SafeAreaView>
    </PaperSurface>
  );
}
