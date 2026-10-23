import { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import {
  useGroceryLists,
  useGroceryItems,
  useGrocerySession,
  useProductCatalog,
  useSuggestions,
  useGroceryInvitations,
  useGroceryRealtime,
} from '@/modules/grocery/presentation/hooks';
import {
  ItemDetailSheet,
  ShareListModal,
  GroceryListDetailHeader,
  GroceryListCollapseToggle,
  GroceryListEmptyState,
  AddItemInput,
  CategoryGroup,
  SuggestionChips,
} from '@/modules/grocery/presentation/components';
import { PaperSurface } from '@/modules/grocery/presentation/components/notebook';
import type { GroceryItemType } from '@himan/shared/grocery';

export default function GroceryListDetailScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const listId = params.listId as string;
  const userId = user?.id ?? '';

  const [editingItem, setEditingItem] = useState<GroceryItemType | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [pendingItemName, setPendingItemName] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collapseStamp, setCollapseStamp] = useState<{ level: 0 | 1 | 2; n: number }>({ level: 2, n: 1 });
  const [collapseLevel, setCollapseLevel] = useState<0 | 1 | 2>(2);

  const { lists } = useGroceryLists();
  const {
    items,
    uncheckedItems,
    checkedItems,
    addItem,
    updateItem,
    checkItem,
    uncheckItem,
    deleteItem,
  } = useGroceryItems(listId);
  const { activeSession, realtimeService } = useGrocerySession();
  const { products } = useProductCatalog();
  const { suggestions } = useSuggestions(listId, items);
  const { members, invite, cancelInvitation, removeMember } = useGroceryInvitations(listId);

  useGroceryRealtime(listId, activeSession?.id, realtimeService);

  const selectedList = lists.find((l) => l.id === listId);

  const suggestionNames = useMemo(
    () => suggestions.map((s) => (typeof s === 'string' ? s : s.product.name)),
    [suggestions]
  );

  // One straight list: group ALL items by category, unchecked first then checked
  // (crossed-off items stay in place, struck + greyed — no separate tab).
  const groupedAll = useMemo(() => {
    const groups = new Map<string, GroceryItemType[]>();
    for (const item of [...uncheckedItems, ...checkedItems]) {
      const key = item.category || 'Other';
      const group = groups.get(key) ?? [];
      group.push(item);
      groups.set(key, group);
    }
    return groups;
  }, [uncheckedItems, checkedItems]);

  const handleEditItem = useCallback((item: GroceryItemType) => {
    setEditingItem(item);
    setIsAddingItem(false);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setEditingItem(null);
    setIsAddingItem(false);
    setPendingItemName('');
  }, []);

  const handleRequestAddDetails = useCallback((name: string) => {
    setEditingItem(null);
    setPendingItemName(name);
    setIsAddingItem(true);
  }, []);

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      addItem({ listId, name: suggestion });
    },
    [addItem, listId]
  );

  const handleToggleCollapse = useCallback(() => {
    const nextLevel: 0 | 1 | 2 = collapseLevel === 2 ? 0 : 2;
    setCollapseLevel(nextLevel);
    setCollapseStamp((prev) => ({ level: nextLevel, n: (prev?.n ?? 0) + 1 }));
  }, [collapseLevel]);

  const allSelected = items.length > 0 && uncheckedItems.length === 0;

  const handleToggleSelectAll = useCallback(() => {
    if (allSelected) {
      checkedItems.forEach((item) => uncheckItem(item.id));
    } else {
      uncheckedItems.forEach((item) => checkItem(item.id));
    }
  }, [allSelected, checkedItems, uncheckedItems, checkItem, uncheckItem]);

  const handleSaveItem = useCallback(
    async (id: string, dto: any) => {
      await updateItem(id, dto);
    },
    [updateItem]
  );

  const handleAddNewItem = useCallback(
    async (dto: any) => {
      await addItem(dto);
    },
    [addItem]
  );

  if (!selectedList) {
    return (
      <PaperSurface>
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-[15px] font-serif text-ink-soft dark:text-ink-softdark">List not found</Text>
        </SafeAreaView>
      </PaperSurface>
    );
  }

  const hasItems = items.length > 0;

  return (
    <PaperSurface>
      <SafeAreaView className="flex-1" edges={['top']}>
        <GroceryListDetailHeader
          listName={selectedList.name}
          memberCount={members.length}
          itemCount={items.length}
          onShare={() => setShareDialogOpen(true)}
        />

        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <View className="px-5 pt-3">
            <AddItemInput
              listId={listId}
              products={products}
              onAddItem={handleAddNewItem}
              onRequestAddDetails={handleRequestAddDetails}
            />
          </View>

          <GroceryListCollapseToggle
            collapseLevel={collapseLevel}
            onToggle={handleToggleCollapse}
            visible={groupedAll.size > 0}
            allSelected={allSelected}
            onToggleSelectAll={handleToggleSelectAll}
          />

          <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

            {Array.from(groupedAll.entries()).map(([category, catItems]) => (
              <CategoryGroup
                key={category}
                category={category}
                items={catItems}
                isSessionActive={!!activeSession}
                collapseStamp={collapseStamp}
                onCheck={checkItem}
                onUncheck={uncheckItem}
                onEditItem={handleEditItem}
                onDeleteItem={deleteItem}
              />
            ))}

            {!hasItems && <GroceryListEmptyState type="no-items" />}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ItemDetailSheet
        open={!!editingItem || isAddingItem}
        onOpenChange={(open) => !open && handleCloseSheet()}
        item={editingItem}
        mode={isAddingItem ? 'add' : 'edit'}
        initialName={pendingItemName}
        listId={listId}
        onSave={handleSaveItem}
        onAdd={handleAddNewItem}
        onDelete={deleteItem}
      />

      <ShareListModal
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        listName={selectedList.name}
        members={members}
        invitations={[]}
        currentUserId={userId}
        onInvite={invite}
        onCancelInvitation={cancelInvitation}
        onRemoveMember={removeMember}
      />
    </PaperSurface>
  );
}
