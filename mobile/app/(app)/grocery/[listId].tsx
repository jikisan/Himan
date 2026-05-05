import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
  CategoryGroup,
  AddItemInput,
  SuggestionChips,
  ItemDetailSheet,
  ShareListModal,
} from '@/modules/grocery/presentation/components';
import type { GroceryItemType } from '@himan/shared/grocery';

export default function GroceryListDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const listId = params.listId as string;
  const userId = user?.id ?? '';

  // State
  const [showChecked, setShowChecked] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItemType | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collapseStamp, setCollapseStamp] = useState<{ collapsed: boolean; n: number }>({ collapsed: true, n: 1 });
  const [allCollapsed, setAllCollapsed] = useState(true);

  // Data hooks
  const { lists, updateList } = useGroceryLists();
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
  const pendingInvitations: any[] = [];

  useGroceryRealtime(listId, activeSession?.id, realtimeService);

  const selectedList = lists.find((l) => l.id === listId);

  // Handlers
  const handleAddItem = useCallback(
    (dto: any) => {
      addItem(dto);
    },
    [addItem]
  );

  const handleEditItem = useCallback((item: GroceryItemType) => {
    setEditingItem(item);
  }, []);

  const handleSaveItem = useCallback(
    async (id: string, dto: any) => {
      await updateItem(id, dto);
    },
    [updateItem]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      await deleteItem(id);
    },
    [deleteItem]
  );

  const handleSelectSuggestion = useCallback(
    (suggestion: string) => {
      addItem({ listId, name: suggestion });
    },
    [addItem, listId]
  );

  // Map ItemSuggestion[] to string[] for SuggestionChips
  const suggestionNames = suggestions.map(s => typeof s === 'string' ? s : s.product.name);

  const handleInvite = useCallback(
    async (email: string) => {
      await invite(email);
    },
    [invite]
  );

  const handleCancelInvitation = useCallback(
    async (invitationId: string) => {
      await cancelInvitation(invitationId);
    },
    [cancelInvitation]
  );

  const handleRemoveMember = useCallback(
    async (memberUserId: string) => {
      await removeMember(memberUserId);
    },
    [removeMember]
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" >
      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <View className="flex flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-1">
            <Feather name="arrow-left" size={20} color="#6b7280" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 dark:text-white" numberOfLines={1}>
              {selectedList.name}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              const next = !allCollapsed;
              setAllCollapsed(next);
              setCollapseStamp(prev => ({ collapsed: next, n: (prev?.n ?? 0) + 1 }));
            }}
            className="p-2"
          >
            <Feather name={allCollapsed ? 'maximize-2' : 'minimize-2'} size={18} color="#6b7280" />
          </Pressable>
          <Pressable onPress={() => setShareDialogOpen(true)} className="p-2">
            <Feather name="share-2" size={20} color="#6b7280" />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          {/* Suggestions */}
          {suggestionNames.length > 0 && (
            <View className="mt-2">
              <SuggestionChips
                suggestions={suggestionNames}
                onSelectSuggestion={handleSelectSuggestion}
              />
            </View>
          )}

          {/* Unchecked items grouped by category */}
          {Array.from(groupedItems.entries()).map(([category, items]) => (
            <CategoryGroup
              key={category}
              category={category}
              items={items}
              isSessionActive={!!activeSession}
              collapseStamp={collapseStamp}
              onCheck={checkItem}
              onUncheck={uncheckItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
            />
          ))}

          {/* Checked items section */}
          {checkedItems.length > 0 && (
            <View className="mt-4">
              <Pressable
                onPress={() => setShowChecked(!showChecked)}
                className="flex flex-row items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800"
              >
                {showChecked ? (
                  <Feather name="chevron-down" size={16} color="#6b7280" />
                ) : (
                  <Feather name="chevron-right" size={16} color="#6b7280" />
                )}
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Checked ({checkedItems.length})
                </Text>
              </Pressable>

              {showChecked && (
                <View className="mt-1">
                  {checkedItems.map((item) => (
                    <CategoryGroup
                      key={item.id}
                      category={item.category || 'Other'}
                      items={[item]}
                      isSessionActive={!!activeSession}
                      onCheck={checkItem}
                      onUncheck={uncheckItem}
                      onEditItem={handleEditItem}
                      onDeleteItem={handleDeleteItem}
                    />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Bottom padding for keyboard */}
          <View className="h-4" />
        </ScrollView>

        {/* Add item input */}
        <View className="px-3 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <AddItemInput
            listId={listId}
            products={products}
            onAddItem={handleAddItem}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Item detail sheet */}
      <ItemDetailSheet
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />

      {/* Share modal */}
      <ShareListModal
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        listName={selectedList.name}
        members={members}
        invitations={pendingInvitations}
        currentUserId={userId}
        onInvite={handleInvite}
        onCancelInvitation={handleCancelInvitation}
        onRemoveMember={handleRemoveMember}
      />
    </SafeAreaView>
  );
}
