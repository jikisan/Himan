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
    <View className="mt-4 px-3 py-3 border-rule dark:border-rule-dark">
      <View className="flex flex-row gap-2">
        <TextInput
          placeholder="Add item..."
          placeholderTextColor="#9b9797"
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          className="flex-1 border border-rule dark:border-rule-dark rounded-lg p-3 text-ink dark:text-ink-dark bg-surface dark:bg-surface-dark"
        />
        <Pressable
          onPress={onSubmit}
          disabled={!value.trim() || isLoading}
          className={`rounded-lg px-4 justify-center ${
            !value.trim() || isLoading ? 'bg-surface dark:bg-surface-dark' : 'bg-accent dark:bg-accent-dark'
          }`}
        >
          <Feather name="plus" size={20} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
};
