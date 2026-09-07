import { useState } from 'react';
import { View, Pressable, TextInput, Modal, Alert, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import type { GroceryItemType } from '@himan/shared/grocery';
import { GroceryItem } from '@himan/shared/grocery';
import { Checkbox } from '@/modules/grocery/presentation/shared/Checkbox';
import { ItemRowContent } from '@/modules/grocery/presentation/shared/ItemRowContent';
import { notebook } from '@/modules/grocery/presentation/theme/notebook';

interface GroceryItemRowProps {
  item: GroceryItemType;
  isSessionActive: boolean;
  onCheck: (itemId: string, price?: number | null) => void;
  onUncheck: (itemId: string) => void;
  onEdit: (item: GroceryItemType) => void;
  onDelete: (itemId: string) => void;
}

export const GroceryItemRow = ({
  item,
  isSessionActive,
  onCheck,
  onUncheck,
  onEdit,
  onDelete,
}: GroceryItemRowProps) => {
  const entity = new GroceryItem(item);
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? notebook.dark : notebook.light;
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState('');

  const toggleCheck = () => {
    if (item.isChecked) {
      onUncheck(item.id);
      return;
    }
    if (isSessionActive) {
      setShowPriceInput(true);
    } else {
      onCheck(item.id);
    }
  };

  const handlePriceSubmit = () => {
    const parsedPrice = price ? parseFloat(price) : null;
    onCheck(item.id, parsedPrice);
    setShowPriceInput(false);
    setPrice('');
  };

  const handlePriceSkip = () => {
    onCheck(item.id, null);
    setShowPriceInput(false);
    setPrice('');
  };

  // Long-press opens the quiet action menu — no always-visible destructive icon.
  const openActions = () => {
    Alert.alert(item.name, undefined, [
      { text: 'Edit', onPress: () => onEdit(item) },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
      {/* Whole row is the check target. Long-press → actions. */}
      <Pressable
        onPress={toggleCheck}
        onLongPress={openActions}
        className="flex flex-row items-center gap-3 px-5 py-3.5 border-b border-rule dark:border-rule-dark active:bg-black/5"
      >
        <Checkbox checked={item.isChecked} />
        <ItemRowContent
          name={item.name}
          quantityLabel={entity.quantityLabel}
          notes={item.notes}
          price={item.price}
          checked={item.isChecked}
        />
      </Pressable>

      {/* Price input modal */}
      <Modal
        visible={showPriceInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceInput(false)}
      >
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={() => setShowPriceInput(false)}>
          <Pressable className="bg-paper dark:bg-paper-dark rounded-t-3xl p-6">
            <View className="items-center mb-4">
              <View className="w-10 h-1 rounded-full bg-ink-faint/40 dark:bg-ink-faintdark/40" />
            </View>
            <Text className="text-[15px] font-serif text-ink-soft dark:text-ink-softdark mb-4">
              {item.name} {entity.quantityLabel && `× ${entity.quantityLabel}`}
            </Text>
            <TextInput
              placeholder="Price (optional)"
              placeholderTextColor={c.inkFaint}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              onSubmitEditing={handlePriceSubmit}
              className="border border-rule dark:border-rule-dark rounded-sm p-3 mb-4 font-serif text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark"
              autoFocus
            />
            <View className="flex flex-row gap-3">
              <Pressable
                onPress={handlePriceSubmit}
                className="flex-1 bg-accent dark:bg-accent-dark rounded-sm p-3 items-center"
              >
                <Text className="text-white font-serifsemi">Done</Text>
              </Pressable>
              <Pressable
                onPress={handlePriceSkip}
                className="flex-1 bg-surface dark:bg-surface-dark rounded-sm p-3 items-center"
              >
                <Text className="text-ink dark:text-ink-dark font-serif">Skip</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
