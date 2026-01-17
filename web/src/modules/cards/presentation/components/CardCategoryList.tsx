import { Folder as FolderIcon } from 'lucide-react';
import type { CardCategoryType } from '../../domain';
import { SidebarList } from '@core/presentation/components/common';

interface CardCategoryListProps {
  categories: CardCategoryType[];
  selectedCategoryId: string | null | 'all' | 'favorites';
  onSelectCategory: (categoryId: string | null | 'all' | 'favorites') => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const CardCategoryList = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  loading,
  isCollapsed,
  onToggleCollapse,
}: CardCategoryListProps) => {
  // Map categories to include count property for SidebarList
  const categoriesWithCount = categories.map(category => ({
    ...category,
    count: category.cardCount,
  }));

  return (
    <SidebarList
      moduleName="Cards"
      title="Categories"
      items={categoriesWithCount}
      selectedItemId={selectedCategoryId}
      onSelectItem={onSelectCategory}
      onCreate={onCreateCategory}
      onUpdate={onUpdateCategory}
      onDelete={onDeleteCategory}
      loading={loading}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      allItemsLabel="All Cards"
      specialViewType="favorites"
      specialViewLabel="Favorites"
      unfiledLabel="Uncategorized"
      createDialogTitle="Create Category"
      createDialogDescription="Enter a name for your new card category (max 100 characters)."
      editDialogTitle="Rename Category"
      editDialogDescription="Enter a new name for this category (max 100 characters)."
      itemIcon={FolderIcon}
      hideOnMobile={false}
    />
  );
};