import { ScrollView, View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CategoryType } from '@himan/shared/passwords';

type SelectedCategoryId = 'all' | 'favorites' | string | null;

interface CategoryChipsProps {
  selectedId: SelectedCategoryId;
  categories: CategoryType[];
  onSelect: (id: SelectedCategoryId) => void;
  onLongPressCategory: (category: CategoryType) => void;
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
      style={{ flexGrow: 0 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 14, gap: 8 }}
    >
      <Chip
          label="Favorites"
          icon="star"
          selected={selectedId === 'favorites'}
          onPress={() => onSelect('favorites')}
      />
      <Chip
        label="All"
        selected={selectedId === 'all'}
        onPress={() => onSelect('all')}
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
        className="flex-row items-center gap-1 px-3 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-600"
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
    className={`flex-row items-center justify-center gap-1.5 px-4 py-2 rounded-full border ${
      selected
        ? 'bg-indigo-500 border-indigo-500'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }`}
  >
    {icon && (
      <Feather name={icon} size={14} color={selected ? '#ffffff' : '#9ca3af'} />
    )}
    <Text
      className={`text-md font-medium ${
        selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
      }`}
    >
      {label}
    </Text>
  </Pressable>
);
