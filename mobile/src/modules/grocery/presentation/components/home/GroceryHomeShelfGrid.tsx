import { View } from 'react-native';
import type { NotebookColors } from '@/modules/grocery/presentation/theme/notebook';
import { GROCERY_HOME_SHELVES } from './GroceryHomeShelves';
import { GroceryHomeShelfCard } from './GroceryHomeShelfCard';

interface GroceryHomeShelfGridProps {
  c: NotebookColors;
}

export function GroceryHomeShelfGrid({ c }: GroceryHomeShelfGridProps) {
  return (
    <View className="flex-row flex-wrap justify-between gap-y-3">
      {GROCERY_HOME_SHELVES.map((shelf) => (
        <GroceryHomeShelfCard key={shelf.href} shelf={shelf} c={c} />
      ))}
    </View>
  );
}
