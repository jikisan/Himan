import { useState } from 'react';
import { Plus, Check, Loader2, ShoppingCart, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@core/presentation/utils';
import type { SessionItemType } from '../../domain';
import type { useGrocerySession } from '../hooks';
import type { CollapseStamp } from './SessionCategoryGroup';
import { SessionListGroup } from './SessionListGroup';
import { SessionItemRow } from './SessionItemRow';

interface SessionTabsContentProps {
  activeSession: NonNullable<ReturnType<typeof useGrocerySession>['activeSession']>;
  sessionItemsByListAndCategory: Map<string, Map<string, SessionItemType[]>>;
  purchasedSessionItems: SessionItemType[];
  sessionCollapseStamp: CollapseStamp | null;
  addSessionItem: (name: string) => Promise<unknown>;
  isAddingSessionItem: boolean;
  purchaseItem: (id: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  unpurchaseItem: (id: string, groceryItemId: string | null) => Promise<unknown>;
  triggerSessionCollapse: (collapsed: boolean) => void;
}

export const SessionTabsContent = ({
  activeSession,
  sessionItemsByListAndCategory,
  purchasedSessionItems,
  sessionCollapseStamp,
  addSessionItem,
  isAddingSessionItem,
  purchaseItem,
  unpurchaseItem,
  triggerSessionCollapse,
}: SessionTabsContentProps) => {
  const [activeTab, setActiveTab] = useState<'to-get' | 'purchased'>('to-get');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [allCollapsed, setAllCollapsed] = useState(false);

  const unpurchasedCount = activeSession.items.filter((i) => !i.isPurchased).length;

  const handleToggleCollapse = () => {
    const next = !allCollapsed;
    setAllCollapsed(next);
    triggerSessionCollapse(next);
  };

  const handleAddItem = async () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    await addSessionItem(trimmed);
    setNewItem('');
    setAddItemOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('to-get')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
            activeTab === 'to-get'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          To Get
          {unpurchasedCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 tabular-nums">
              {unpurchasedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('purchased')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
            activeTab === 'purchased'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Purchased
          {purchasedSessionItems.length > 0 && (
            <span className="text-xs bg-muted-foreground/10 text-muted-foreground rounded-full px-1.5 tabular-nums">
              {purchasedSessionItems.length}
            </span>
          )}
        </button>
      </div>

      <Dialog open={addItemOpen} onOpenChange={(open) => { setAddItemOpen(open); if (!open) setNewItem(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription className="sr-only">Add an item to the shopping session</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => { e.preventDefault(); await handleAddItem(); }}
            className="flex gap-2 mt-1"
          >
            <Input
              placeholder="Item name..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              className="h-9 text-sm"
              disabled={isAddingSessionItem}
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              className="h-9 px-3 flex-shrink-0"
              disabled={!newItem.trim() || isAddingSessionItem}
            >
              {isAddingSessionItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {activeTab === 'to-get' ? (
        <div className="flex-1 flex flex-col py-3 overflow-hidden">
          <div className="flex items-center px-4 py-1.5 border-b border-border">
            <button
              onClick={() => setAddItemOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
            {sessionItemsByListAndCategory.size > 0 && (
              <button
                onClick={handleToggleCollapse}
                className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
                title={allCollapsed ? 'Expand all' : 'Collapse all'}
              >
                {allCollapsed
                  ? <ChevronsUpDown className="h-3.5 w-3.5" />
                  : <ChevronsDownUp className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {Array.from(sessionItemsByListAndCategory.entries()).map(([listName, groupedByCategory]) => (
                <SessionListGroup
                  key={listName}
                  listName={listName}
                  groupedByCategory={groupedByCategory}
                  onPurchase={purchaseItem}
                  onUnpurchase={unpurchaseItem}
                  collapseStamp={sessionCollapseStamp}
                  flat={listName === 'Added Items'}
                />
              ))}
              {activeSession.items.every((i) => i.isPurchased) && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Check className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">All items purchased!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-0.5">
            {purchasedSessionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">Nothing purchased yet</p>
              </div>
            ) : (
              purchasedSessionItems.map((item) => (
                <SessionItemRow
                  key={item.id}
                  item={item}
                  onPurchase={purchaseItem}
                  onUnpurchase={unpurchaseItem}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
