import { useState } from 'react';
import { Edit2, Trash2, Check } from 'lucide-react';
import type { GroceryItemType } from '../../domain';
import { GroceryItem } from '../../domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@core/presentation/utils';

interface GroceryItemRowProps {
  item: GroceryItemType;
  isSessionActive: boolean;
  onCheck: (itemId: string, price?: number | null) => void;
  onUncheck: (itemId: string) => void;
  onEdit: (item: GroceryItemType) => void;
  onDelete: (itemId: string) => void;
}

export const GroceryItemRow = ({
  item,
  isSessionActive,
  onCheck,
  onUncheck,
  onEdit,
  onDelete,
}: GroceryItemRowProps) => {
  const entity = new GroceryItem(item);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState('');

  const handleCheckboxClick = () => {
    if (item.isChecked) {
      onUncheck(item.id);
      return;
    }

    if (isSessionActive) {
      setShowPriceInput(true);
    } else {
      onCheck(item.id);
    }
  };

  const handlePriceSubmit = () => {
    const parsedPrice = price ? parseFloat(price) : null;
    onCheck(item.id, parsedPrice);
    setShowPriceInput(false);
    setPrice('');
  };

  const handlePriceSkip = () => {
    onCheck(item.id, null);
    setShowPriceInput(false);
    setPrice('');
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-accent/50 transition-colors',
        item.isChecked && 'opacity-60'
      )}
      onClick={handleCheckboxClick}
    >
      {/* Checkbox */}
      <Popover open={showPriceInput} onOpenChange={setShowPriceInput}>
        <PopoverTrigger asChild>
          <button
            onClick={handleCheckboxClick}
            className={cn(
              'flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
              item.isChecked
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground/40 hover:border-primary'
            )}
          >
            {item.isChecked && <Check className="h-3 w-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <p className="text-xs text-muted-foreground mb-2">
            {item.name} {entity.quantityLabel && `× ${entity.quantityLabel}`}
          </p>
          <Input
            type="number"
            placeholder="Price (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePriceSubmit();
            }}
            className="mb-2 h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={handlePriceSubmit}>
              Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs"
              onClick={handlePriceSkip}
            >
              Skip
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Item info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium truncate',
              item.isChecked && 'line-through text-muted-foreground'
            )}
          >
            {item.name}
          </span>
          {entity.quantityLabel && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {entity.quantityLabel}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.notes}
          </p>
        )}
        {item.isChecked && item.price != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            ₱{item.price.toFixed(2)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEdit(item); }}
        >
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
