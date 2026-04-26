import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@core/presentation/utils';
import type { GroceryListType } from '../../domain';

interface StartSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lists: GroceryListType[];
  recentStores: string[];
  onStart: (listIds: string[], storeName: string) => void;
  isStarting: boolean;
}

export const StartSessionDialog = ({
  open,
  onOpenChange,
  lists,
  recentStores,
  onStart,
  isStarting,
}: StartSessionDialogProps) => {
  const [storeName, setStoreName] = useState('');
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);

  const toggleList = (listId: string) => {
    setSelectedListIds((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
  };

  const handleStart = () => {
    const trimmed = storeName.trim();
    if (!trimmed || selectedListIds.length === 0) return;
    onStart(selectedListIds, trimmed);
    setStoreName('');
    setSelectedListIds([]);
    onOpenChange(false);
  };

  const activeLists = lists.filter((l) => !l.isArchived && l.itemCount > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Start Shopping Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* List selection */}
          <div>
            <Label>Select lists to shop</Label>
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {activeLists.map((list) => {
                const isSelected = selectedListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    onClick={() => toggleList(list.id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center h-5 w-5 rounded border flex-shrink-0 transition-colors',
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{list.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {list.itemCount} items
                      </span>
                    </div>
                  </button>
                );
              })}
              {activeLists.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  No lists with items available
                </p>
              )}
            </div>
          </div>

          {/* Store name */}
          <div>
            <Label htmlFor="store-name">Store name</Label>
            <Input
              id="store-name"
              placeholder="e.g., Walmart, Costco"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStart();
              }}
            />
          </div>

          {recentStores.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Recent stores</p>
              <div className="flex flex-wrap gap-1.5">
                {recentStores.map((store) => (
                  <button
                    key={store}
                    onClick={() => setStoreName(store)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border border-border hover:bg-accent transition-colors',
                      storeName === store && 'bg-accent border-primary/30'
                    )}
                  >
                    {store}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={!storeName.trim() || selectedListIds.length === 0 || isStarting}
            className="w-full"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isStarting
              ? 'Starting...'
              : `Start Shopping${storeName.trim() ? ` at ${storeName.trim()}` : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
