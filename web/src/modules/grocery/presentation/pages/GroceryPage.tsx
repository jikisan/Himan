import { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  ShoppingCart,
  UserPlus,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@auth/presentation/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui';
import { cn } from '@core/presentation/utils';
import {
  useGroceryLists,
  useGroceryItems,
  useGroceryRealtime,
  useGrocerySession,
  useProductCatalog,
  useSuggestions,
  useGroceryInvitations,
} from '../hooks';
import {
  GroceryListCard,
  SessionBanner,
  ShareListDialog,
  ItemDetailSheet,
  StartSessionDialog,
  InvitationBanner,
  EndShoppingDialog,
  AddShopperDialog,
  SessionTabsContent,
  ListTabsContent,
} from '../components';
import type { GroceryItemType, SessionItemType } from '../../domain';
import type { CollapseStamp } from '../components';

export const GroceryPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // Mobile navigation: 'lists' shows sidebar full-screen; 'detail' shows right panel
  const [mobileView, setMobileView] = useState<'lists' | 'detail'>('lists');

  // List state
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Session collapse-all/expand-all
  const [sessionCollapseStamp, setSessionCollapseStamp] = useState<CollapseStamp | null>(null);
  const triggerSessionCollapse = (collapsed: boolean) =>
    setSessionCollapseStamp((prev) => ({ collapsed, n: (prev?.n ?? 0) + 1 }));

  // Dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroceryItemType | null>(null);
  const [deleteListDialogOpen, setDeleteListDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [endShoppingDialogOpen, setEndShoppingDialogOpen] = useState(false);
  const [shoppersDialogOpen, setShoppersDialogOpen] = useState(false);
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Data hooks
  const { lists, createList, updateList, deleteList } = useGroceryLists();
  const { items, groupedItems, checkedItems, addItem, updateItem, checkItem, uncheckItem, deleteItem, clearChecked } =
    useGroceryItems(selectedListId);
  const { products } = useProductCatalog();
  const { suggestions } = useSuggestions(selectedListId, items);
  const {
    activeSession, participants, recentStores,
    realtimeService,
    startSession, endSession, cancelSession,
    purchaseItem, unpurchaseItem,
    addShopper, removeShopper, addSessionItem,
    isAddingSessionItem, isStarting, isEnding, isCancelling, isAddingShopper,
  } = useGrocerySession();
  const {
    pendingInvitations, listInvitations, members,
    invite, acceptInvitation, declineInvitation, cancelInvitation, removeMember,
  } = useGroceryInvitations(selectedListId ?? undefined);

  useGroceryRealtime(selectedListId, activeSession?.id, realtimeService);

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null;
  const activeLists = lists.filter((l) => !l.isArchived);
  const archivedLists = lists.filter((l) => l.isArchived);

  // Group unpurchased session items by list name → category
  const sessionItemsByListAndCategory = useMemo<Map<string, Map<string, SessionItemType[]>>>(() => {
    if (!activeSession) return new Map();
    return activeSession.items.reduce<Map<string, Map<string, SessionItemType[]>>>((acc, item) => {
      if (item.isPurchased) return acc;
      const listMap = acc.get(item.listName) ?? new Map<string, SessionItemType[]>();
      const catKey = item.category ?? 'Other';
      const catItems = listMap.get(catKey) ?? [];
      catItems.push(item);
      listMap.set(catKey, catItems);
      acc.set(item.listName, listMap);
      return acc;
    }, new Map());
  }, [activeSession]);

  const purchasedSessionItems = activeSession
    ? activeSession.items.filter((i) => i.isPurchased)
    : [];

  // ─── Navigation helpers ──────────────────────────────────────────────────────
  const handleSelectList = useCallback((listId: string) => {
    setSelectedListId(listId);
    setMobileView('detail');
  }, []);

  const handleViewSession = useCallback(() => {
    setSelectedListId(null);
    setMobileView('detail');
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleCreateList = useCallback(async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const created = await createList({ name: trimmed });
    if (created) {
      setSelectedListId(created.id);
      setNewListName('');
      setIsCreatingList(false);
      setMobileView('detail');
    }
  }, [newListName, createList]);

  const handleRenameList = useCallback(async () => {
    if (!renamingListId || !renameValue.trim()) return;
    await updateList(renamingListId, { name: renameValue.trim() });
    setRenamingListId(null);
    setRenameValue('');
  }, [renamingListId, renameValue, updateList]);

  const handleDeleteList = useCallback(async () => {
    if (!selectedListId) return;
    await deleteList(selectedListId);
    setSelectedListId(null);
    setMobileView('lists');
  }, [selectedListId, deleteList]);

  const handleDeleteItem = useCallback(async () => {
    if (!deleteItemId) return;
    await deleteItem(deleteItemId);
    setDeleteItemId(null);
  }, [deleteItemId, deleteItem]);

  const handleStartSession = useCallback(
    (listIds: string[], storeName: string) => {
      startSession(listIds, storeName);
      setSelectedListId(null);
      setMobileView('detail');
    },
    [startSession]
  );

  const handleCompleteShopping = useCallback(async () => {
    await endSession();
    setMobileView('lists');
  }, [endSession]);

  const handleCancelShopping = useCallback(async () => {
    await cancelSession();
    setMobileView('lists');
  }, [cancelSession]);

  return (
    <>
      <div className="flex h-full bg-background overflow-hidden">

        {/* ── Sidebar ── */}
        <div className={cn(
          'flex-shrink-0 flex flex-col border-r border-border bg-background',
          'w-full md:w-72',
          mobileView === 'detail' ? 'hidden md:flex' : 'flex'
        )}>
          <div className="px-4 py-3.5 border-b border-border">
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold">Grocery</h1>
              <div className="flex items-center gap-1">
                {!activeSession && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9"
                    onClick={() => setSessionDialogOpen(true)}
                    disabled={activeLists.every((l) => l.itemCount === 0)}
                    title="Start shopping session"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9"
                  onClick={() => setIsCreatingList(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <InvitationBanner
            invitations={pendingInvitations}
            onAccept={acceptInvitation}
            onDecline={declineInvitation}
          />

          {activeSession && (
            <button
              onClick={handleViewSession}
              className={cn(
                'mx-3 mt-3 p-3 rounded-xl border text-left transition-colors',
                selectedListId === null && mobileView === 'detail'
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'border-emerald-500/20 hover:bg-emerald-500/8 active:bg-emerald-500/12'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-sm font-medium">Shopping Session</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                {activeSession.storeName && `${activeSession.storeName} · `}
                {activeSession.items.filter((i) => i.isPurchased).length}/{activeSession.items.length} items
              </p>
            </button>
          )}

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {isCreatingList && (
                <div className="p-2">
                  <Input
                    placeholder="List name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateList();
                      if (e.key === 'Escape') { setIsCreatingList(false); setNewListName(''); }
                    }}
                    onBlur={() => { if (!newListName.trim()) setIsCreatingList(false); }}
                    className="h-10"
                    autoFocus
                  />
                </div>
              )}

              {activeLists.map((list) =>
                renamingListId === list.id ? (
                  <div key={list.id} className="p-2">
                    <Input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameList();
                        if (e.key === 'Escape') setRenamingListId(null);
                      }}
                      onBlur={handleRenameList}
                      className="h-10"
                      autoFocus
                    />
                  </div>
                ) : (
                  <GroceryListCard
                    key={list.id}
                    list={list}
                    isSelected={selectedListId === list.id}
                    isOwner={list.ownerId === userId}
                    onSelect={() => handleSelectList(list.id)}
                    onRename={() => { setRenamingListId(list.id); setRenameValue(list.name); }}
                    onArchive={() => updateList(list.id, { isArchived: !list.isArchived })}
                    onDelete={() => { setSelectedListId(list.id); setDeleteListDialogOpen(true); }}
                    onLeave={() => removeMember(userId)}
                  />
                )
              )}

              {archivedLists.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors w-full rounded-lg"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${!showArchived ? '-rotate-90' : ''}`} />
                    Archived ({archivedLists.length})
                  </button>
                  {showArchived && archivedLists.map((list) => (
                    <GroceryListCard
                      key={list.id}
                      list={list}
                      isSelected={selectedListId === list.id}
                      isOwner={list.ownerId === userId}
                      onSelect={() => handleSelectList(list.id)}
                      onRename={() => { setRenamingListId(list.id); setRenameValue(list.name); }}
                      onArchive={() => updateList(list.id, { isArchived: false })}
                      onDelete={() => { setSelectedListId(list.id); setDeleteListDialogOpen(true); }}
                      onLeave={() => removeMember(userId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right panel ── */}
        <div className={cn(
          'flex-1 flex flex-col min-w-0',
          mobileView === 'lists' ? 'hidden md:flex' : 'flex'
        )}>
          {activeSession && selectedListId === null ? (
            /* ── Shopping session view ── */
            <>
              <div className="flex flex-row space-x-4 px-4 pt-3 pb-3 border-b border-border space-y-3">
                <button
                  onClick={() => setMobileView('lists')}
                  className="md:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <SessionBanner
                  session={activeSession}
                  onEndShopping={() => setEndShoppingDialogOpen(true)}
                  onManageShoppers={() => setShoppersDialogOpen(true)}
                />
              </div>
              <SessionTabsContent
                activeSession={activeSession}
                sessionItemsByListAndCategory={sessionItemsByListAndCategory}
                purchasedSessionItems={purchasedSessionItems}
                sessionCollapseStamp={sessionCollapseStamp}
                addSessionItem={addSessionItem}
                isAddingSessionItem={isAddingSessionItem}
                purchaseItem={purchaseItem}
                unpurchaseItem={unpurchaseItem}
                triggerSessionCollapse={triggerSessionCollapse}
              />
            </>
          ) : selectedList ? (
            /* ── List detail view ── */
            <>
              <div className="px-4 py-3.5 border-b border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => setMobileView('lists')}
                      className="md:hidden flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent active:bg-accent/70 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold truncate">{selectedList.name}</h2>
                      {(selectedList.memberCount > 1 || selectedList.itemCount > 0) && (
                        <p className="text-xs text-muted-foreground">
                          {selectedList.memberCount > 1 ? `${selectedList.memberCount} members` : ''}
                          {selectedList.memberCount > 1 && selectedList.itemCount > 0 ? ' · ' : ''}
                          {selectedList.itemCount > 0 ? `${selectedList.itemCount} items` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Share
                  </Button>
                </div>
              </div>

              <ListTabsContent
                listId={selectedListId!}
                groupedItems={groupedItems}
                checkedItems={checkedItems}
                suggestions={suggestions}
                products={products}
                isSessionActive={!!activeSession}
                onAddItem={addItem}
                onCheck={checkItem}
                onUncheck={uncheckItem}
                onEditItem={setEditingItem}
                onDeleteItem={(id) => setDeleteItemId(id)}
                onClearChecked={clearChecked}
              />
            </>
          ) : (
            /* ── Empty state ── */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-sm">Select a list or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <ShareListDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        listName={selectedList?.name ?? ''}
        members={members}
        invitations={listInvitations}
        currentUserId={userId}
        onInvite={invite}
        onCancelInvitation={cancelInvitation}
        onRemoveMember={removeMember}
      />

      <StartSessionDialog
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        lists={activeLists}
        recentStores={recentStores}
        onStart={handleStartSession}
        isStarting={isStarting}
      />

      <ItemDetailSheet
        open={!!editingItem}
        onOpenChange={(open) => { if (!open) setEditingItem(null); }}
        item={editingItem}
        onSave={updateItem}
        onDelete={(id) => { setEditingItem(null); setDeleteItemId(id); }}
      />

      <ConfirmDialog
        open={deleteListDialogOpen}
        onOpenChange={setDeleteListDialogOpen}
        title={`Delete "${selectedList?.name ?? 'List'}"`}
        description={
          selectedList && selectedList.memberCount > 1
            ? 'This list is shared with other members. Deleting it will remove it for everyone. This action cannot be undone.'
            : 'Are you sure you want to delete this list? This action cannot be undone.'
        }
        confirmText="Delete"
        onConfirm={handleDeleteList}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!deleteItemId}
        onOpenChange={(open) => { if (!open) setDeleteItemId(null); }}
        title="Delete Item"
        description="Are you sure you want to remove this item from the list?"
        confirmText="Delete"
        onConfirm={handleDeleteItem}
        variant="destructive"
      />

      {activeSession && (
        <AddShopperDialog
          open={shoppersDialogOpen}
          onOpenChange={setShoppersDialogOpen}
          members={activeSession.members}
          participants={participants}
          currentUserId={userId}
          startedBy={activeSession.startedBy}
          onAddShopper={addShopper}
          onRemoveShopper={removeShopper}
          isAdding={isAddingShopper}
        />
      )}

      <EndShoppingDialog
        open={endShoppingDialogOpen}
        onOpenChange={setEndShoppingDialogOpen}
        onComplete={handleCompleteShopping}
        onCancel={handleCancelShopping}
        isCompleting={isEnding}
        isCancelling={isCancelling}
      />
    </>
  );
};
