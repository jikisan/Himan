import { Folder as FolderIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui';
import { SidebarList } from '@core/presentation/components/common';

interface CategoryType {
  id: string;
  name: string;
  count?: number;
}

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
  onOpenFolderSettings?: (folderId: string) => void;
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
  onOpenFolderSettings,
}: CategoryListProps) => {
  const categoriesWithCount = categories.map(category => ({
    ...category,
    count: category.count,
  }));

  // Check if a real folder is selected (not "all", "favorites", or null)
  const isRealFolderSelected =
    typeof selectedCategoryId === 'string' &&
    selectedCategoryId !== 'all' &&
    selectedCategoryId !== 'favorites';

  return (
    <div className="flex flex-col">
      <SidebarList
        moduleName="Invoices"
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
        allItemsLabel="All Invoices"
        specialViewType="favorites"
        specialViewLabel="Favorites"
        unfiledLabel="Uncategorized"
        createDialogTitle="Create Category"
        createDialogDescription="Enter a name for your new invoice category (max 100 characters)."
        editDialogTitle="Rename Category"
        editDialogDescription="Enter a new name for this category (max 100 characters)."
        itemIcon={FolderIcon}
        hideOnMobile={false}
      />
      {/* Folder settings button — shown when a real folder is selected */}
      {!isCollapsed && isRealFolderSelected && onOpenFolderSettings && (
        <div className="px-3 py-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-xs text-muted-foreground"
            onClick={() => onOpenFolderSettings(selectedCategoryId)}
          >
            <Settings className="h-3.5 w-3.5" />
            Folder Settings
          </Button>
        </div>
      )}
    </div>
  );
};
