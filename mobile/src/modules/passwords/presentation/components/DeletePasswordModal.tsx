import { View, Text, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { PasswordType } from '@himan/shared/passwords';

interface DeletePasswordModalProps {
  password: PasswordType | null;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeletePasswordModal = ({
  password,
  visible,
  onConfirm,
  onCancel,
}: DeletePasswordModalProps) => {
  if (!password) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <View className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm overflow-hidden">
          <View className="items-center px-6 pt-8 pb-6 gap-3">
            <View className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center">
              <Feather name="trash-2" size={24} color="#ef4444" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-lg font-bold text-gray-900 dark:text-white text-center">
                Delete Password
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Are you sure you want to delete{' '}
                <Text className="font-semibold text-gray-700 dark:text-gray-200">
                  {password.title}
                </Text>
                ? This cannot be undone.
              </Text>
            </View>
          </View>

          <View className="flex-row border-t border-gray-100 dark:border-gray-800">
            <Pressable
              onPress={onCancel}
              className="flex-1 py-4 items-center border-r border-gray-100 dark:border-gray-800 active:bg-gray-50 dark:active:bg-gray-800"
            >
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              className="flex-1 py-4 items-center active:bg-red-50 dark:active:bg-red-950/20"
            >
              <Text className="text-sm font-semibold text-red-500">Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
