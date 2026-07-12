import { useState, useMemo } from 'react';
import { FlatList, View, Pressable } from 'react-native';
import { useToast } from '@/modules/shared/components/useToast';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { usePasswords, usePasswordCategories } from '@/modules/passwords/presentation/hooks';
import {
  PasswordsHeader,
  CategoryChips,
  PasswordListItem,
  PasswordDetailSheet,
  DeletePasswordModal,
  CategoryModal,
  EmptyState,
} from '@/modules/passwords/presentation/components';
import type { PasswordType, CategoryType } from '@himan/shared/passwords';

type SelectedCategoryId = 'all' | 'favorites' | string | null;

type CategoryModalState =
  | null
  | { mode: 'add' }
  | { mode: 'edit'; category: CategoryType };

export default function PasswordsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedCategoryId, setSelectedCategoryId] = useState<SelectedCategoryId>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedPassword, setSelectedPassword] = useState<PasswordType | null>(null);
  const [passwordToDelete, setPasswordToDelete] = useState<PasswordType | null>(null);
  const [categoryModal, setCategoryModal] = useState<CategoryModalState>(null);

  const { showToast, ToastView } = useToast();
  const { passwords: allPasswords, loading, deletePassword, toggleFavorite } = usePasswords();
  const { categories, createCategory, updateCategory, deleteCategory } = usePasswordCategories();

  const passwords = useMemo(() => {
    let filtered = allPasswords;
    if (selectedCategoryId === 'favorites') {
      filtered = filtered.filter((p) => p.isFavorite);
    } else if (selectedCategoryId !== 'all') {
      filtered = filtered.filter((p) => p.categoryId === selectedCategoryId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.username || '').toLowerCase().includes(q) ||
          (p.url || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [allPasswords, selectedCategoryId, searchQuery]);

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
    if (isSearchOpen) setSearchQuery('');
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    await toggleFavorite(id, isFavorite);
    if (selectedPassword?.id === id) {
      setSelectedPassword((prev) => prev ? { ...prev, isFavorite } : null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!passwordToDelete) return;
    await deletePassword(passwordToDelete.id);
    setPasswordToDelete(null);
    setSelectedPassword(null);
  };

  const handleCategoryDelete = async (id: string) => {
    await deleteCategory(id);
    if (selectedCategoryId === id) setSelectedCategoryId('all');
    setCategoryModal(null);
  };

  const hasSearch = isSearchOpen && searchQuery.trim().length > 0;

  return (
    <View className="flex-1">
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 relative">
      <PasswordsHeader
        onBack={() => router.back()}
        searchQuery={searchQuery}
        isSearchOpen={isSearchOpen}
        onToggleSearch={handleToggleSearch}
        onSearchChange={setSearchQuery}
      />

      <CategoryChips
        selectedId={selectedCategoryId}
        categories={categories}
        onSelect={setSelectedCategoryId}
        onLongPressCategory={(cat) => setCategoryModal({ mode: 'edit', category: cat })}
        onAddCategory={() => setCategoryModal({ mode: 'add' })}
      />

      <FlatList
        style={{ flex: 1 }}
        data={passwords}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PasswordListItem
            password={item}
            onPress={setSelectedPassword}
            onToggleFavorite={handleToggleFavorite}
            onCopied={(label) => showToast(label, 'success')}
          />
        )}
        contentContainerStyle={
          passwords.length === 0 ? { flex: 1 } : { paddingTop: 8, paddingBottom: 100 }
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              hasSearch={hasSearch}
              onAdd={() => router.push('/(app)/passwords/add')}
            />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <View style={{ position: 'absolute', bottom: 24 + insets.bottom, right: 16 }}>
        <Pressable
          onPress={() => router.push('/(app)/passwords/add')}
          className="w-14 h-14 bg-indigo-500 rounded-full items-center justify-center shadow-lg active:bg-indigo-600"
        >
          <Feather name="plus" size={26} color="#ffffff" />
        </Pressable>
      </View>

      <PasswordDetailSheet
        password={selectedPassword}
        visible={!!selectedPassword}
        categories={categories}
        onClose={() => setSelectedPassword(null)}
        onEdit={(pw) => {
          setSelectedPassword(null);
          router.push(`/(app)/passwords/${pw.id}`);
        }}
        onDelete={(pw) => {
          setSelectedPassword(null);
          setPasswordToDelete(pw);
        }}
        onToggleFavorite={handleToggleFavorite}
        onCopied={(label) => showToast(label, 'success')}
      />

      <DeletePasswordModal
        password={passwordToDelete}
        visible={!!passwordToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPasswordToDelete(null)}
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
    {ToastView}
    </View>
  );
}
