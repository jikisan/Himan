import { useState } from 'react';
import { Plus, Trash2, ChevronsUpDown, ChevronsDownUp, ShoppingBasket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@core/presentation/utils';
import type { GroceryItemType, ProductType, CreateGroceryItemDto, ItemSuggestion } from '../../domain';
import type { CollapseStamp } from './SessionCategoryGroup';
import { CategoryGroup } from './CategoryGroup';
import { GroceryItemRow } from './GroceryItemRow';
import { SuggestionChips } from './SuggestionChips';
import { AddItemInput } from './AddItemInput';

interface ListTabsContentProps {
  listId: string;
  groupedItems: Map<string, GroceryItemType[]>;
  checkedItems: GroceryItemType[];
  suggestions: ItemSuggestion[];
  products: ProductType[];
  isSessionActive: boolean;
  onAddItem: (dto: CreateGroceryItemDto) => void;
  onCheck: (itemId: string, price?: number | null) => void;
  onUncheck: (itemId: string) => void;
  onEditItem: (item: GroceryItemType) => void;
  onDeleteItem: (itemId: string) => void;
  onClearChecked: () => void;
}

export const ListTabsContent = ({
  listId,
  groupedItems,
  checkedItems,
  suggestions,
  products,
  isSessionActive,
  onAddItem,
  onCheck,
  onUncheck,
  onEditItem,
  onDeleteItem,
  onClearChecked,
}: ListTabsContentProps) => {
  const [activeTab, setActiveTab] = useState<'to-get' | 'checked'>('to-get');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [collapseStamp, setCollapseStamp] = useState<CollapseStamp | null>(null);
  const [allCollapsed, setAllCollapsed] = useState(false);

  const toGetCount = Array.from(groupedItems.values()).reduce((sum, items) => sum + items.length, 0);

  const handleToggleCollapse = () => {
    const next = !allCollapsed;
    setAllCollapsed(next);
    setCollapseStamp((prev) => ({ collapsed: next, n: (prev?.n ?? 0) + 1 }));
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
          {toGetCount > 0 && (
            <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 tabular-nums">
              {toGetCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('checked')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
            activeTab === 'checked'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Checked
          {checkedItems.length > 0 && (
            <span className="text-xs bg-muted-foreground/10 text-muted-foreground rounded-full px-1.5 tabular-nums">
              {checkedItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Add item dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription className="sr-only">Add an item to the list</DialogDescription>
          </DialogHeader>
          <div className="mt-1">
            <AddItemInput
              listId={listId}
              products={products}
              onAddItem={(dto) => { onAddItem(dto); }}
              autoFocus
            />
          </div>
        </DialogContent>
      </Dialog>

      {activeTab === 'to-get' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center px-4 py-2 border-b border-border gap-2">
            <button
              onClick={() => setAddItemOpen(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add item
            </button>
            {groupedItems.size > 0 && (
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
            <div className="p-4 space-y-4">
              {suggestions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
                  <SuggestionChips suggestions={suggestions} listId={listId} onAddItem={onAddItem} />
                </div>
              )}

              <div className="space-y-2">
                {Array.from(groupedItems.entries()).map(([category, categoryItems]) => (
                  <CategoryGroup
                    key={category}
                    category={category}
                    items={categoryItems}
                    isSessionActive={isSessionActive}
                    collapseStamp={collapseStamp}
                    onCheck={onCheck}
                    onUncheck={onUncheck}
                    onEditItem={onEditItem}
                    onDeleteItem={onDeleteItem}
                  />
                ))}
              </div>

              {toGetCount === 0 && checkedItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ShoppingBasket className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No items yet</p>
                  <p className="text-xs mt-1 opacity-70">Tap &quot;Add item&quot; to get started</p>
                </div>
              )}

              {toGetCount === 0 && checkedItems.length > 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <p className="text-sm font-medium">All items checked</p>
                  <p className="text-xs mt-1 opacity-70">Switch to Checked tab to review</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {checkedItems.length > 0 && (
            <div className="flex items-center px-4 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">{checkedItems.length} item{checkedItems.length !== 1 ? 's' : ''}</span>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 text-xs text-muted-foreground"
                onClick={onClearChecked}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
          )}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-0.5">
              {checkedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ShoppingBasket className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">Nothing checked yet</p>
                </div>
              ) : (
                checkedItems.map((item) => (
                  <GroceryItemRow
                    key={item.id}
                    item={item}
                    isSessionActive={isSessionActive}
                    onCheck={onCheck}
                    onUncheck={onUncheck}
                    onEdit={onEditItem}
                    onDelete={onDeleteItem}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
