import { View, TextInput, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface TemplatesCreateListInputProps {
  c: NotebookColors;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
}

export function TemplatesCreateListInput({ c, value, onChangeText, onSubmit }: TemplatesCreateListInputProps) {
  return (
    <View className="flex-row items-center gap-2 mt-3 rounded-2xl px-3 py-2 border border-rule dark:border-rule-dark">
      <Feather name="plus" size={18} color={c.inkSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="New list name…"
        placeholderTextColor={c.inkSoft}
        className="flex-1 text-ink dark:text-ink-dark font-serif"
        onSubmitEditing={onSubmit}
        returnKeyType="done"
      />
      {value.trim() ? (
        <Pressable onPress={onSubmit} hitSlop={8}>
          <Feather name="arrow-right-circle" size={22} color={c.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}
