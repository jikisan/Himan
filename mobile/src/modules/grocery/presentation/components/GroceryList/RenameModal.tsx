import { View, TextInput, Pressable, Text } from 'react-native';

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
    <View className="absolute inset-0 bg-black/40 justify-center items-center px-6">
      <View className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rename List
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          autoFocus
          className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 mb-4"
        />
        <View className="flex flex-row gap-2">
          <Pressable
            onPress={onSubmit}
            className="flex-1 bg-indigo-500 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-medium">Save</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            className="flex-1 bg-gray-300 dark:bg-gray-700 rounded-lg py-3 items-center"
          >
            <Text className="text-white font-medium">Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
