import type { Feather } from '@expo/vector-icons';

export interface GroceryHomeShelf {
  label: string;
  hint: string;
  icon: keyof typeof Feather.glyphMap;
  href: string;
}

export const GROCERY_HOME_SHELVES: GroceryHomeShelf[] = [
  { label: 'Lists', hint: 'Reusable templates', icon: 'clipboard', href: '/grocery/templates' },
  { label: 'Catalog', hint: 'Products & prices', icon: 'book', href: '/grocery/catalog' },
  { label: 'History', hint: 'Past trips & totals', icon: 'archive', href: '/grocery/history' },
];
