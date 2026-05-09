import { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Text, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
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
  GroceryListTabSwitcher,
  GroceryListToGetContent,
  GroceryListCheckedContent,
} from '@/modules/grocery/presentation/components';
import type { GroceryItemType } from '@himan/shared/grocery';

export default function GroceryListDetailScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const listId = params.listId as string;
  const userId = user?.id ?? '';

  // State
  const [activeTab, setActiveTab] = useState<'to-get' | 'checked'>('to-get');
  const [editingItem, setEditingItem] = useState<GroceryItemType | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collapseStamp, setCollapseStamp] = useState<{ level: 0 | 1 | 2; n: number }>({ level: 2, n: 1 });
  const [collapseLevel, setCollapseLevel] = useState<0 | 1 | 2>(2);

  // Data hooks
  const { lists } = useGroceryLists();
  const {
    items,
    uncheckedItems,
    checkedItems,
    groupedItems,
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

  const handleEditItem = useCallback((item: GroceryItemType) => {
    setEditingItem(item);
    setIsAddingItem(false);
  }, []);

  const handleAddItem = useCallback(() => {
    setIsAddingItem(true);
    setEditingItem(null);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setEditingItem(null);
    setIsAddingItem(false);
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
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">List not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 relative">
      <GroceryListDetailHeader
        listName={selectedList.name}
        memberCount={members.length}
        onShare={() => setShareDialogOpen(true)}
      />

      <GroceryListTabSwitcher
        activeTab={activeTab}
        uncheckedCount={uncheckedItems.length}
        checkedCount={checkedItems.length}
        onTabChange={setActiveTab}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1">
          {/* to-get tab — always mounted to preserve collapse state */}
          <View style={{ display: activeTab === 'to-get' ? 'flex' : 'none' }}>
            <GroceryListToGetContent
              groupedItems={groupedItems}
              uncheckedItems={uncheckedItems}
              checkedItems={checkedItems}
              suggestions={suggestionNames}
              isSessionActive={!!activeSession}
              collapseLevel={collapseLevel}
              collapseStamp={collapseStamp}
              onToggleCollapse={handleToggleCollapse}
              onSelectSuggestion={handleSelectSuggestion}
              onCheck={checkItem}
              onUncheck={uncheckItem}
              onEditItem={handleEditItem}
              onDeleteItem={deleteItem}
            />
          </View>
          {/* checked tab — always mounted to preserve state */}
          <View style={{ display: activeTab === 'checked' ? 'flex' : 'none' }}>
            <GroceryListCheckedContent
              checkedItems={checkedItems}
              isSessionActive={!!activeSession}
              onCheck={checkItem}
              onUncheck={uncheckItem}
              onEditItem={handleEditItem}
              onDeleteItem={deleteItem}
            />
          </View>
          <View className="h-4" />
        </ScrollView>
      </KeyboardAvoidingView>

      <ItemDetailSheet
        open={!!editingItem || isAddingItem}
        onOpenChange={(open) => !open && handleCloseSheet()}
        item={editingItem}
        mode={isAddingItem ? 'add' : 'edit'}
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

      <View style={{ position: 'absolute', bottom: 24 + insets.bottom, right: 16 }}>
        <Pressable
          onPress={handleAddItem}
          className="w-14 h-14 bg-indigo-500 rounded-full items-center justify-center shadow-lg"
        >
          <Feather name="plus" size={28} color="#ffffff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
