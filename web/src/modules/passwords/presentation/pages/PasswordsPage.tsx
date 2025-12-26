import { useState, useCallback, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { CategoryList, PasswordDialog, PasswordGrid } from '../components';
import { usePasswords, useCategories } from '../hooks';
import type { PasswordType } from '../../domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const PasswordsPage = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordType | null>(null);

  const passwordFilters = useMemo(() => {
    const filters: {
      categoryId?: string | null;
      searchQuery?: string;
      isFavorite?: boolean;
    } = {};

    if (selectedCategoryId === 'favorites') {
      filters.isFavorite = true;
    } else if (selectedCategoryId !== 'all') {
      filters.categoryId = selectedCategoryId;
    }

    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    return filters;
  }, [selectedCategoryId, searchQuery]);

  const {
    passwords,
    loading: passwordsLoading,
    createPassword,
    updatePassword,
    deletePassword,
    refetch: refetchPasswords,
  } = usePasswords(passwordFilters);

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: refetchCategories,
  } = useCategories();

  const handleAddPassword = useCallback(() => {
    setEditingPassword(null);
    setIsPasswordDialogOpen(true);
  }, []);

  const handleEditPassword = useCallback((password: PasswordType) => {
    setEditingPassword(password);
    setIsPasswordDialogOpen(true);
  }, []);

  const handleSavePassword = useCallback(
    async (data: {
      title: string;
      username: string | null;
      password: string;
      url: string | null;
      notes: string | null;
      categoryId: string | null;
    }) => {
      if (editingPassword) {
        await updatePassword(editingPassword.id, data);
      } else {
        await createPassword(data);
      }
      refetchPasswords();
      refetchCategories();
    },
    [editingPassword, createPassword, updatePassword, refetchPasswords, refetchCategories]
  );

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const password = passwords.find((p) => p.id === id);
      if (password) {
        await updatePassword(id, { isFavorite: !password.isFavorite });
      }
    },
    [passwords, updatePassword]
  );

  const handleDeletePassword = useCallback(
    async (id: string) => {
      const confirmed = window.confirm('Are you sure you want to delete this password?');
      if (confirmed) {
        const success = await deletePassword(id);
        if (success) {
          refetchCategories();
        }
      }
    },
    [deletePassword, refetchCategories]
  );

  const handleCreateCategory = useCallback(
    async (name: string) => {
      await createCategory({ name });
      refetchCategories();
    },
    [createCategory, refetchCategories]
  );

  const handleUpdateCategory = useCallback(
    async (id: string, name: string) => {
      await updateCategory(id, { name });
      refetchCategories();
    },
    [updateCategory, refetchCategories]
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      const category = categories.find((c) => c.id === id);
      if (category && category.passwordCount && category.passwordCount > 0) {
        const confirmed = window.confirm(
          'This category contains passwords. All passwords will be moved to "Uncategorized". Continue?'
        );
        if (!confirmed) return;
      }
      await deleteCategory(id);
      refetchCategories();
      refetchPasswords();
      if (selectedCategoryId === id) {
        setSelectedCategoryId('all');
      }
    },
    [categories, deleteCategory, selectedCategoryId, refetchCategories, refetchPasswords]
  );

  const handleToggleCategoryCollapse = useCallback(() => {
    setIsCategoryCollapsed((prev) => !prev);
  }, []);

  return (
    <>
      <div className="flex h-screen bg-secondary">
        <CategoryList
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          loading={categoriesLoading}
          isCollapsed={isCategoryCollapsed}
          onToggleCollapse={handleToggleCategoryCollapse}
        />

        <div className="flex-1 flex flex-col bg-background">
          {/* Header with search and add button */}
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search passwords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAddPassword}>
              <Plus className="h-4 w-4 mr-2" />
              Add Password
            </Button>
          </div>

          {/* Password Grid */}
          {passwordsLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <PasswordGrid
              passwords={passwords}
              onEdit={handleEditPassword}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeletePassword}
            />
          )}
        </div>
      </div>

      <PasswordDialog
        open={isPasswordDialogOpen}
        onOpenChange={setIsPasswordDialogOpen}
        password={editingPassword}
        categories={categories}
        onSave={handleSavePassword}
      />
    </>
  );
};
