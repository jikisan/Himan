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
        className="flex items-center gap-2 px-3 py-2.5 w-full text-left hover:bg-accent/30 active:bg-accent/40 rounded-xl transition-colors"
      >
        {isCollapsed
          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex-1">
          {category}
        </span>
        <span className="text-xs text-muted-foreground/60">{items.length}</span>
      </button>

      {!isCollapsed && (
        <div className="mt-0.5 space-y-0.5">
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
