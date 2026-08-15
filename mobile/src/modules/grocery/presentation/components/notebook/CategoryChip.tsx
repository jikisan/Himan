import { Text } from 'react-native';

/** Flush-left cyan #tag — one accent, no fill, no dot. */
export function CategoryChip({ category }: { category: string | null | undefined }) {
  const label = (category || 'other').toLowerCase().replace(/\s+/g, '');
  return (
    <Text className="text-[15px] font-serif text-gray-700 dark:text-gray-400">
      {label}
    </Text>
  );
}
