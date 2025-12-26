import { useState, useCallback, useMemo } from 'react';
import { CategoryList, PasswordList, PasswordDetails } from '../components';
import { usePasswords, useCategories } from '../hooks';
import { Password as PasswordEntity } from '../../domain/entities/Password';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PasswordsPage = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | 'all' | 'favorites'>('all');
  const [selectedPassword, setSelectedPassword] = useState<PasswordEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);

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

  const handleCreatePassword = useCallback(async () => {
    const categoryId = selectedCategoryId === 'all' || selectedCategoryId === 'favorites' ? null : selectedCategoryId;

    const newPassword = await createPassword({
      title: 'Untitled',
      username: '',
      password: '',
      url: '',
      notes: '',
      categoryId,
    });

    if (newPassword) {
      setSelectedPassword(new PasswordEntity(newPassword));
      refetchCategories();
    }
  }, [createPassword, selectedCategoryId, refetchCategories]);

  const handleUpdatePassword = useCallback(
    async (data: {
      title?: string;
      username?: string | null;
      password?: string;
      url?: string | null;
      notes?: string | null;
    }) => {
      if (selectedPassword) {
        const updated = await updatePassword(selectedPassword.id, data);
        if (updated) {
          setSelectedPassword(new PasswordEntity(updated));
        }
      }
    },
    [selectedPassword, updatePassword]
  );

  const handleToggleFavorite = useCallback(async () => {
    if (selectedPassword) {
      const updated = await updatePassword(selectedPassword.id, {
        isFavorite: !selectedPassword.isFavorite,
      });
      if (updated) {
        setSelectedPassword(new PasswordEntity(updated));
      }
    }
  }, [selectedPassword, updatePassword]);

  const handleDeletePassword = useCallback(async () => {
    if (selectedPassword) {
      const confirmed = window.confirm('Are you sure you want to delete this password?');
      if (confirmed) {
        const success = await deletePassword(selectedPassword.id);
        if (success) {
          setSelectedPassword(null);
          refetchCategories();
        }
      }
    }
  }, [selectedPassword, deletePassword, refetchCategories]);

  const handleMoveToCategory = useCallback(() => {
    if (selectedPassword) {
      setTargetCategoryId(selectedPassword.categoryId);
      setIsMoveDialogOpen(true);
    }
  }, [selectedPassword]);

  const handleConfirmMove = useCallback(async () => {
    if (selectedPassword) {
      const updated = await updatePassword(selectedPassword.id, {
        categoryId: targetCategoryId,
      });
      if (updated) {
        setSelectedPassword(new PasswordEntity(updated));
        setIsMoveDialogOpen(false);
        refetchPasswords();
        refetchCategories();
      }
    }
  }, [selectedPassword, targetCategoryId, updatePassword, refetchPasswords, refetchCategories]);

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

        <PasswordList
          passwords={passwords}
          selectedPasswordId={selectedPassword?.id || null}
          onSelectPassword={setSelectedPassword}
          onCreatePassword={handleCreatePassword}
          loading={passwordsLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {selectedPassword ? (
          <PasswordDetails
            password={selectedPassword}
            onUpdate={handleUpdatePassword}
            onToggleFavorite={handleToggleFavorite}
            onDelete={handleDeletePassword}
            onMoveToCategory={handleMoveToCategory}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
            Select a password to view details
          </div>
        )}
      </div>

      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Category</DialogTitle>
          </DialogHeader>
          <Select
            value={targetCategoryId || 'none'}
            onValueChange={(value) => setTargetCategoryId(value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Uncategorized</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
