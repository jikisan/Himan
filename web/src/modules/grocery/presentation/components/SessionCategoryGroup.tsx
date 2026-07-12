import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { SessionItemType } from '../../domain';
import { SessionItemRow } from './SessionItemRow';

export interface CollapseStamp {
  collapsed: boolean;
  n: number;
}

interface SessionCategoryGroupProps {
  category: string;
  items: SessionItemType[];
  onPurchase: (sessionItemId: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  onUnpurchase: (sessionItemId: string, groceryItemId: string | null) => Promise<unknown>;
  collapseStamp: CollapseStamp | null;
}

export const SessionCategoryGroup = ({
  category,
  items,
  onPurchase,
  onUnpurchase,
  collapseStamp,
}: SessionCategoryGroupProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const prevStampRef = useRef<number | null>(null);

  useEffect(() => {
    if (collapseStamp !== null && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      setIsCollapsed(collapseStamp.collapsed);
    }
  }, [collapseStamp]);

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-accent/30 active:bg-accent/40 rounded-xl transition-colors"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex-1">
          {category}
        </span>
        <span className="text-xs text-muted-foreground/60">{items.length}</span>
        {isCollapsed
          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {!isCollapsed && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) => (
            <SessionItemRow key={item.id} item={item} onPurchase={onPurchase} onUnpurchase={onUnpurchase} />
          ))}
        </div>
      )}
    </div>
  );
};
