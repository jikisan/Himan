import { Text, TextInput } from 'react-native';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';

interface ErrandNameFieldProps {
  c: NotebookColors;
  errandName: string;
  onChangeErrandName: (value: string) => void;
}

export function ErrandNameField({ c, errandName, onChangeErrandName }: ErrandNameFieldProps) {
  return (
    <>
      <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mt-5 mb-1 font-serif">
        Errand name (optional)
      </Text>
      <TextInput
        value={errandName}
        onChangeText={onChangeErrandName}
        placeholder="e.g. Weekend Shopping"
        placeholderTextColor={c.inkSoft}
        className="rounded-xl px-3 py-2.5 border border-rule dark:border-rule-dark text-ink dark:text-ink-dark font-serif"
      />
    </>
  );
}
