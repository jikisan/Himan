import { useState, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Shadow } from 'react-native-shadow-2';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import { useGrocerySession, useGroceryRealtime } from '@/modules/grocery/presentation/hooks';
import {
  SessionBanner,
  EndShoppingModal,
  AddShopperModal,
  SessionHeader,
  SessionParticipants,
  SessionTabSwitcher,
  SessionItemList,
} from '@/modules/grocery/presentation/components';
import { ItemDetailSheet } from '@/modules/grocery/presentation/components';
import { TabType, CollapseLevel } from '@/modules/grocery/presentation/components/Session/types';

export default function GrocerySessionScreen() {
  const { user } = useAuth();
  const router = useRouter();

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('to-get');
  const [endShoppingDialogOpen, setEndShoppingDialogOpen] = useState(false);
  const [shoppersDialogOpen, setShoppersDialogOpen] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [collapseStamp, setCollapseStamp] = useState<{ level: CollapseLevel; n: number }>({
    level: 0,
    n: 1,
  });
  const [collapseLevel, setCollapseLevel] = useState<CollapseLevel>(0);

  // Data hooks
  const {
    activeSession,
    participants,
    realtimeService,
    endSession,
    cancelSession,
    purchaseItem,
    unpurchaseItem,
    addShopper,
    addSessionItem,
    isEnding,
    isCancelling,
    isAddingShopper,
  } = useGrocerySession({ enablePresence: true });

  useGroceryRealtime(null, activeSession?.id ?? null, realtimeService);

  // Derived state
  const sessionItemsByList = activeSession
    ? activeSession.items.reduce((acc: Record<string, any[]>, item) => {
        const listName = item.listName || 'Unknown';
        if (!acc[listName]) acc[listName] = [];
        acc[listName].push(item);
        return acc;
      }, {})
    : {};

  const unpurchasedItems = activeSession?.items.filter((i) => !i.isPurchased) ?? [];
  const purchasedItems = activeSession?.items.filter((i) => i.isPurchased) ?? [];

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

  const handleAddItem = useCallback(() => {
    setIsAddingItem(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setIsAddingItem(false);
  }, []);

  const handleAddNewItem = useCallback(
    async (dto: any) => {
      try {
        await addSessionItem({
          name: dto.name,
          category: dto.category,
          quantity: dto.quantity,
          unit: dto.unit,
          notes: dto.notes,
        });
        setIsAddingItem(false);
      } catch (err) {
        console.error('Failed to add item:', err);
      }
    },
    [addSessionItem]
  );

  const handleToggleCollapse = useCallback(() => {
    const nextLevel: CollapseLevel = collapseLevel === 0 ? 1 : collapseLevel === 1 ? 2 : 0;
    setCollapseLevel(nextLevel);
    setCollapseStamp((prev) => ({ level: nextLevel, n: (prev?.n ?? 0) + 1 }));
  }, [collapseLevel]);

  // Empty state
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
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900 relative">
      <SessionHeader
        storeName={activeSession.storeName || 'Unknown Store'}
        progress={activeSession.items.length > 0 ? purchasedItems.length / activeSession.items.length : 0}
        onOpenShoppers={() => setShoppersDialogOpen(true)}
        onOpenEndShopping={() => setEndShoppingDialogOpen(true)}
      />

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


      <SessionParticipants count={participants.length} />

      <SessionTabSwitcher
        activeTab={activeTab}
        onTabChange={setActiveTab}
        toGetCount={unpurchasedItems.length}
        purchasedCount={purchasedItems.length}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1">
          <SessionItemList
            activeTab={activeTab}
            sessionItemsByList={sessionItemsByList}
            unpurchasedItems={unpurchasedItems}
            purchasedItems={purchasedItems}
            collapseLevel={collapseLevel}
            collapseStamp={collapseStamp}
            onToggleCollapse={handleToggleCollapse}
            onTogglePurchase={handleTogglePurchase}
          />
          <View className="h-24" />
        </ScrollView>
      </KeyboardAvoidingView>

      <EndShoppingModal
        open={endShoppingDialogOpen}
        onOpenChange={setEndShoppingDialogOpen}
        onComplete={handleCompleteShopping}
        onCancel={handleCancelShopping}
        isCompleting={isEnding}
        isCancelling={isCancelling}
      />

      <AddShopperModal
        open={shoppersDialogOpen}
        onOpenChange={setShoppersDialogOpen}
        onAddShopper={handleAddShopper}
        isAdding={isAddingShopper}
        members={activeSession.members}
        participants={participants}
        startedBy={activeSession.startedBy}
      />

      <ItemDetailSheet
        open={isAddingItem}
        onOpenChange={(open) => !open && handleCloseSheet()}
        item={null}
        mode="add"
        listId=""
        onAdd={handleAddNewItem}
        onSave={() => {}}
        onDelete={() => {}}
      />

      <View className="absolute bottom-6 right-4">
          <Pressable
              onPress={handleAddItem}
              className="w-14 h-14 bg-indigo-500 rounded-full items-center justify-center"
          >
              <Feather name="plus" size={28} color="#ffffff" />
          </Pressable>
      </View>
    </SafeAreaView>
  );
}
