import { Text, View } from 'react-native';
import { categoryColor } from '../../theme/notebook';

/** Colored category tag — a felt-tip highlighter dot + label. */
export function CategoryChip({ category }: { category: string | null | undefined }) {
  const color = categoryColor(category);
  return (
    <View className="flex-row items-center gap-1.5 rounded-full px-2 py-0.5"
      style={{ backgroundColor: `${color}22` }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text className="text-xs text-ink-soft dark:text-ink-softdark" style={{ color }}>
        {category || 'Other'}
      </Text>
    </View>
  );
}
