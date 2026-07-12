import { CategoryGroup } from '../Main/CategoryGroup';
import { GroceryListEmptyState } from './GroceryListEmptyState';
import type { GroceryItemType } from '@himan/shared/grocery';

interface GroceryListCheckedContentProps {
  checkedItems: GroceryItemType[];
  isSessionActive: boolean;
  onCheck: (itemId: string, price?: number | null) => void;
  onUncheck: (itemId: string) => void;
  onEditItem: (item: GroceryItemType) => void;
  onDeleteItem: (itemId: string) => void;
}

export function GroceryListCheckedContent({
  checkedItems,
  isSessionActive,
  onCheck,
  onUncheck,
  onEditItem,
  onDeleteItem,
}: GroceryListCheckedContentProps) {
  if (checkedItems.length === 0) {
    return <GroceryListEmptyState type="nothing-checked" />;
  }

  return (
    <>
      {checkedItems.map((item) => (
        <CategoryGroup
          key={item.id}
          category={item.category || 'Other'}
          items={[item]}
          isSessionActive={isSessionActive}
          onCheck={onCheck}
          onUncheck={onUncheck}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
        />
      ))}
    </>
  );
}
