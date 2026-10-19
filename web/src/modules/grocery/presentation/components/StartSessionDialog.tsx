import { useState, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError } from '@core/presentation/components';
import { ShoppingCart, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const fe = useFieldErrors();

  const toggleList = (listId: string) => {
    fe.clear('session-lists');
    setSelectedListIds((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
  };

  const handleStart = (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    const trimmed = storeName.trim();
    const invalid: [string, string][] = [];
    if (selectedListIds.length === 0) invalid.push(['session-lists', 'Select at least one list']);
    if (!trimmed) invalid.push(['store-name', 'Enter a store name']);
    if (invalid.length) { fe.failMany(invalid); return; }
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
          <DialogDescription className="sr-only">Select lists and a store to begin shopping</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleStart} className="space-y-4 mt-2">
          {/* List selection */}
          <div>
            <Label id="session-lists-label" required>Select lists to shop</Label>
            <div id="session-lists" role="group" aria-labelledby="session-lists-label" aria-required="true" tabIndex={-1}
              {...fe.invalid('session-lists')}
              className="mt-2 space-y-1.5 max-h-48 overflow-y-auto rounded-lg outline-none aria-invalid:ring-2 aria-invalid:ring-destructive/25">
              {activeLists.map((list) => {
                const isSelected = selectedListIds.includes(list.id);
                return (
                  <button
                    key={list.id}
                    type="button"
                    aria-pressed={isSelected}
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
            <FieldError id="session-lists" message={fe.errors['session-lists']} />
          </div>

          {/* Store name */}
          <div>
            <Label htmlFor="store-name" required>Store name</Label>
            <Input
              id="store-name"
              required
              {...fe.invalid('store-name')}
              placeholder="e.g., Walmart, Costco"
              value={storeName}
              onChange={(e) => { setStoreName(e.target.value); fe.clear('store-name'); }}
            />
            <FieldError id="store-name" message={fe.errors['store-name']} />
          </div>

          {recentStores.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Recent stores</p>
              <div className="flex flex-wrap gap-1.5">
                {recentStores.map((store) => (
                  <button
                    key={store}
                    type="button"
                    onClick={() => { setStoreName(store); fe.clear('store-name'); }}
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
            type="submit"
            disabled={isStarting}
            className="w-full"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {isStarting
              ? 'Starting...'
              : `Start Shopping${storeName.trim() ? ` at ${storeName.trim()}` : ''}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
