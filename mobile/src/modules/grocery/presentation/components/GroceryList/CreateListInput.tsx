import { View, TextInput, Pressable, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface CreateListInputProps {
  isCreating: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onStartCreating: () => void;
  onCancelCreating: () => void;
}

export function CreateListInput({
  isCreating,
  value,
  onChangeText,
  onSubmit,
  onStartCreating,
  onCancelCreating,
}: CreateListInputProps) {
  if (isCreating) {
    return (
      <View className="flex flex-row gap-2">
        <TextInput
          placeholder="List name..."
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          autoFocus
          className="flex-1 border border-rule dark:border-rule-dark rounded-lg p-3 text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark"
        />
        <Pressable onPress={onSubmit} className="bg-accent dark:bg-accent-dark rounded-lg px-4 justify-center">
          <Feather name="check" size={20} color="#ffffff" />
        </Pressable>
        <Pressable
          onPress={onCancelCreating}
          className="bg-surface dark:bg-surface-dark rounded-lg px-4 justify-center"
        >
          <Feather name="x" size={20} color="#ffffff" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onStartCreating}
      className="flex flex-row items-center gap-2.5 p-3.5 bg-sticky dark:bg-sticky-dark rounded-xl border border-rule dark:border-rule-dark active:opacity-80"
    >
      <View className="w-6 h-6 rounded-full bg-accent dark:bg-accent-dark items-center justify-center">
        <Feather name="plus" size={14} color="#ffffff" />
      </View>
      <Text className="text-sm font-medium text-accent-text dark:text-accent-textdark">New list</Text>
    </Pressable>
  );
}
