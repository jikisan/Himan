import { useEffect, useState } from 'react';
import { View, Modal, Pressable, ScrollView, Keyboard, Platform } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { ProductType, UpdateProductDto } from '@himan/shared/grocery';
import { useProductStores } from '@/modules/grocery/presentation/hooks/useProductStores';
import { ProductDialogHeader } from './ProductDialogHeader';
import { ProductEditForm } from './ProductEditForm';
import { ProductStoreViewTable } from './ProductStoreViewTable';
import { useDialogAnimation } from './useDialogAnimation';
import { useProductEditForm } from './useProductEditForm';
import { useStoreDrafts } from './useStoreDrafts';

interface ProductDialogProps {
  product: ProductType | null;
  onClose: () => void;
  onUpdate: (id: string, dto: UpdateProductDto) => Promise<void>;
  onDelete: (p: ProductType) => void;
  formatMoney: (n: number) => string;
}

export function ProductDialog({ product, onClose, onUpdate, onDelete, formatMoney }: ProductDialogProps) {
  const { rendered, anim } = useDialogAnimation(product);
  const p = product ?? rendered;

  const backdropStyle = useAnimatedStyle(() => ({ opacity: anim.value }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ scale: 0.96 + anim.value * 0.04 }],
  }));

  const { prices, unattachedStores, updateDetails, removeStore } = useProductStores(p?.id ?? null);
  const { priceDrafts, aisleDrafts, setPriceDraft, setAisleDraft, commitPrice, commitAisle, flushDrafts } =
    useStoreDrafts({ prices, updateDetails });
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const { isEditing, setIsEditing, form, patchForm, saving, handleSave } = useProductEditForm(
    product,
    onUpdate
  );

  useEffect(() => {
    setShowStorePicker(false);
  }, [product?.id]);

  const handleAddStore = async (storeId: string) => {
    await updateDetails({ storeId, price: null });
    setShowStorePicker(false);
  };

  const handleSaveAll = async () => {
    await flushDrafts();
    await handleSave();
  };

  return (
    <Modal
      visible={!!rendered}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-center items-center px-5"
        style={{ paddingBottom: keyboardHeight }}
      >
        <Pressable className="absolute inset-0" onPress={onClose}>
          <Animated.View className="flex-1 bg-black/50" style={backdropStyle} />
        </Pressable>

        <Animated.View
          style={[cardStyle, { maxHeight: '88%' }]}
          className="w-full bg-paper dark:bg-paper-dark rounded-3xl overflow-hidden"
        >
          {p ? (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={{ padding: 22 }}
              showsVerticalScrollIndicator={false}
            >
              <ProductDialogHeader
                product={p}
                isEditing={isEditing}
                formName={form.name}
                onEditToggle={() => setIsEditing((v) => !v)}
                onNameChange={(name) => patchForm({ name })}
                onDelete={onDelete}
                onClose={onClose}
              />

              {isEditing ? (
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
              ) : (
                <View className="mt-6">
                  <ProductStoreViewTable prices={prices} formatMoney={formatMoney} />
                </View>
              )}
            </ScrollView>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
