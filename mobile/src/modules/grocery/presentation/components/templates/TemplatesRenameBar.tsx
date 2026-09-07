import { View, TextInput, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface TemplatesRenameBarProps {
  c: NotebookColors;
  value: string;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TemplatesRenameBar({ c, value, onChangeText, onSave, onCancel }: TemplatesRenameBarProps) {
  return (
    <View className="px-5 py-3 border-b border-rule dark:border-rule-dark flex-row items-center gap-2">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoFocus
        className="flex-1 text-ink dark:text-ink-dark rounded-xl px-3 py-2 border border-rule dark:border-rule-dark font-serif"
      />
      <Pressable onPress={onSave}>
        <Feather name="check" size={22} color={c.accent} />
      </Pressable>
      <Pressable onPress={onCancel}>
        <Feather name="x" size={22} color={c.inkSoft} />
      </Pressable>
    </View>
  );
}
