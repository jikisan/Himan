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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GroceryItemType, UpdateGroceryItemDto, CreateGroceryItemDto } from '@himan/shared/grocery';

const GROCERY_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Condiments & Sauces',
  'Household',
  'Personal Care',
] as const;

const GROCERY_UNITS = [
  'pcs',
  'kg',
  'g',
  'L',
  'mL',
  'lb',
  'oz',
  'pack',
  'bottle',
  'can',
  'box',
  'bag',
  'dozen',
  'bunch',
] as const;

type ItemDetailMode = 'add' | 'edit';

interface ItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: GroceryItemType | null;
  mode?: ItemDetailMode;
  onSave: (id: string, dto: UpdateGroceryItemDto) => void;
  onAdd?: (dto: CreateGroceryItemDto) => void;
  onDelete: (id: string) => void;
  listId?: string;
}

export const ItemDetailSheet = ({
  open,
  onOpenChange,
  item,
  mode = 'edit',
  onSave,
  onAdd,
  onDelete,
  listId,
}: ItemDetailSheetProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [isOtherUnit, setIsOtherUnit] = useState(false);
  const [notes, setNotes] = useState('');

  const isAddMode = mode === 'add';

  useEffect(() => {
    if (isAddMode) {
      setName('');
      setCategory('');
      setCustomCategory('');
      setIsOtherCategory(false);
      setQuantity('1');
      setUnit('');
      setCustomUnit('');
      setIsOtherUnit(false);
      setNotes('');
    } else if (item) {
      setName(item.name);
      const cat = item.category ?? '';
      const isPredefined = GROCERY_CATEGORIES.includes(cat as typeof GROCERY_CATEGORIES[number]);
      if (cat && !isPredefined) {
        setCategory('Other');
        setCustomCategory(cat);
        setIsOtherCategory(true);
      } else {
        setCategory(cat);
        setCustomCategory('');
        setIsOtherCategory(false);
      }
      setQuantity(String(item.quantity));
      const u = item.unit ?? '';
      const isPredefinedUnit = GROCERY_UNITS.includes(u as typeof GROCERY_UNITS[number]);
      if (u && !isPredefinedUnit) {
        setUnit('Other');
        setCustomUnit(u);
        setIsOtherUnit(true);
      } else {
        setUnit(u);
        setCustomUnit('');
        setIsOtherUnit(false);
      }
      setNotes(item.notes ?? '');
    }
  }, [item, isAddMode, open]);

  const handleSave = () => {
    if (!name.trim()) return;

    const resolvedCategory = isOtherCategory
      ? customCategory.trim() || undefined
      : category || undefined;

    const resolvedUnit = isOtherUnit
      ? customUnit.trim() || undefined
      : unit || undefined;

    if (isAddMode) {
      if (!listId || !onAdd) return;
      onAdd({
        listId,
        name: name.trim(),
        category: resolvedCategory,
        quantity: parseFloat(quantity) || 1,
        unit: resolvedUnit,
        notes: notes.trim() || undefined,
      });
    } else {
      if (!item) return;
      onSave(item.id, {
        name: name.trim(),
        category: resolvedCategory,
        quantity: parseFloat(quantity) || 1,
        unit: resolvedUnit,
        notes: notes.trim() || undefined,
      });
    }
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!item || isAddMode) return;
    onDelete(item.id);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isAddMode ? 'Add Item' : 'Edit Item'}</SheetTitle>
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
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setIsOtherCategory(value === 'Other');
                if (value !== 'Other') setCustomCategory('');
              }}
            >
              <SelectTrigger id="item-category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {GROCERY_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {isOtherCategory && (
              <Input
                className="mt-2"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
            )}
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
              <Select
                value={unit}
                onValueChange={(value) => {
                  setUnit(value);
                  setIsOtherUnit(value === 'Other');
                  if (value !== 'Other') setCustomUnit('');
                }}
              >
                <SelectTrigger id="item-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {GROCERY_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isOtherUnit && (
            <Input
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="Enter custom unit"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          )}

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
              {isAddMode ? 'Add' : 'Save'}
            </Button>
            {!isAddMode && (
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
