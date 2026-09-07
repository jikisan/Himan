import { View, Text, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { GroceryListType } from '@himan/shared/grocery';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';
import { TemplatesListRow } from './TemplatesListRow';

interface TemplatesListProps {
  c: NotebookColors;
  templates: GroceryListType[];
  onOpenItem: (item: GroceryListType) => void;
  onOpenMenu: (item: GroceryListType, target: any) => void;
}

export function TemplatesList({ c, templates, onOpenItem, onOpenMenu }: TemplatesListProps) {
  return (
    <FlatList
      data={templates}
      keyExtractor={(t) => t.id}
      renderItem={({ item }) => (
        <TemplatesListRow
          c={c}
          item={item}
          onPress={() => onOpenItem(item)}
          onOpenMenu={(target) => onOpenMenu(item, target)}
        />
      )}
      ListEmptyComponent={<TemplatesEmptyState c={c} />}
    />
  );
}

function TemplatesEmptyState({ c }: { c: NotebookColors }) {
  return (
    <View className="items-center px-8 py-20">
      <Feather name="clipboard" size={36} color={c.inkSoft} />
      <Text className="mt-3 text-center text-ink-soft dark:text-ink-softdark font-serif">
        No lists yet. Name one above to start a reusable template.
      </Text>
    </View>
  );
}
