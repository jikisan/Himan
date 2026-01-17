import { Folder as FolderIcon } from 'lucide-react';
import type { CategoryType } from '../../domain';
import { SidebarList } from '@core/presentation/components/common';

interface CategoryListProps {
  categories: CategoryType[];
  selectedCategoryId: string | null | 'all' | 'favorites';
  onSelectCategory: (categoryId: string | null | 'all' | 'favorites') => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const CategoryList = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  loading,
  isCollapsed,
  onToggleCollapse,
}: CategoryListProps) => {
  // Map categories to include count property for SidebarList
  const categoriesWithCount = categories.map(category => ({
    ...category,
    count: category.passwordCount,
  }));

  return (
    <SidebarList
      moduleName="Passwords"
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
      allItemsLabel="All Passwords"
      specialViewType="favorites"
      specialViewLabel="Favorites"
      unfiledLabel="Uncategorized"
      createDialogTitle="Create Category"
      createDialogDescription="Enter a name for your new password category (max 100 characters)."
      editDialogTitle="Rename Category"
      editDialogDescription="Enter a new name for this category (max 100 characters)."
      itemIcon={FolderIcon}
      hideOnMobile={false}
    />
  );
};
