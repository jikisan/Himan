import { View, Text, Pressable, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface EndShoppingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onCancel: () => void;
  isCompleting: boolean;
  isCancelling: boolean;
}

export const EndShoppingModal = ({
  open,
  onOpenChange,
  onComplete,
  onCancel,
  isCompleting,
  isCancelling,
}: EndShoppingModalProps) => {
  const busy = isCompleting || isCancelling;

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
        <Pressable className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm">
          <View className="flex flex-col items-center mb-6">
            <View className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-3">
              <Feather name="shopping-bag" size={24} color="#6366f1" />
            </View>
            <Text className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
              End Shopping Session
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Choose how you'd like to finish this session
            </Text>
          </View>

          <View className="flex space-y-3 gap-2">
            <Pressable
              onPress={() => {
                onComplete();
                onOpenChange(false);
              }}
              disabled={busy}
              className={`flex flex-row items-center gap-3 p-4 rounded-xl border-2 ${
                busy
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                  : 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 active:bg-green-100 dark:active:bg-green-900/50'
              }`}
            >
              <View className="w-10 h-10 bg-green-500 rounded-full items-center justify-center">
                <Feather name="check" size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 dark:text-white text-base">
                  {isCompleting ? 'Completing...' : 'Complete Shopping'}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Save session and update product history
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                onCancel();
                onOpenChange(false);
              }}
              disabled={busy}
              className={`flex flex-row items-center gap-3 p-4 rounded-xl border-2 ${
                busy
                  ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                  : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 active:bg-red-100 dark:active:bg-red-900/50'
              }`}
            >
              <View className="w-10 h-10 bg-red-500 rounded-full items-center justify-center">
                <Feather name="x" size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-red-600 dark:text-red-400 text-base">
                  {isCancelling ? 'Cancelling...' : 'Cancel Shopping'}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Discard session without saving
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={() => onOpenChange(false)}
            disabled={busy}
            className="mt-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl"
          >
            <Text className="text-center text-gray-600 dark:text-gray-400 font-medium">
              Keep Shopping
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
