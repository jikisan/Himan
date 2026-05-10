import { ScrollView, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CardCategoryType } from '@himan/shared/cards';

type SelectedCategoryId = 'all' | 'favorites' | string | null;

interface CategoryChipsProps {
  selectedId: SelectedCategoryId;
  categories: CardCategoryType[];
  onSelect: (id: SelectedCategoryId) => void;
  onLongPressCategory: (category: CardCategoryType) => void;
  onAddCategory: () => void;
}

export const CategoryChips = ({
  selectedId,
  categories,
  onSelect,
  onLongPressCategory,
  onAddCategory,
}: CategoryChipsProps) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
    >
      <Chip
        label="All"
        selected={selectedId === 'all'}
        onPress={() => onSelect('all')}
      />
      <Chip
        label="Favorites"
        icon="star"
        selected={selectedId === 'favorites'}
        onPress={() => onSelect('favorites')}
      />
      {categories.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name}
          selected={selectedId === cat.id}
          onPress={() => onSelect(cat.id)}
          onLongPress={() => onLongPressCategory(cat)}
        />
      ))}
      <Pressable
        onPress={onAddCategory}
        className="flex-row items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-gray-300 dark:border-gray-600"
      >
        <Feather name="plus" size={13} color="#9ca3af" />
        <Text className="text-xs font-medium text-gray-400 dark:text-gray-500">Add</Text>
      </Pressable>
    </ScrollView>
  );
};

interface ChipProps {
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  selected: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

const Chip = ({ label, icon, selected, onPress, onLongPress }: ChipProps) => (
  <Pressable
    onPress={onPress}
    onLongPress={onLongPress}
    className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${
      selected
        ? 'bg-indigo-500 border-indigo-500'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}
  >
    {icon && (
      <Feather name={icon} size={12} color={selected ? '#ffffff' : '#9ca3af'} />
    )}
    <Text
      className={`text-xs font-medium ${
        selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);
