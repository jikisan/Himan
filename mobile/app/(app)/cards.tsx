import { useState, useMemo } from 'react';
import { FlatList, View, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCards, useCardCategories } from '@/modules/cards/presentation/hooks';
import {
  CardsHeader,
  CategoryChips,
  CardListItem,
  CardDetailSheet,
  DeleteCardModal,
  CategoryModal,
  EmptyState,
} from '@/modules/cards/presentation/components';
import type { CreditCardType, CardCategoryType } from '@himan/shared/cards';

type SelectedCategoryId = 'all' | 'favorites' | string | null;

type CategoryModalState =
  | null
  | { mode: 'add' }
  | { mode: 'edit'; category: CardCategoryType };

export default function CardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedCategoryId, setSelectedCategoryId] = useState<SelectedCategoryId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CreditCardType | null>(null);
  const [deleteCard, setDeleteCard] = useState<CreditCardType | null>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(null);

  const { cards: allCards, loading, deleteCard: doDelete, toggleFavorite } = useCards();
  const { categories, createCategory, updateCategory, deleteCategory } = useCardCategories();

  const cards = useMemo(() => {
    let filtered = allCards;
    if (selectedCategoryId === 'favorites') {
      filtered = filtered.filter((c) => c.isFavorite);
    } else if (selectedCategoryId !== 'all') {
      filtered = filtered.filter((c) => c.categoryId === selectedCategoryId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.cardName.toLowerCase().includes(q) ||
          (c.bankName || '').toLowerCase().includes(q) ||
          (c.cardIssuer || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [allCards, selectedCategoryId, searchQuery]);

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) setSearchQuery('');
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    await toggleFavorite(id, isFavorite);
    if (selectedCard?.id === id) {
      setSelectedCard((prev) => prev ? { ...prev, isFavorite } : null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCard) return;
    await doDelete(deleteCard.id);
    setDeleteCard(null);
    setSelectedCard(null);
  };

  const handleCategoryDelete = async (id: string) => {
    await deleteCategory(id);
    if (selectedCategoryId === id) setSelectedCategoryId('all');
    setCategoryModal(null);
  };

  const hasSearch = isSearchOpen && searchQuery.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 relative">
      <CardsHeader
        onBack={() => router.back()}
        searchQuery={searchQuery}
        isSearchOpen={isSearchOpen}
        onToggleSearch={handleToggleSearch}
        onSearchChange={setSearchQuery}
        onAdd={() => router.push('/(app)/cards/add')}
      />

      <CategoryChips
        selectedId={selectedCategoryId}
        categories={categories}
        onSelect={setSelectedCategoryId}
        onLongPressCategory={(cat) => setCategoryModal({ mode: 'edit', category: cat })}
        onAddCategory={() => setCategoryModal({ mode: 'add' })}
      />

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CardListItem
            card={item}
            onPress={setSelectedCard}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
        contentContainerStyle={
          cards.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 100 }
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              hasSearch={hasSearch}
              onAdd={() => router.push('/(app)/cards/add')}
            />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <View style={{ position: 'absolute', bottom: 24 + insets.bottom, right: 16 }}>
        <Pressable
          onPress={() => router.push('/(app)/cards/add')}
          className="w-14 h-14 bg-indigo-500 rounded-full items-center justify-center shadow-lg active:bg-indigo-600"
        >
          <Feather name="plus" size={26} color="#ffffff" />
        </Pressable>
      </View>

      <CardDetailSheet
        card={selectedCard}
        visible={!!selectedCard}
        categories={categories}
        onClose={() => setSelectedCard(null)}
        onEdit={(card) => {
          setSelectedCard(null);
          router.push(`/(app)/cards/${card.id}`);
        }}
        onDelete={(card) => {
          setSelectedCard(null);
          setDeleteCard(card);
        }}
        onToggleFavorite={handleToggleFavorite}
      />

      <DeleteCardModal
        card={deleteCard}
        visible={!!deleteCard}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteCard(null)}
      />

      <CategoryModal
        visible={!!categoryModal}
        category={categoryModal?.mode === 'edit' ? categoryModal.category : null}
        onSave={async (data) => {
          if (categoryModal?.mode === 'edit') {
            await updateCategory(categoryModal.category.id, data);
          } else {
            await createCategory(data);
          }
          setCategoryModal(null);
        }}
        onDelete={
          categoryModal?.mode === 'edit'
            ? () => handleCategoryDelete(categoryModal.category.id)
            : undefined
        }
        onClose={() => setCategoryModal(null)}
      />
    </SafeAreaView>
  );
}
