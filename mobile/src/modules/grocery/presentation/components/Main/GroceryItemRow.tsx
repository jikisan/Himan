import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryItemType } from '@himan/shared/grocery';
import { GroceryItem } from '@himan/shared/grocery';

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
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState('');

  const handleCheckboxClick = () => {
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

  const handleDelete = () => {
    Alert.alert(`Delete "${item.name}"`, `Are you sure you want to delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  return (
    <>
      <Pressable
        onPress={handleCheckboxClick}
        onLongPress={handleDelete}
        className={`flex flex-row items-center gap-3 px-3 py-3 rounded-xl ${
          item.isChecked ? 'opacity-60' : 'bg-white dark:bg-gray-800'
        }`}
      >
        {/* Circular checkbox */}
        <Pressable
          onPress={handleCheckboxClick}
          className={`flex-shrink-0 h-[22px] w-[22px] rounded-full border-2 flex items-center justify-center ${
            item.isChecked
              ? 'bg-indigo-500 border-indigo-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {item.isChecked && <Feather name="check" size={12} color="#ffffff" />}
        </Pressable>

        {/* Item info */}
        <View className="flex-1 min-w-0">
          <View className="flex flex-row items-center gap-2">
            <Text
              className={`text-sm font-medium ${
                item.isChecked ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'
              }`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {entity.quantityLabel && (
              <Text className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {entity.quantityLabel}
              </Text>
            )}
          </View>
          {item.notes && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" numberOfLines={1}>
              {item.notes}
            </Text>
          )}
          {item.isChecked && item.price != null && (
            <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              ₱{item.price.toFixed(2)}
            </Text>
          )}
        </View>

        {/* Actions */}
        <View className="flex flex-row items-center gap-0.5 flex-shrink-0">
          <Pressable
            onPress={() => onEdit(item)}
            className="p-2"
          >
            <Feather name="edit-2" size={14} color="#6b7280" />
          </Pressable>
          <Pressable
            onPress={handleDelete}
            className="p-2"
          >
            <Feather name="trash-2" size={14} color="#ef4444" />
          </Pressable>
        </View>
      </Pressable>

      {/* Price input modal */}
      <Modal
        visible={showPriceInput}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceInput(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setShowPriceInput(false)}
        >
          <Pressable className="bg-white dark:bg-gray-900 rounded-t-2xl p-6">
            <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {item.name} {entity.quantityLabel && `× ${entity.quantityLabel}`}
            </Text>
            <TextInput
              placeholder="Price (optional)"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              onSubmitEditing={handlePriceSubmit}
              className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 mb-4 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
              autoFocus
            />
            <View className="flex flex-row gap-3">
              <Pressable
                onPress={handlePriceSubmit}
                className="flex-1 bg-indigo-500 rounded-lg p-3 items-center"
              >
                <Text className="text-white font-medium">Done</Text>
              </Pressable>
              <Pressable
                onPress={handlePriceSkip}
                className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-3 items-center"
              >
                <Text className="text-gray-900 dark:text-white font-medium">Skip</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};
