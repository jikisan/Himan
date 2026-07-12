import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@core/presentation/utils';
import type { SessionItemType } from '../../domain';

interface SessionItemRowProps {
  item: SessionItemType;
  onPurchase: (sessionItemId: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  onUnpurchase: (sessionItemId: string, groceryItemId: string | null) => Promise<unknown>;
}

export const SessionItemRow = ({ item, onPurchase, onUnpurchase }: SessionItemRowProps) => {
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quantityLabel =
    item.quantity > 1
      ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
      : item.unit ?? '';

  const handleCheckboxClick = async () => {
    if (isLoading) return;
    if (item.isPurchased) {
      setIsLoading(true);
      try { await onUnpurchase(item.id, item.groceryItemId); }
      finally { setIsLoading(false); }
      return;
    }
    setShowPriceInput(true);
  };

  const handlePriceSubmit = async () => {
    const parsedPrice = price ? parseFloat(price) : null;
    setShowPriceInput(false);
    setPrice('');
    setIsLoading(true);
    try { await onPurchase(item.id, item.groceryItemId, parsedPrice); }
    finally { setIsLoading(false); }
  };

  const handlePriceSkip = async () => {
    setShowPriceInput(false);
    setPrice('');
    setIsLoading(true);
    try { await onPurchase(item.id, item.groceryItemId, null); }
    finally { setIsLoading(false); }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 rounded-xl group hover:bg-accent/50 active:bg-accent/60 transition-colors cursor-pointer',
        (item.isPurchased || isLoading) && 'opacity-60',
        isLoading && 'pointer-events-none'
      )}
      onClick={handleCheckboxClick}
    >
      <Popover open={showPriceInput} onOpenChange={setShowPriceInput}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all',
              item.isPurchased
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-muted-foreground/30 hover:border-emerald-400'
            )}
          >
            {isLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : item.isPurchased && <Check className="h-3 w-3" />
            }
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <p className="text-xs text-muted-foreground mb-2">
            {item.name} {quantityLabel && `× ${quantityLabel}`}
          </p>
          <Input
            type="number"
            placeholder="Price (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSubmit(); }}
            className="mb-2 h-9 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={handlePriceSubmit}>Done</Button>
            <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs" onClick={handlePriceSkip}>Skip</Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            item.isPurchased && 'line-through text-muted-foreground'
          )}>
            {item.name}
          </span>
          {quantityLabel && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{quantityLabel}</span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.notes}</p>
        )}
        {item.isPurchased && item.price != null && (
          <p className="text-xs text-muted-foreground mt-0.5">₱{item.price.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
};
