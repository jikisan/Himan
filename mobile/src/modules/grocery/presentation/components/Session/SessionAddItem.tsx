import { View, TextInput, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SessionAddItemProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const SessionAddItem = ({
  value,
  onChangeText,
  onSubmit,
  isLoading,
}: SessionAddItemProps) => {
  return (
    <View className="mt-4 px-3 py-3 border-gray-200 dark:border-gray-700">
      <View className="flex flex-row gap-2">
        <TextInput
          placeholder="Add item..."
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
        />
        <Pressable
          onPress={onSubmit}
          disabled={!value.trim() || isLoading}
          className={`rounded-lg px-4 justify-center ${
            !value.trim() || isLoading ? 'bg-gray-300 dark:bg-gray-700' : 'bg-indigo-500'
          }`}
        >
          <Feather name="plus" size={20} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
};
