import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import type { LineItem, CurrencyCode } from '@invoice-generator/domain/types';
import { generateLineItemId } from '@invoice-generator/domain/types';
import { formatCurrency } from '../utils/currency';

interface InvoiceLineItemsProps {
  items: LineItem[];
  currency: CurrencyCode;
  onChange: (items: LineItem[]) => void;
}

export const InvoiceLineItems = ({ items, currency, onChange }: InvoiceLineItemsProps) => {
  const handleItemChange = (id: string, field: keyof LineItem, value: string | number) => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange(updated);
  };

  const handleAddItem = () => {
    onChange([
      ...items,
      { id: generateLineItemId(), description: '', unitCost: 0, quantity: 1 },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length === 1) {
      // Keep at least one row, just clear it
      onChange([{ id: generateLineItemId(), description: '', unitCost: 0, quantity: 1 }]);
    } else {
      onChange(items.filter((item) => item.id !== id));
    }
  };

  const calculateAmount = (item: LineItem): number => {
    return item.unitCost * item.quantity;
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 font-medium text-sm">Description</th>
              <th className="text-right py-2 px-2 font-medium text-sm w-28">Unit Cost</th>
              <th className="text-right py-2 px-2 font-medium text-sm w-20">Qty</th>
              <th className="text-right py-2 px-2 font-medium text-sm w-32">Amount</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={item.id}
                className={index % 2 === 0 ? 'bg-secondary/30' : 'bg-background'}
              >
                <td className="py-2 px-2">
                  <Input
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    placeholder="Item description"
                    maxLength={200}
                    className="border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    value={item.unitCost || ''}
                    onChange={(e) =>
                      handleItemChange(item.id, 'unitCost', parseFloat(e.target.value) || 0)
                    }
                    min={0}
                    step="0.01"
                    className="text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) =>
                      handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)
                    }
                    min={0}
                    className="text-right border-0 bg-transparent focus-visible:ring-1"
                  />
                </td>
                <td className="py-2 px-2 text-right font-mono text-sm">
                  {formatCurrency(calculateAmount(item), currency)}
                </td>
                <td className="py-2 px-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outline" onClick={handleAddItem} className="gap-2">
        <Plus className="h-4 w-4" />
        Add Item
      </Button>
    </div>
  );
};
