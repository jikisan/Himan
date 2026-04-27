import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SessionItemType } from '../../domain';
import type { CollapseStamp } from './SessionCategoryGroup';
import { SessionCategoryGroup } from './SessionCategoryGroup';
import { SessionItemRow } from './SessionItemRow';

interface SessionListGroupProps {
  listName: string;
  groupedByCategory: Map<string, SessionItemType[]>;
  onPurchase: (sessionItemId: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  onUnpurchase: (sessionItemId: string, groceryItemId: string | null) => Promise<unknown>;
  collapseStamp: CollapseStamp | null;
  flat?: boolean;
}

export const SessionListGroup = ({
  listName,
  groupedByCategory,
  onPurchase,
  onUnpurchase,
  collapseStamp,
  flat = false,
}: SessionListGroupProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevStampRef = useRef<number | null>(null);

  useEffect(() => {
    if (collapseStamp !== null && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      setIsCollapsed(collapseStamp.collapsed);
    }
  }, [collapseStamp]);

  const allItems = Array.from(groupedByCategory.values()).flat();
  const totalCount = allItems.length;

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2.5 px-4 py-3 w-full text-left hover:bg-accent/30 active:bg-accent/40 rounded-xl transition-colors"
      >
        <span className="text-sm font-semibold flex-1">{listName}</span>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full tabular-nums">
          {totalCount}
        </span>
        {isCollapsed
          ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {!isCollapsed && (
        <div className="mt-1 pl-2">
          {flat ? (
            <div className="space-y-0.5">
              {allItems.map((item) => (
                <SessionItemRow key={item.id} item={item} onPurchase={onPurchase} onUnpurchase={onUnpurchase} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {Array.from(groupedByCategory.entries()).map(([category, items]) => (
                <SessionCategoryGroup
                  key={category}
                  category={category}
                  items={items}
                  onPurchase={onPurchase}
                  onUnpurchase={onUnpurchase}
                  collapseStamp={collapseStamp}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
