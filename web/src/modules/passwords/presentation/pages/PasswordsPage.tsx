import { useState, useCallback, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { CategoryList, PasswordDialog, PasswordGrid } from '../components';
import { usePasswords, useCategories } from '../hooks';
import type { PasswordType } from '../../domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui';

export const PasswordsPage = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordType | null>(null);
  const [deletePasswordDialogOpen, setDeletePasswordDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [passwordToDelete, setPasswordToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

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
      setPasswordToDelete(id);
      setDeletePasswordDialogOpen(true);
    },
    []
  );

  const confirmDeletePassword = useCallback(async () => {
    if (passwordToDelete) {
      const success = await deletePassword(passwordToDelete);
      if (success) {
        refetchCategories();
      }
      setPasswordToDelete(null);
    }
  }, [passwordToDelete, deletePassword, refetchCategories]);

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
      setCategoryToDelete(id);
      setDeleteCategoryDialogOpen(true);
    },
    []
  );

  const confirmDeleteCategory = useCallback(async () => {
    if (categoryToDelete) {
      await deleteCategory(categoryToDelete);
      refetchCategories();
      refetchPasswords();
      if (selectedCategoryId === categoryToDelete) {
        setSelectedCategoryId('all');
      }
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, deleteCategory, selectedCategoryId, refetchCategories, refetchPasswords]);

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

      {/* Delete Password Confirmation */}
      <ConfirmDialog
        open={deletePasswordDialogOpen}
        onOpenChange={setDeletePasswordDialogOpen}
        title="Delete Password"
        description="Are you sure you want to delete this password? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeletePassword}
        variant="destructive"
      />

      {/* Delete Category Confirmation */}
      <ConfirmDialog
        open={deleteCategoryDialogOpen}
        onOpenChange={setDeleteCategoryDialogOpen}
        title="Delete Category"
        description={
          categories.find((c) => c.id === categoryToDelete)?.passwordCount
            ? 'This category contains passwords. All passwords will be moved to "Uncategorized". Continue?'
            : 'Are you sure you want to delete this category?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteCategory}
        variant="destructive"
      />
    </>
  );
};
