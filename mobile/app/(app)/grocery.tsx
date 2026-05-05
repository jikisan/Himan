import { useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, FlatList, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import {
  useGroceryLists,
  useGrocerySession,
  useGroceryInvitations,
} from '@/modules/grocery/presentation/hooks';
import {
  GroceryListCard,
  InvitationBanner,
  SessionBanner,
  StartSessionModal,
  EndShoppingModal,
} from '@/modules/grocery/presentation/components';

export default function GroceryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const userId = user?.id ?? '';

  // List state
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Dialog state
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [endShoppingDialogOpen, setEndShoppingDialogOpen] = useState(false);

  // Data hooks
  const { lists, createList, updateList, deleteList } = useGroceryLists();
  const {
    activeSession,
    recentStores,
    startSession,
    endSession,
    cancelSession,
    isStarting,
    isEnding,
    isCancelling,
  } = useGrocerySession();
  const {
    pendingInvitations,
    acceptInvitation,
    declineInvitation,
  } = useGroceryInvitations();

  const activeLists = lists.filter((l) => !l.isArchived);
  const archivedLists = lists.filter((l) => l.isArchived);

  // Handlers
  const handleCreateList = useCallback(async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const created = await createList({ name: trimmed });
    if (created) {
      router.push(`/grocery/${created.id}`);
      setNewListName('');
      setIsCreatingList(false);
    }
  }, [newListName, createList, router]);

  const handleRenameList = useCallback(async () => {
    if (!renamingListId || !renameValue.trim()) return;
    await updateList(renamingListId, { name: renameValue.trim() });
    setRenamingListId(null);
    setRenameValue('');
  }, [renamingListId, renameValue, updateList]);

  const handleDeleteList = useCallback(async (listId: string) => {
    const list = lists.find((l) => l.id === listId);
    Alert.alert(`Delete "${list?.name ?? 'List'}"`, `Are you sure you want to delete "${list?.name ?? 'this list'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteList(listId);
        },
      },
    ]);
  }, [deleteList, lists]);

  const handleArchiveList = useCallback(async (listId: string, isArchived: boolean) => {
    await updateList(listId, { isArchived: !isArchived });
  }, [updateList]);

  const handleLeaveList = useCallback(async (listId: string) => {
    Alert.alert('Leave List', 'Are you sure you want to leave this list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await deleteList(listId);
        },
      },
    ]);
  }, [deleteList]);

  const handleStartSession = useCallback((listIds: string[], storeName: string) => {
    startSession(listIds, storeName);
  }, [startSession]);

  const handleCompleteShopping = useCallback(async () => {
    await endSession();
  }, [endSession]);

  const handleCancelShopping = useCallback(async () => {
    await cancelSession();
  }, [cancelSession]);

  const renderListCard = ({ item }: { item: any }) => {
    const isOwner = item.ownerId === userId;
    return (
      <GroceryListCard
        list={item}
        isSelected={false}
        isOwner={isOwner}
        onSelect={() => router.push(`/grocery/${item.id}`)}
        onRename={() => {
          setRenamingListId(item.id);
          setRenameValue(item.name);
        }}
        onArchive={() => handleArchiveList(item.id, item.isArchived)}
        onDelete={() => handleDeleteList(item.id)}
        onLeave={() => handleLeaveList(item.id)}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <View className="flex flex-row items-center gap-3">
          <Pressable onPress={() => router.back()} className="p-1">
            <Feather name="arrow-left" size={20} color="#6b7280" />
          </Pressable>
          <Text className="flex-1 text-xl font-bold text-gray-900 dark:text-white">Grocery</Text>
          {!activeSession && (
            <Pressable
              onPress={() => setSessionDialogOpen(true)}
              disabled={activeLists.every((l) => l.itemCount === 0)}
              className={`p-2 rounded-lg ${
                activeLists.every((l) => l.itemCount === 0)
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : 'bg-indigo-500'
              }`}
            >
              <Feather name="shopping-cart" size={20} color="#ffffff" />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Active session banner */}
        {activeSession && (
          <View className="px-3 mt-2">
            <SessionBanner
              storeName={activeSession.storeName || 'Unknown Store'}
              progress={activeSession.items.length > 0 ? activeSession.items.filter((i) => i.isPurchased).length / activeSession.items.length : 0}
              completedCount={activeSession.items.filter((i) => i.isPurchased).length}
              totalCount={activeSession.items.length}
              onEnd={() => setEndShoppingDialogOpen(true)}
              onCancel={handleCancelShopping}
            />
            <Pressable
              onPress={() => router.push('/grocery/session')}
              className="mt-2 bg-green-500 rounded-lg py-3 items-center"
            >
              <Text className="text-white font-medium">View Shopping Session</Text>
            </Pressable>
          </View>
        )}

        {/* Invitation banners */}
        {pendingInvitations.length > 0 && (
          <View className="px-3 mt-2 space-y-2">
            {pendingInvitations.map((invitation) => (
              <InvitationBanner
                key={invitation.id}
                listName={invitation.listName || 'Unknown List'}
                inviterEmail={invitation.invitedByEmail || invitation.invitedBy}
                onAccept={() => acceptInvitation(invitation.id)}
                onDecline={() => declineInvitation(invitation.id)}
              />
            ))}
          </View>
        )}

        {/* Create list input */}
        <View className="px-3 mt-4">
          {isCreatingList ? (
            <View className="flex flex-row gap-2">
              <TextInput
                placeholder="List name..."
                placeholderTextColor="#9ca3af"
                value={newListName}
                onChangeText={setNewListName}
                onSubmitEditing={handleCreateList}
                autoFocus
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-white dark:bg-gray-800"
              />
              <Pressable onPress={handleCreateList} className="bg-indigo-500 rounded-lg px-4 justify-center">
                <Feather name="check" size={20} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsCreatingList(false);
                  setNewListName('');
                }}
                className="bg-gray-300 dark:bg-gray-700 rounded-lg px-4 justify-center"
              >
                <Feather name="x" size={20} color="#ffffff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setIsCreatingList(true)}
              className="flex flex-row items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700"
            >
              <Feather name="plus" size={20} color="#6b7280" />
              <Text className="text-gray-500 dark:text-gray-400">Create new list</Text>
            </Pressable>
          )}
        </View>

        {/* Active lists */}
        <View className="px-3 mt-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Lists
          </Text>
          {activeLists.length === 0 ? (
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No lists yet. Create one to get started!
            </Text>
          ) : (
            <FlatList
              data={activeLists}
              renderItem={renderListCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerClassName="gap-2"
            />
          )}
        </View>

        {/* Archived lists */}
        {archivedLists.length > 0 && (
          <View className="px-3 mt-6 mb-4">
            <Pressable
              onPress={() => setShowArchived(!showArchived)}
              className="flex flex-row items-center gap-2 mb-2"
            >
              {showArchived ? (
                <Feather name="chevron-down" size={16} color="#6b7280" />
              ) : (
                <Feather name="chevron-right" size={16} color="#6b7280" />
              )}
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Archived ({archivedLists.length})
              </Text>
            </Pressable>
            {showArchived && (
              <FlatList
                data={archivedLists}
                renderItem={renderListCard}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerClassName="gap-2"
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Rename modal */}
      {renamingListId && (
        <View className="absolute inset-0 bg-black/40 justify-center items-center px-6">
          <View className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rename List
            </Text>
            <TextInput
              value={renameValue}
              onChangeText={setRenameValue}
              onSubmitEditing={handleRenameList}
              autoFocus
              className="border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 mb-4"
            />
            <View className="flex flex-row gap-2">
              <Pressable
                onPress={handleRenameList}
                className="flex-1 bg-indigo-500 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-medium">Save</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setRenamingListId(null);
                  setRenameValue('');
                }}
                className="flex-1 bg-gray-300 dark:bg-gray-700 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-medium">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Start session modal */}
      <StartSessionModal
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        lists={lists}
        recentStores={recentStores}
        onStart={handleStartSession}
        isStarting={isStarting}
      />

      {/* End shopping modal */}
      <EndShoppingModal
        open={endShoppingDialogOpen}
        onOpenChange={setEndShoppingDialogOpen}
        onComplete={handleCompleteShopping}
        onCancel={handleCancelShopping}
        isCompleting={isEnding}
        isCancelling={isCancelling}
      />
    </SafeAreaView>
  );
}
