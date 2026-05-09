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
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
        />
        <Pressable onPress={onSubmit} className="bg-indigo-500 rounded-lg px-4 justify-center">
          <Feather name="check" size={20} color="#ffffff" />
        </Pressable>
        <Pressable
          onPress={onCancelCreating}
          className="bg-gray-300 dark:bg-gray-700 rounded-lg px-4 justify-center"
        >
          <Feather name="x" size={20} color="#ffffff" />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onStartCreating}
      className="flex flex-row items-center gap-2.5 p-3.5 bg-indigo-50 dark:bg-indigo-950/25 rounded-xl border border-indigo-200 dark:border-indigo-800/60 active:bg-indigo-100 dark:active:bg-indigo-950/40"
    >
      <View className="w-6 h-6 rounded-full bg-indigo-500 items-center justify-center">
        <Feather name="plus" size={14} color="#ffffff" />
      </View>
      <Text className="text-sm font-medium text-indigo-600 dark:text-indigo-400">New list</Text>
    </Pressable>
  );
}
