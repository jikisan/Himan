import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { GroceryItemType } from '../../domain';
import { GroceryItemRow } from './GroceryItemRow';

interface CategoryGroupProps {
  category: string;
  items: GroceryItemType[];
  isSessionActive: boolean;
  onCheck: (itemId: string, price?: number | null) => void;
  onUncheck: (itemId: string) => void;
  onEditItem: (item: GroceryItemType) => void;
  onDeleteItem: (itemId: string) => void;
}

export const CategoryGroup = ({
  category,
  items,
  isSessionActive,
  onCheck,
  onUncheck,
  onEditItem,
  onDeleteItem,
}: CategoryGroupProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-accent/30 rounded-lg transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {category}
        </span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </button>

      {!isCollapsed && (
        <div className="mt-1 space-y-0.5">
          {items.map((item) => (
            <GroceryItemRow
              key={item.id}
              item={item}
              isSessionActive={isSessionActive}
              onCheck={onCheck}
              onUncheck={onUncheck}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
};
