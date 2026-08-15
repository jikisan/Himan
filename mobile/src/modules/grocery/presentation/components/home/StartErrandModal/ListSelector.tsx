import { Text } from 'react-native';
import type { GroceryListType } from '@himan/shared/grocery';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';
import { ListSelectorRow } from './ListSelectorRow';

interface ListSelectorProps {
  c: NotebookColors;
  templates: GroceryListType[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export function ListSelector({ c, templates, selected, onToggle }: ListSelectorProps) {
  return (
    <>
      <Text className="text-xs uppercase tracking-wider text-ink-soft dark:text-ink-softdark mt-5 mb-1 font-serif">
        Lists to shop
      </Text>
      {templates.length === 0 ? (
        <Text className="text-ink-soft dark:text-ink-softdark py-2 font-serif">
          No lists yet. Create one first.
        </Text>
      ) : (
        templates.map((t) => (
          <ListSelectorRow key={t.id} c={c} list={t} selected={selected.has(t.id)} onToggle={onToggle} />
        ))
      )}
    </>
  );
}
