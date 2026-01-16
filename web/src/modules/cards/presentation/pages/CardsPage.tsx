import { useState, useCallback, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { CardCategoryList, CardDialog, CardGrid } from '../components';
import { useCards, useCardCategories } from '../hooks';
import type { CreditCardType } from '../../domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui';

export const CardsPage = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null | 'all' | 'favorites'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);
  const [isCardDialogOpen, setIsCardDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [deleteCardDialogOpen, setDeleteCardDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const cardFilters = useMemo(() => {
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
    cards,
    loading: cardsLoading,
    createCard,
    updateCard,
    deleteCard,
    refetch: refetchCards,
  } = useCards(cardFilters);

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    refetch: refetchCategories,
  } = useCardCategories();

  const handleAddCard = useCallback(() => {
    setEditingCard(null);
    setIsCardDialogOpen(true);
  }, []);

  const handleEditCard = useCallback((card: CreditCardType) => {
    setEditingCard(card);
    setIsCardDialogOpen(true);
  }, []);

  const handleSaveCard = useCallback(
    async (data: {
      cardName: string;
      cardNumber: string;
      cvv: string;
      expiryMonth: number;
      expiryYear: number;
      bankName?: string | null;
      cardIssuer?: string | null;
      cardType?: string | null;
      categoryId?: string | null;
      notes?: string | null;
    }) => {
      if (editingCard) {
        await updateCard(editingCard.id, data);
      } else {
        await createCard(data);
      }
      refetchCards();
      refetchCategories();
    },
    [editingCard, createCard, updateCard, refetchCards, refetchCategories]
  );

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      const card = cards.find((c) => c.id === id);
      if (card) {
        await updateCard(id, { isFavorite: !card.isFavorite });
      }
    },
    [cards, updateCard]
  );

  const handleDeleteCard = useCallback(
    async (id: string) => {
      setCardToDelete(id);
      setDeleteCardDialogOpen(true);
    },
    []
  );

  const confirmDeleteCard = useCallback(async () => {
    if (cardToDelete) {
      const success = await deleteCard(cardToDelete);
      if (success) {
        refetchCategories();
      }
      setCardToDelete(null);
    }
  }, [cardToDelete, deleteCard, refetchCategories]);

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
      refetchCards();
      if (selectedCategoryId === categoryToDelete) {
        setSelectedCategoryId('all');
      }
      setCategoryToDelete(null);
    }
  }, [categoryToDelete, deleteCategory, selectedCategoryId, refetchCategories, refetchCards]);

  const handleToggleCategoryCollapse = useCallback(() => {
    setIsCategoryCollapsed((prev) => !prev);
  }, []);

  return (
    <>
      <div className="flex h-screen bg-secondary">
        <CardCategoryList
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
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAddCard}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </div>

          {/* Card Grid */}
          {cardsLoading ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Loading...
            </div>
          ) : (
            <CardGrid
              cards={cards}
              onEdit={handleEditCard}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteCard}
            />
          )}
        </div>
      </div>

      <CardDialog
        open={isCardDialogOpen}
        onOpenChange={setIsCardDialogOpen}
        card={editingCard}
        categories={categories}
        onSave={handleSaveCard}
      />

      {/* Delete Card Confirmation */}
      <ConfirmDialog
        open={deleteCardDialogOpen}
        onOpenChange={setDeleteCardDialogOpen}
        title="Delete Credit Card"
        description="Are you sure you want to delete this credit card? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteCard}
        variant="destructive"
      />

      {/* Delete Category Confirmation */}
      <ConfirmDialog
        open={deleteCategoryDialogOpen}
        onOpenChange={setDeleteCategoryDialogOpen}
        title="Delete Category"
        description={
          categories.find((c) => c.id === categoryToDelete)?.cardCount
            ? 'This category contains cards. All cards will be moved to "Uncategorized". Continue?'
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