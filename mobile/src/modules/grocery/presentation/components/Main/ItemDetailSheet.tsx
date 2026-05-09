import { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import type { GroceryItemType, UpdateGroceryItemDto, CreateGroceryItemDto } from '@himan/shared/grocery';

type ItemDetailMode = 'add' | 'edit';

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GroceryItemType | null;
  mode?: ItemDetailMode;
  onSave: (id: string, dto: UpdateGroceryItemDto) => void;
  onAdd?: (dto: CreateGroceryItemDto) => void;
  onDelete: (id: string) => void;
  listId?: string | null;
}

export const ItemDetailSheet = ({
  open,
  onOpenChange,
  item,
  mode = 'edit',
  onSave,
  onAdd,
  onDelete,
  listId,
}: ItemDetailSheetProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');
  const insets = useSafeAreaInsets();

  const isAddMode = mode === 'add';

  useEffect(() => {
    if (isAddMode) {
      setName('');
      setCategory('');
      setQuantity('1');
      setUnit('');
      setNotes('');
    } else if (item) {
      setName(item.name);
      setCategory(item.category ?? '');
      setQuantity(String(item.quantity));
      setUnit(item.unit ?? '');
      setNotes(item.notes ?? '');
    }
  }, [item, isAddMode, open]);

  const handleSave = () => {
    if (!name.trim()) return;
    
    if (isAddMode) {
      if (!onAdd) return;
      onAdd({
        listId: listId || '',
        name: name.trim(),
        category: category.trim() || undefined,
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      if (!item) return;
      onSave(item.id, {
        name: name.trim(),
        category: category.trim() || undefined,
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item || isAddMode) return;
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
        <Pressable className="bg-white dark:bg-gray-900 rounded-t-3xl max-h-[85%] shadow-2xl">
          <ScrollView keyboardShouldPersistTaps="handled" className="p-6" contentContainerStyle={{ paddingBottom: insets.bottom }}>
            {/* Drag Handle */}
            <View className="items-center mb-4">
              <View className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
            </View>

            {/* Header */}
            <View className="flex flex-row items-center justify-between mb-6">
              <View className="flex flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 items-center justify-center">
                  <Feather name={isAddMode ? 'plus' : 'edit-2'} size={20} color="#6366f1" />
                </View>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  {isAddMode ? 'Add Item' : 'Edit Item'}
                </Text>
              </View>
              <Pressable
                onPress={() => onOpenChange(false)}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center active:bg-gray-200 dark:active:bg-gray-700"
              >
                <Feather name="x" size={18} color="#6b7280" />
              </Pressable>
            </View>

            {/* Form */}
            <View className="gap-5">
              {/* Name - Full width */}
              <View>
                <View className="flex flex-row items-center gap-2 mb-2">
                  <Feather name="tag" size={14} color="#6366f1" />
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">Item Name</Text>
                </View>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  onSubmitEditing={handleSave}
                  placeholder="Enter item name"
                  placeholderTextColor="#9ca3af"
                  autoFocus
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 focus:border-indigo-500"
                />
              </View>

              {/* Category */}
              <View>
                <View className="flex flex-row items-center gap-2 mb-2">
                  <Feather name="folder" size={14} color="#6366f1" />
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">Category</Text>
                </View>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g., Dairy, Produce, Pantry"
                  placeholderTextColor="#9ca3af"
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 focus:border-indigo-500"
                />
              </View>

              {/* Quantity & Unit - Row */}
              <View className="flex flex-row gap-3">
                <View className="flex-[0.4]">
                  <View className="flex flex-row items-center gap-2 mb-2">
                    <Feather name="hash" size={14} color="#6366f1" />
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">Qty</Text>
                  </View>
                  <TextInput
                    value={quantity}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
                      setQuantity(filtered);
                    }}
                    keyboardType="decimal-pad"
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 focus:border-indigo-500 text-center"
                  />
                </View>
                <View className="flex-1">
                  <View className="flex flex-row items-center gap-2 mb-2">
                    <Feather name="box" size={14} color="#6366f1" />
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">Unit</Text>
                  </View>
                  <TextInput
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="kg, pcs, L"
                    placeholderTextColor="#9ca3af"
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 focus:border-indigo-500"
                  />
                </View>
              </View>

              {/* Notes */}
              <View>
                <View className="flex flex-row items-center gap-2 mb-2">
                  <Feather name="file-text" size={14} color="#6366f1" />
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notes</Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500">(Optional)</Text>
                </View>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g., organic, low fat, preferred brand"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-3.5 text-base text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 focus:border-indigo-500 min-h-[80px]"
                  textAlignVertical="top"
                />
              </View>

              {/* Action Buttons */}
              <View className="flex flex-row gap-3 pt-2">
                <Pressable
                  onPress={handleSave}
                  disabled={!name.trim()}
                  className={`flex-1 flex flex-row items-center justify-center gap-2 py-3.5 rounded-xl ${
                    name.trim() ? 'bg-indigo-500 active:bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <Feather name="check" size={18} color="#ffffff" />
                  <Text className="text-white font-semibold text-base">
                    {isAddMode ? 'Add Item' : 'Save Changes'}
                  </Text>
                </Pressable>
                {!isAddMode && (
                  <Pressable
                    onPress={handleDelete}
                    className="flex flex-row items-center justify-center gap-2 bg-red-500 active:bg-red-600 rounded-xl py-3.5 px-5"
                  >
                    <Feather name="trash-2" size={18} color="#ffffff" />
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};
