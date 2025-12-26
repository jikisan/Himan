import { useState } from 'react';
import { Plus, FolderOpen, ChevronLeft, ChevronRight, Folder as FolderIcon, Star } from 'lucide-react';
import type { CategoryType } from '../../domain';
import { CategoryItem } from './CategoryItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryType | null>(null);
  const [categoryName, setCategoryName] = useState('');

  const handleCreate = async () => {
    if (categoryName.trim()) {
      await onCreateCategory(categoryName.trim());
      setCategoryName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleEdit = async () => {
    if (editingCategory && categoryName.trim()) {
      await onUpdateCategory(editingCategory.id, categoryName.trim());
      setCategoryName('');
      setEditingCategory(null);
      setIsEditDialogOpen(false);
    }
  };

  const openEditDialog = (category: CategoryType) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div
        className={`bg-background border-r border-border flex flex-col transition-all duration-300 ${
          isCollapsed ? 'w-12' : 'w-64'
        }`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center mb-4">
            <div className="flex w-full items-center justify-between">
              {!isCollapsed && (
                <>
                  <h2 className="text-lg font-semibold text-foreground">
                    Categories
                  </h2>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="h-8 w-8"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleCollapse}
              className="h-4 w-4 mx-auto block"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!isCollapsed && (
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <div
                className={
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ' +
                  (selectedCategoryId === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground')
                }
                onClick={() => onSelectCategory('all')}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">All Passwords</span>
              </div>

              <div
                className={
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ' +
                  (selectedCategoryId === 'favorites'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground')
                }
                onClick={() => onSelectCategory('favorites')}
              >
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">Favorites</span>
              </div>

              <div
                className={
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ' +
                  (selectedCategoryId === null
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground')
                }
                onClick={() => onSelectCategory(null)}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Uncategorized</span>
              </div>

              {loading && categories.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : categories.length === 0 && !loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No categories yet
                </div>
              ) : (
                categories.map((category) => (
                  <CategoryItem
                    key={category.id}
                    category={category}
                    isActive={selectedCategoryId === category.id}
                    onClick={() => onSelectCategory(category.id)}
                    onEdit={() => openEditDialog(category)}
                    onDelete={() => onDeleteCategory(category.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Category name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
