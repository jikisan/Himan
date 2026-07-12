import { useState, useEffect } from 'react';
import { View, Text, Pressable, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CategoryType } from '@himan/shared/passwords';

interface CategoryModalProps {
  visible: boolean;
  category?: CategoryType | null;
  onSave: (data: { name: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const CategoryModal = ({
  visible,
  category,
  onSave,
  onDelete,
  onClose,
}: CategoryModalProps) => {
  const [name, setName] = useState('');

  const isEdit = !!category;

  useEffect(() => {
    if (visible) {
      setName(category?.name ?? '');
    }
  }, [visible, category?.id]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({ name: trimmed });
    setName('');
  };

  const handleClose = () => {
    setName('');
    onClose();
  };

  const canSave = name.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
            <Text className="text-base font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Edit Category' : 'New Category'}
            </Text>
            <Pressable
              onPress={handleClose}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
            >
              <Feather name="x" size={14} color="#6b7280" />
            </Pressable>
          </View>

          {/* Input */}
          <View className="px-6 py-5 gap-3">
            <TextInput
              autoFocus
              placeholder="Category name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleSave}
              maxLength={50}
              className="border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
            />
          </View>

          {/* Actions */}
          <View className="px-6 pb-6 gap-2">
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              className={`py-3.5 rounded-xl items-center ${
                canSave ? 'bg-indigo-500 active:bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <Text className="text-white font-semibold text-sm">
                {isEdit ? 'Update' : 'Create'}
              </Text>
            </Pressable>

            {isEdit && onDelete && (
              <Pressable
                onPress={onDelete}
                className="py-3.5 rounded-xl items-center border border-red-200 dark:border-red-900 active:bg-red-50 dark:active:bg-red-950/20"
              >
                <Text className="text-red-500 font-semibold text-sm">Delete Category</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
