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
      className="flex flex-row items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700"
    >
      <Feather name="plus" size={20} color="#6b7280" />
      <Text className="text-gray-500 dark:text-gray-400">Create new list</Text>
    </Pressable>
  );
}
