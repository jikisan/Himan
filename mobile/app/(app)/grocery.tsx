import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext';
import {
  useGroceryLists,
  useGrocerySession,
  useGroceryInvitations,
  useGroceryScreenHandlers,
} from '@/modules/grocery/presentation/hooks';
import {
  StartSessionModal,
  EndShoppingModal,
  GroceryHeader,
  SessionSection,
  InvitationsSection,
  ListsSection,
  RenameModal,
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
  const { lists } = useGroceryLists();
  const {
    activeSession,
    recentStores,
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
  const handlers = useGroceryScreenHandlers({ userId, lists });

  const handleCreateListSuccess = () => {
    setNewListName('');
    setIsCreatingList(false);
  };

  const handleRenameListSuccess = () => {
    setRenamingListId(null);
    setRenameValue('');
  };

  const handleSelectList = (id: string) => {
    router.push(`/grocery/${id}`);
  };

  const handleRenameListClick = (id: string, name: string) => {
    setRenamingListId(id);
    setRenameValue(name);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <GroceryHeader
        onBack={() => router.back()}
        onStartShopping={() => setSessionDialogOpen(true)}
        showShoppingButton={!activeSession}
        shoppingButtonDisabled={activeLists.every((l) => l.itemCount === 0)}
      />

      {activeSession && (
          <SessionSection
              storeName={activeSession.storeName || 'Unknown Store'}
              progress={
                activeSession.items.length > 0
                    ? activeSession.items.filter((i) => i.isPurchased).length / activeSession.items.length
                    : 0
              }
              completedCount={activeSession.items.filter((i) => i.isPurchased).length}
              totalCount={activeSession.items.length}
              onEnd={() => setEndShoppingDialogOpen(true)}
              onCancel={handlers.handleCancelShopping}
              onViewSession={() => router.push('/grocery/session')}
          />
      )}

      <InvitationsSection
          invitations={pendingInvitations}
          onAccept={acceptInvitation}
          onDecline={declineInvitation}
      />

      <ScrollView className="flex-1">
        <ListsSection
          activeLists={activeLists}
          archivedLists={archivedLists}
          userId={userId}
          showArchived={showArchived}
          isCreating={isCreatingList}
          newListName={newListName}
          onToggleArchived={() => setShowArchived(!showArchived)}
          onSelectList={handleSelectList}
          onRenameList={handleRenameListClick}
          onArchiveList={handlers.handleArchiveList}
          onDeleteList={handlers.handleDeleteList}
          onLeaveList={handlers.handleLeaveList}
          onStartCreating={() => setIsCreatingList(true)}
          onCancelCreating={handleCreateListSuccess}
          onChangeListName={setNewListName}
          onSubmitList={() => handlers.handleCreateList(newListName, handleCreateListSuccess)}
        />
      </ScrollView>

      <RenameModal
        visible={!!renamingListId}
        value={renameValue}
        onChangeText={setRenameValue}
        onSubmit={() => handlers.handleRenameList(renamingListId!, renameValue, handleRenameListSuccess)}
        onCancel={handleRenameListSuccess}
      />

      <StartSessionModal
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        lists={lists}
        recentStores={recentStores}
        onStart={handlers.handleStartSession}
        isStarting={isStarting}
      />

      <EndShoppingModal
        open={endShoppingDialogOpen}
        onOpenChange={setEndShoppingDialogOpen}
        onComplete={handlers.handleCompleteShopping}
        onCancel={handlers.handleCancelShopping}
        isCompleting={isEnding}
        isCancelling={isCancelling}
      />
    </SafeAreaView>
  );
}
