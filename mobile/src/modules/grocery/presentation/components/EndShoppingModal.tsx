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
          <View className="flex flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              End Shopping
            </Text>
            <Pressable onPress={() => onOpenChange(false)} disabled={busy} className="p-1">
              <Feather name="x" size={18} color="#6b7280" />
            </Pressable>
          </View>

          <Text className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            How would you like to end this shopping session?
          </Text>

          <View className="space-y-2">
            <Pressable
              onPress={() => {
                onComplete();
                onOpenChange(false);
              }}
              disabled={busy}
              className="flex flex-row items-center gap-3 p-4 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800"
            >
              <Feather name="check-circle" size={20} color="#22c55e" />
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  {isCompleting ? 'Completing...' : 'Complete Shopping'}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
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
              className="flex flex-row items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800"
            >
              <Feather name="x-circle" size={20} color="#ef4444" />
              <View className="flex-1">
                <Text className="font-medium text-red-600 dark:text-red-400">
                  {isCancelling ? 'Cancelling...' : 'Cancel Shopping'}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Discard session without saving
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
