import type { Feather } from '@expo/vector-icons';
import type { GroceryListType } from '@himan/shared/grocery';

export interface TemplateMenuActionDescriptor {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  run: () => void;
  destructive?: boolean;
}

interface BuildTemplateMenuActionsOptions {
  item: GroceryListType;
  onOpen: (item: GroceryListType) => void;
  onRename: (item: GroceryListType) => void;
  onDuplicate: (item: GroceryListType) => void;
  onDelete: (item: GroceryListType) => void;
}

export function buildTemplateMenuActions({
  item,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: BuildTemplateMenuActionsOptions): TemplateMenuActionDescriptor[] {
  return [
    { icon: 'external-link', label: 'Open', run: () => onOpen(item) },
    { icon: 'edit-2', label: 'Rename', run: () => onRename(item) },
    { icon: 'copy', label: 'Duplicate', run: () => onDuplicate(item) },
    { icon: 'trash-2', label: 'Delete', run: () => onDelete(item), destructive: true },
  ];
}
