import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import type { GroceryItemType, UpdateGroceryItemDto } from '@himan/shared/grocery';

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GroceryItemType | null;
  onSave: (id: string, dto: UpdateGroceryItemDto) => void;
  onDelete: (id: string) => void;
}

export const ItemDetailSheet = ({
  open,
  onOpenChange,
  item,
  onSave,
  onDelete,
}: ItemDetailSheetProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category ?? '');
      setQuantity(String(item.quantity));
      setUnit(item.unit ?? '');
      setNotes(item.notes ?? '');
    }
  }, [item]);

  const handleSave = () => {
    if (!item || !name.trim()) return;
    onSave(item.id, {
      name: name.trim(),
      category: category.trim() || undefined,
      quantity: parseFloat(quantity) || 1,
      unit: unit.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert('Delete Item', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          onDelete(item.id);
          onOpenChange(false);
        },
      },
    ]);
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => onOpenChange(false)}
        />
        <Pressable className="bg-white dark:bg-gray-900 rounded-t-2xl p-6 max-h-[80%]">
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Item
            </Text>

            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={handleSave}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                />
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</Text>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g., Dairy, Produce"
                  placeholderTextColor="#9ca3af"
                  className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                />
              </View>

              <View className="flex flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity</Text>
                  <TextInput
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit</Text>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="e.g., kg, pcs, L"
                    placeholderTextColor="#9ca3af"
                    className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g., organic, low fat"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
                  textAlignVertical="top"
                />
              </View>

              <View className="flex flex-row gap-2 pt-2">
                <Pressable
                  onPress={handleSave}
                  className="flex-1 bg-indigo-500 rounded-lg py-3 items-center"
                >
                  <Text className="text-white font-medium">Save</Text>
                </Pressable>
                <Pressable
                  onPress={handleDelete}
                  className="bg-red-500 rounded-lg py-3 px-4 items-center"
                >
                  <Text className="text-white font-medium">Delete</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
