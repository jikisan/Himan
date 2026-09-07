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
        <Pressable className="bg-paper dark:bg-paper-dark rounded-2xl p-6 w-full max-w-sm">
          <View className="flex flex-col items-center mb-6">
            <View className="w-12 h-12 bg-sticky dark:bg-sticky-dark rounded-full items-center justify-center mb-3">
              <Feather name="shopping-bag" size={24} color="#0088b0" />
            </View>
            <Text className="text-xl font-semibold text-ink dark:text-ink-dark mb-1">
              End Shopping Session
            </Text>
            <Text className="text-sm text-ink-soft dark:text-ink-softdark text-center">
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
                  ? 'bg-surface dark:bg-surface-dark border-rule dark:border-rule-dark opacity-50'
                  : 'bg-sticky dark:bg-sticky-dark border-rule dark:border-rule-dark active:opacity-80'
              }`}
            >
              <View className="w-10 h-10 bg-accent dark:bg-accent-dark rounded-full items-center justify-center">
                <Feather name="check" size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-ink dark:text-ink-dark text-base">
                  {isCompleting ? 'Completing...' : 'Complete Shopping'}
                </Text>
                <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-1">
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
                  ? 'bg-surface dark:bg-surface-dark border-rule dark:border-rule-dark opacity-50'
                  : 'bg-surface dark:bg-surface-dark border-margin active:opacity-80'
              }`}
            >
              <View className="w-10 h-10 bg-margin rounded-full items-center justify-center">
                <Feather name="x" size={18} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-margin text-base">
                  {isCancelling ? 'Cancelling...' : 'Cancel Shopping'}
                </Text>
                <Text className="text-xs text-ink-soft dark:text-ink-softdark mt-1">
                  Discard session without saving
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            onPress={() => onOpenChange(false)}
            disabled={busy}
            className="mt-4 py-3 border border-rule dark:border-rule-dark rounded-xl"
          >
            <Text className="text-center text-ink-soft dark:text-ink-softdark font-medium">
              Keep Shopping
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
