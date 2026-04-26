import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { GroceryItemType, UpdateGroceryItemDto } from '../../domain';

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GroceryItemType | null;
  onSave: (id: string, dto: UpdateGroceryItemDto) => void;
  onDelete: (id: string) => void;
}

export const ItemDetailSheet = ({
  open,
  onOpenChange,
  item,
  onSave,
  onDelete,
}: ItemDetailSheetProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCategory(item.category ?? '');
      setQuantity(String(item.quantity));
      setUnit(item.unit ?? '');
      setNotes(item.notes ?? '');
    }
  }, [item]);

  const handleSave = () => {
    if (!item || !name.trim()) return;
    onSave(item.id, {
      name: name.trim(),
      category: category.trim() || undefined,
      quantity: parseFloat(quantity) || 1,
      unit: unit.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item) return;
    onDelete(item.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Item</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>

          <div>
            <Label htmlFor="item-category">Category</Label>
            <Input
              id="item-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Dairy, Produce"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="item-quantity">Quantity</Label>
              <Input
                id="item-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                step="0.5"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="item-unit">Unit</Label>
              <Input
                id="item-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., kg, pcs, L"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="item-notes">Notes</Label>
            <Textarea
              id="item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., organic, low fat"
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">
              Save
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
