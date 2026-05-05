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
  const [activeTab, setActiveTab] = useState<'to-get' | 'checked'>('to-get');
  const [editingItem, setEditingItem] = useState<GroceryItemType | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collapseStamp, setCollapseStamp] = useState<{ level: 0 | 1 | 2; n: number }>({ level: 0, n: 1 });
  const [collapseLevel, setCollapseLevel] = useState<0 | 1 | 2>(0);

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
          <Pressable onPress={() => setShareDialogOpen(true)} className="p-2">
            <Feather name="share-2" size={20} color="#6b7280" />
          </Pressable>
        </View>
      </View>

      {/* Add item input */}
      <View className="px-3 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <AddItemInput
            listId={listId}
            products={products}
            onAddItem={handleAddItem}
        />
      </View>

      {/* Tab switcher */}
      <View className="flex flex-row border-b border-gray-200 dark:border-gray-700">
        <Pressable
          onPress={() => setActiveTab('to-get')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
            activeTab === 'to-get'
              ? 'border-indigo-500'
              : 'border-transparent'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === 'to-get'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            To Get
          </Text>
          {uncheckedItems.length > 0 && (
            <View className="bg-indigo-500/10 rounded-full px-1.5 py-0.5">
              <Text className="text-xs text-indigo-500 font-medium">
                {uncheckedItems.length}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('checked')}
          className={`flex-1 flex-row items-center justify-center gap-1.5 py-3 border-b-2 ${
            activeTab === 'checked'
              ? 'border-indigo-500'
              : 'border-transparent'
          }`}
        >
          <Text
            className={`text-sm font-medium ${
              activeTab === 'checked'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            Checked
          </Text>
          {checkedItems.length > 0 && (
            <View className="bg-gray-500/10 rounded-full px-1.5 py-0.5">
              <Text className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {checkedItems.length}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          {activeTab === 'to-get' ? (
            <>
              {/* Collapse toggle */}
              {groupedItems.size > 0 && (
                <View className="px-3 py-2 flex-row justify-end">
                  <Pressable
                    onPress={() => {
                      const nextLevel: 0 | 1 | 2 = collapseLevel === 0 ? 1 : collapseLevel === 1 ? 2 : 0;
                      setCollapseLevel(nextLevel);
                      setCollapseStamp(prev => ({ level: nextLevel, n: (prev?.n ?? 0) + 1 }));
                    }}
                    className="p-2"
                  >
                    <Feather name={collapseLevel === 0 ? 'maximize-2' : collapseLevel === 1 ? 'minimize-2' : 'chevrons-down'} size={18} color="#6b7280" />
                  </Pressable>
                </View>
              )}

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

              {uncheckedItems.length === 0 && checkedItems.length === 0 && (
                <View className="flex flex-col items-center justify-center py-16">
                  <Feather name="shopping-bag" size={40} color="#9ca3af" opacity={0.2} />
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-3">
                    No items yet
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Add items to get started
                  </Text>
                </View>
              )}

              {uncheckedItems.length === 0 && checkedItems.length > 0 && (
                <View className="flex flex-col items-center justify-center py-16">
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    All items checked
                  </Text>
                  <Text className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Switch to Checked tab to review
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Checked items grouped by category */}
              {checkedItems.length === 0 ? (
                <View className="flex flex-col items-center justify-center py-16">
                  <Feather name="shopping-bag" size={40} color="#9ca3af" opacity={0.2} />
                  <Text className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                    Nothing checked yet
                  </Text>
                </View>
              ) : (
                checkedItems.map((item) => (
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
                ))
              )}
            </>
          )}

          {/* Bottom padding for keyboard */}
          <View className="h-4" />
        </ScrollView>

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
