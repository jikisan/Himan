import { Plus } from 'lucide-react';
import type { ItemSuggestion, CreateGroceryItemDto } from '../../domain';
import { cn } from '@core/presentation/utils';

interface SuggestionChipsProps {
  suggestions: ItemSuggestion[];
  listId: string;
  onAddItem: (dto: CreateGroceryItemDto) => void;
}

const reasonLabels: Record<string, { label: string; className: string }> = {
  running_low: { label: 'running low', className: 'text-orange-600 dark:text-orange-400' },
  frequently_bought: { label: 'buy regularly', className: 'text-blue-600 dark:text-blue-400' },
  recently_bought: { label: 'bought recently', className: 'text-muted-foreground' },
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
        const reason = reasonLabels[suggestion.reason];
        return (
          <button
            key={suggestion.product.id}
            onClick={() => handleAdd(suggestion)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-card hover:bg-accent text-sm transition-colors"
          >
            <Plus className="h-3 w-3 text-muted-foreground" />
            <span>{suggestion.product.name}</span>
            <span className={cn('text-[10px]', reason.className)}>
              {reason.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
