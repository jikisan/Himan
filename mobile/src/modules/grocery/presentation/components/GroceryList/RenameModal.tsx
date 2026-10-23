import { View, TextInput, Pressable, Text } from 'react-native';
import { KeyboardSafe } from '@/modules/shared/components/KeyboardSafe';

interface RenameModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function RenameModal({
  visible,
  value,
  onChangeText,
  onSubmit,
  onCancel,
}: RenameModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <KeyboardSafe className="absolute inset-0 bg-black/40 justify-center items-center px-6">
      <View className="bg-paper dark:bg-paper-dark rounded-2xl p-6 w-full">
        <Text className="text-xl font-serifsemi text-ink dark:text-ink-dark mb-4">
          Rename List
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          autoFocus
          className="border border-rule dark:border-rule-dark rounded-lg p-3 text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark mb-4"
        />
        <View className="flex flex-row gap-2">
          <Pressable
            onPress={onSubmit}
            className="flex-1 bg-accent dark:bg-accent-dark rounded-lg py-3 items-center"
          >
            <Text className="text-white font-medium">Save</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            className="flex-1 bg-surface dark:bg-surface-dark rounded-lg py-3 items-center"
          >
            <Text className="text-white font-medium">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardSafe>
  );
}
