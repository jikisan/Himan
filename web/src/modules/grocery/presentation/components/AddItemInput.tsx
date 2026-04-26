import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { ProductType, CreateGroceryItemDto } from '../../domain';
import { Input } from '@/components/ui/input';
import { cn } from '@core/presentation/utils';

interface AddItemInputProps {
  listId: string;
  products: ProductType[];
  onAddItem: (dto: CreateGroceryItemDto) => void;
  autoFocus?: boolean;
}

export const AddItemInput = ({
  listId,
  products,
  onAddItem,
  autoFocus = false,
}: AddItemInputProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(lower))
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, 8);
  }, [query, products]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [matches]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const addFromProduct = (product: ProductType) => {
    onAddItem({
      listId,
      name: product.name,
      category: product.category ?? undefined,
      quantity: product.defaultQuantity,
      unit: product.defaultUnit ?? undefined,
      productId: product.id,
    });
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const addCustom = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onAddItem({
      listId,
      name: trimmed,
    });
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !query.trim()) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustom();
      }
      return;
    }

    const totalOptions = matches.length + 1; // +1 for "Add as new"

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalOptions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < matches.length) {
        addFromProduct(matches[selectedIndex]);
      } else {
        addCustom();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Add an item..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onBlur={() => {
            // Delay to allow click on dropdown items
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          className="pl-9"
        />
      </div>

      {isOpen && query.trim() && (
        <div
          ref={dropdownRef}
          className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {matches.map((product, index) => (
            <button
              key={product.id}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addFromProduct(product)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="flex-1 truncate">{product.name}</span>
              {product.category && (
                <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                  {product.category}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {product.defaultQuantity}{product.defaultUnit ? ` ${product.defaultUnit}` : ''}
              </span>
            </button>
          ))}

          {matches.length > 0 && (
            <div className="border-t border-border" />
          )}

          <button
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
              selectedIndex === matches.length && 'bg-accent'
            )}
            onMouseDown={(e) => e.preventDefault()}
            onClick={addCustom}
            onMouseEnter={() => setSelectedIndex(matches.length)}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span>Add &quot;{query.trim()}&quot; as new item</span>
          </button>
        </div>
      )}
    </div>
  );
};
