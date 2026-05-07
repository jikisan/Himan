import { useState } from 'react';
import { View, Text, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface AddShopperModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddShopper: (email: string) => Promise<unknown>;
  isAdding: boolean;
}

export const AddShopperModal = ({
  open,
  onOpenChange,
  onAddShopper,
  isAdding,
}: AddShopperModalProps) => {
  const [email, setEmail] = useState('');

  const handleAdd = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await onAddShopper(trimmed);
      setEmail('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-center items-center px-6"
        onPress={() => onOpenChange(false)}
      >
        <Pressable className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Add User
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Invite someone to shop together in this session
          </Text>

          <View className="space-y-4 gap-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email address
              </Text>
              <TextInput
                placeholder="Enter shopper's email..."
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={handleAdd}
                keyboardType="email-address"
                autoCapitalize="none"
                className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
              />
            </View>

            <Pressable
              onPress={handleAdd}
              disabled={isAdding || !email.trim()}
              className={`flex flex-row items-center justify-center gap-2 py-3 rounded-lg ${
                isAdding || !email.trim() ? 'bg-gray-300 dark:bg-gray-700' : 'bg-indigo-500'
              }`}
            >
              <Feather name="user-plus" size={18} color="#ffffff" />
              <Text className="text-white font-medium">
                {isAdding ? 'Adding...' : 'Add User'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
