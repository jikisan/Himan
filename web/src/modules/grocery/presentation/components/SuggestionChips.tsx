import { Plus } from 'lucide-react';
import type { ItemSuggestion, CreateGroceryItemDto } from '../../domain';
import { cn } from '@core/presentation/utils';

interface SuggestionChipsProps {
  suggestions: ItemSuggestion[];
  listId: string;
  onAddItem: (dto: CreateGroceryItemDto) => void;
}

const reasonConfig: Record<string, { label: string; className: string }> = {
  running_low: {
    label: 'low',
    className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  frequently_bought: {
    label: 'regular',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  recently_bought: {
    label: 'recent',
    className: 'bg-muted text-muted-foreground',
  },
};

export const SuggestionChips = ({
  suggestions,
  listId,
  onAddItem,
}: SuggestionChipsProps) => {
  if (suggestions.length === 0) return null;

  const handleAdd = (suggestion: ItemSuggestion) => {
    const { product } = suggestion;
    onAddItem({
      listId,
      name: product.name,
      category: product.category ?? undefined,
      quantity: product.defaultQuantity,
      unit: product.defaultUnit ?? undefined,
      productId: product.id,
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {suggestions.slice(0, 8).map((suggestion) => {
        const config = reasonConfig[suggestion.reason];
        return (
          <button
            key={suggestion.product.id}
            onClick={() => handleAdd(suggestion)}
            className="inline-flex items-center gap-1.5 py-2 px-3 rounded-full border border-border bg-card hover:bg-accent active:bg-accent/70 text-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-medium">{suggestion.product.name}</span>
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', config.className)}>
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
