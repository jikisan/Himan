import { View } from 'react-native';
import type { GroceryItemType } from '@himan/shared/grocery';
import type { CollapseStamp } from '../Session/SessionCategoryGroup';
import { CategoryGroup } from '../Main/CategoryGroup';
import { SuggestionChips } from '../Main/SuggestionChips';
import { GroceryListEmptyState } from './GroceryListEmptyState';
import { GroceryListCollapseToggle } from './GroceryListCollapseToggle';

interface GroceryListToGetContentProps {
  groupedItems: Map<string, GroceryItemType[]>;
  uncheckedItems: GroceryItemType[];
  checkedItems: GroceryItemType[];
  suggestions: string[];
  isSessionActive: boolean;
  collapseLevel: 0 | 1 | 2;
  collapseStamp: CollapseStamp;
  onToggleCollapse: () => void;
  onSelectSuggestion: (suggestion: string) => void;
  onCheck: (itemId: string, price?: number | null) => void;
  onUncheck: (itemId: string) => void;
  onEditItem: (item: GroceryItemType) => void;
  onDeleteItem: (itemId: string) => void;
}

export function GroceryListToGetContent({
  groupedItems,
  uncheckedItems,
  checkedItems,
  suggestions,
  isSessionActive,
  collapseLevel,
  collapseStamp,
  onToggleCollapse,
  onSelectSuggestion,
  onCheck,
  onUncheck,
  onEditItem,
  onDeleteItem,
}: GroceryListToGetContentProps) {
  const hasItems = uncheckedItems.length > 0 || checkedItems.length > 0;
  const allChecked = uncheckedItems.length === 0 && checkedItems.length > 0;

  return (
    <>
      <GroceryListCollapseToggle
        collapseLevel={collapseLevel}
        onToggle={onToggleCollapse}
        visible={groupedItems.size > 0}
      />

      {suggestions.length > 0 && (
        <View className="mt-2">
          <SuggestionChips suggestions={suggestions} onSelectSuggestion={onSelectSuggestion} />
        </View>
      )}

      {Array.from(groupedItems.entries()).map(([category, items]) => (
        <CategoryGroup
          key={category}
          category={category}
          items={items}
          isSessionActive={isSessionActive}
          collapseStamp={collapseStamp}
          onCheck={onCheck}
          onUncheck={onUncheck}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
        />
      ))}

      {!hasItems && <GroceryListEmptyState type="no-items" />}
      {allChecked && <GroceryListEmptyState type="all-checked" />}
    </>
  );
}
