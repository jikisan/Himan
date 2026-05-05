import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import {
  useGrocerySession,
  useGroceryItems,
} from '@/modules/grocery/presentation/hooks';
import {
  SessionBanner,
  SessionListGroup,
  EndShoppingModal,
  AddShopperModal,
} from '@/modules/grocery/presentation/components';

export default function GrocerySessionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? '';

  // State
  const [showPurchased, setShowPurchased] = useState(false);
  const [endShoppingDialogOpen, setEndShoppingDialogOpen] = useState(false);
  const [shoppersDialogOpen, setShoppersDialogOpen] = useState(false);
  const [newSessionItem, setNewSessionItem] = useState('');

  // Data hooks
  const {
    activeSession,
    participants,
    startSession,
    endSession,
    cancelSession,
    purchaseItem,
    unpurchaseItem,
    addShopper,
    removeShopper,
    addSessionItem,
    isAddingSessionItem,
    isStarting,
    isEnding,
    isCancelling,
    isAddingShopper,
  } = useGrocerySession();
  const { items } = useGroceryItems(null);

  // Group session items by list name
  const sessionItemsByList = activeSession
    ? activeSession.items.reduce((acc: Record<string, any[]>, item) => {
        const listName = item.listName || 'Unknown';
        if (!acc[listName]) acc[listName] = [];
        acc[listName].push(item);
        return acc;
      }, {})
    : {};

  const unpurchasedItems = activeSession
    ? activeSession.items.filter((i) => !i.isPurchased)
    : [];

  const purchasedItems = activeSession
    ? activeSession.items.filter((i) => i.isPurchased)
    : [];

  // Handlers
  const handleTogglePurchase = useCallback(
    (sessionItemId: string, groceryItemId: string | null) => {
      const item = activeSession?.items.find((i) => i.id === sessionItemId);
      if (item?.isPurchased) {
        unpurchaseItem(sessionItemId, groceryItemId);
      } else {
        purchaseItem(sessionItemId, groceryItemId);
      }
    },
    [activeSession, purchaseItem, unpurchaseItem]
  );

  const handleCompleteShopping = useCallback(async () => {
    await endSession();
    router.back();
  }, [endSession, router]);

  const handleCancelShopping = useCallback(async () => {
    await cancelSession();
    router.back();
  }, [cancelSession, router]);

  const handleAddShopper = useCallback(
    async (email: string) => {
      await addShopper(email);
    },
    [addShopper]
  );

  const handleAddSessionItem = useCallback(async () => {
    const trimmed = newSessionItem.trim();
    if (!trimmed || !activeSession) return;
    await addSessionItem(trimmed);
    setNewSessionItem('');
  }, [newSessionItem, activeSession, addSessionItem]);

  if (!activeSession) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-500 dark:text-gray-400">No active session</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900" edges={['bottom']}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <View className="flex flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-1">
            <Feather name="arrow-left" size={20} color="#6b7280" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Shopping Session</Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {activeSession.storeName}
            </Text>
          </View>
          <Pressable onPress={() => setShoppersDialogOpen(true)} className="p-2">
            <Feather name="users" size={20} color="#6b7280" />
          </Pressable>
          <Pressable onPress={() => setEndShoppingDialogOpen(true)} className="p-2">
            <Feather name="more-vertical" size={20} color="#6b7280" />
          </Pressable>
        </View>
      </View>

      {/* Session banner */}
      <View className="px-3 mt-2">
        <SessionBanner
          storeName={activeSession.storeName || 'Unknown Store'}
          progress={activeSession.items.length > 0 ? purchasedItems.length / activeSession.items.length : 0}
          completedCount={purchasedItems.length}
          totalCount={activeSession.items.length}
          onEnd={() => setEndShoppingDialogOpen(true)}
          onCancel={handleCancelShopping}
        />
      </View>

      {/* Participants */}
      {participants.length > 1 && (
        <View className="px-3 mt-3">
          <View className="flex flex-row items-center gap-2">
            <Feather name="users" size={14} color="#6b7280" />
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {participants.length} shopper{participants.length !== 1 ? 's' : ''} active
            </Text>
          </View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1">
          {/* Unpurchased items grouped by list */}
          {Object.entries(sessionItemsByList).map(([listName, listItems]) => {
            const unpurchasedListItems = listItems.filter((i: any) => !i.isPurchased);
            if (unpurchasedListItems.length === 0) return null;
            return (
              <SessionListGroup
                key={listName}
                listName={listName}
                items={unpurchasedListItems}
                onTogglePurchase={handleTogglePurchase}
              />
            );
          })}

          {/* Purchased items section */}
          {purchasedItems.length > 0 && (
            <View className="mt-4">
              <Pressable
                onPress={() => setShowPurchased(!showPurchased)}
                className="flex flex-row items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800"
              >
                {showPurchased ? (
                  <Feather name="chevron-down" size={16} color="#6b7280" />
                ) : (
                  <Feather name="chevron-right" size={16} color="#6b7280" />
                )}
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Purchased ({purchasedItems.length})
                </Text>
              </Pressable>

              {showPurchased && (
                <View className="mt-1">
                  {Object.entries(sessionItemsByList).map(([listName, listItems]) => {
                    const purchasedListItems = listItems.filter((i: any) => i.isPurchased);
                    if (purchasedListItems.length === 0) return null;
                    return (
                      <SessionListGroup
                        key={listName}
                        listName={listName}
                        items={purchasedListItems}
                        onTogglePurchase={handleTogglePurchase}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Bottom padding */}
          <View className="h-24" />
        </ScrollView>

        {/* Ad-hoc add item input */}
        <View className="px-3 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <View className="flex flex-row gap-2">
            <TextInput
              placeholder="Add item..."
              placeholderTextColor="#9ca3af"
              value={newSessionItem}
              onChangeText={setNewSessionItem}
              onSubmitEditing={handleAddSessionItem}
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800"
            />
            <Pressable
              onPress={handleAddSessionItem}
              disabled={!newSessionItem.trim() || isAddingSessionItem}
              className={`rounded-lg px-4 justify-center ${
                !newSessionItem.trim() || isAddingSessionItem
                  ? 'bg-gray-300 dark:bg-gray-700'
                  : 'bg-indigo-500'
              }`}
            >
              <Feather name="plus" size={20} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* End shopping modal */}
      <EndShoppingModal
        open={endShoppingDialogOpen}
        onOpenChange={setEndShoppingDialogOpen}
        onComplete={handleCompleteShopping}
        onCancel={handleCancelShopping}
        isCompleting={isEnding}
        isCancelling={isCancelling}
      />

      {/* Add shopper modal */}
      <AddShopperModal
        open={shoppersDialogOpen}
        onOpenChange={setShoppersDialogOpen}
        onAddShopper={handleAddShopper}
        isAdding={isAddingShopper}
      />
    </SafeAreaView>
  );
}
