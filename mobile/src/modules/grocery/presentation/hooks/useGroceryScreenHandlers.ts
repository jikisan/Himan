import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useGroceryLists } from './useGroceryLists';
import { useGrocerySession } from './useGrocerySession';

interface UseGroceryScreenHandlersProps {
  userId: string;
  lists: any[];
}

export function useGroceryScreenHandlers({
  userId,
  lists,
}: UseGroceryScreenHandlersProps) {
  const router = useRouter();
  const { createList, updateList, deleteList } = useGroceryLists();
  const {
    startSession,
    endSession,
    cancelSession,
  } = useGrocerySession();

  const handleCreateList = useCallback(async (name: string, onSuccess: () => void) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createList({ name: trimmed });
    if (created) {
      router.push(`/grocery/${created.id}`);
      onSuccess();
    }
  }, [createList, router]);

  const handleRenameList = useCallback(async (listId: string, name: string, onSuccess: () => void) => {
    if (!listId || !name.trim()) return;
    await updateList(listId, { name: name.trim() });
    onSuccess();
  }, [updateList]);

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

  return {
    handleCreateList,
    handleRenameList,
    handleDeleteList,
    handleArchiveList,
    handleLeaveList,
    handleStartSession,
    handleCompleteShopping,
    handleCancelShopping,
  };
}
