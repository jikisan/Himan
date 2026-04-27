import { useState, useCallback } from 'react';
import {
  Plus,
  ShoppingCart,
  UserPlus,
  Trash2,
  ChevronDown,
  ShoppingBasket,
  Check,
} from 'lucide-react';
import { useAuth } from '@auth/presentation/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui';
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
  AddItemInput,
  CategoryGroup,
  GroceryItemRow,
  SessionBanner,
  SuggestionChips,
  ShareListDialog,
  ItemDetailSheet,
  StartSessionDialog,
  InvitationBanner,
  EndShoppingDialog,
  AddShopperDialog,
} from '../components';
import type { GroceryItemType, SessionItemType } from '../../domain';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@core/presentation/utils';

// Session item row for the shopping view
const SessionItemRow = ({
  item,
  onPurchase,
  onUnpurchase,
}: {
  item: SessionItemType;
  onPurchase: (sessionItemId: string, groceryItemId: string | null, price?: number | null) => void;
  onUnpurchase: (sessionItemId: string, groceryItemId: string | null) => void;
}) => {
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState('');

  const handleCheckboxClick = () => {
    if (item.isPurchased) {
      onUnpurchase(item.id, item.groceryItemId);
      return;
    }
    setShowPriceInput(true);
  };

  const handlePriceSubmit = () => {
    const parsedPrice = price ? parseFloat(price) : null;
    onPurchase(item.id, item.groceryItemId, parsedPrice);
    setShowPriceInput(false);
    setPrice('');
  };

  const handlePriceSkip = () => {
    onPurchase(item.id, item.groceryItemId, null);
    setShowPriceInput(false);
    setPrice('');
  };

  const quantityLabel =
    item.quantity > 1
      ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
      : item.unit ?? '';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg group hover:bg-accent/50 transition-colors cursor-pointer',
        item.isPurchased && 'opacity-60'
      )}
      onClick={handleCheckboxClick}
    >
      <Popover open={showPriceInput} onOpenChange={setShowPriceInput}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
              item.isPurchased
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground/40 hover:border-primary'
            )}
          >
            {item.isPurchased && <Check className="h-3 w-3" />}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="start">
          <p className="text-xs text-muted-foreground mb-2">
            {item.name} {quantityLabel && `× ${quantityLabel}`}
          </p>
          <Input
            type="number"
            placeholder="Price (optional)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePriceSubmit();
            }}
            className="mb-2 h-8 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={handlePriceSubmit}>
              Done
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 h-7 text-xs"
              onClick={handlePriceSkip}
            >
              Skip
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium truncate',
              item.isPurchased && 'line-through text-muted-foreground'
            )}
          >
            {item.name}
          </span>
          {quantityLabel && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {quantityLabel}
            </span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {item.notes}
          </p>
        )}
        {item.isPurchased && item.price != null && (
          <p className="text-xs text-muted-foreground mt-0.5">
            ₱{item.price.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
};

export const GroceryPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  // List state
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

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
  const { activeSession, participants, recentStores, startSession, endSession, cancelSession, purchaseItem, unpurchaseItem, addShopper, removeShopper, isStarting, isEnding, isCancelling, isAddingShopper } =
    useGrocerySession();
  const {
    pendingInvitations,
    listInvitations,
    members,
    invite,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
    removeMember,
  } = useGroceryInvitations(selectedListId ?? undefined);

  // Realtime subscriptions
  useGroceryRealtime(selectedListId, activeSession?.id);

  const selectedList = lists.find((l) => l.id === selectedListId) ?? null;
  const activeLists = lists.filter((l) => !l.isArchived);
  const archivedLists = lists.filter((l) => l.isArchived);

  // Group session items by list name
  const sessionItemsByList = activeSession
    ? activeSession.items.reduce<Map<string, SessionItemType[]>>((acc, item) => {
        const group = acc.get(item.listName) || [];
        group.push(item);
        acc.set(item.listName, group);
        return acc;
      }, new Map())
    : new Map();

  const purchasedSessionItems = activeSession
    ? activeSession.items.filter((i) => i.isPurchased)
    : [];

  // Handlers
  const handleCreateList = useCallback(async () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const created = await createList({ name: trimmed });
    if (created) {
      setSelectedListId(created.id);
      setNewListName('');
      setIsCreatingList(false);
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
  }, [selectedListId, deleteList]);

  const handleDeleteItem = useCallback(async () => {
    if (!deleteItemId) return;
    await deleteItem(deleteItemId);
    setDeleteItemId(null);
  }, [deleteItemId, deleteItem]);

  const handleStartSession = useCallback(
    (listIds: string[], storeName: string) => {
      startSession(listIds, storeName);
    },
    [startSession]
  );

  const handleEndShopping = useCallback(() => {
    setEndShoppingDialogOpen(true);
  }, []);

  const handleCompleteShopping = useCallback(async () => {
    await endSession();
  }, [endSession]);

  const handleCancelShopping = useCallback(async () => {
    await cancelSession();
  }, [cancelSession]);

  return (
    <>
      <div className="flex h-full bg-background">
        {/* Left sidebar: lists */}
        <div className="w-72 border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">Grocery</h1>
              <div className="flex items-center gap-1">
                {!activeSession && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
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
                  className="h-8 w-8"
                  onClick={() => setIsCreatingList(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Invitations */}
          <InvitationBanner
            invitations={pendingInvitations}
            onAccept={acceptInvitation}
            onDecline={declineInvitation}
          />

          {/* Active session indicator in sidebar */}
          {activeSession && (
            <button
              onClick={() => setSelectedListId(null)}
              className={cn(
                'mx-2 mt-2 p-2.5 rounded-lg border text-left transition-colors',
                selectedListId === null
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'border-green-500/20 hover:bg-green-500/5'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium">Shopping Session</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                {activeSession.storeName && `${activeSession.storeName} · `}
                {activeSession.items.filter((i) => i.isPurchased).length}/{activeSession.items.length} items
              </p>
            </button>
          )}

          {/* List of lists */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {/* Inline create */}
              {isCreatingList && (
                <div className="p-2">
                  <Input
                    placeholder="List name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateList();
                      if (e.key === 'Escape') {
                        setIsCreatingList(false);
                        setNewListName('');
                      }
                    }}
                    onBlur={() => {
                      if (!newListName.trim()) {
                        setIsCreatingList(false);
                      }
                    }}
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
                      autoFocus
                    />
                  </div>
                ) : (
                  <GroceryListCard
                    key={list.id}
                    list={list}
                    isSelected={selectedListId === list.id}
                    isOwner={list.ownerId === userId}
                    onSelect={() => setSelectedListId(list.id)}
                    onRename={() => {
                      setRenamingListId(list.id);
                      setRenameValue(list.name);
                    }}
                    onArchive={() =>
                      updateList(list.id, { isArchived: !list.isArchived })
                    }
                    onDelete={() => {
                      setSelectedListId(list.id);
                      setDeleteListDialogOpen(true);
                    }}
                    onLeave={() => removeMember(userId)}
                  />
                )
              )}

              {/* Archived section */}
              {archivedLists.length > 0 && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        !showArchived ? '-rotate-90' : ''
                      }`}
                    />
                    Archived ({archivedLists.length})
                  </button>
                  {showArchived &&
                    archivedLists.map((list) => (
                      <GroceryListCard
                        key={list.id}
                        list={list}
                        isSelected={selectedListId === list.id}
                        isOwner={list.ownerId === userId}
                        onSelect={() => setSelectedListId(list.id)}
                        onRename={() => {
                          setRenamingListId(list.id);
                          setRenameValue(list.name);
                        }}
                        onArchive={() =>
                          updateList(list.id, { isArchived: false })
                        }
                        onDelete={() => {
                          setSelectedListId(list.id);
                          setDeleteListDialogOpen(true);
                        }}
                        onLeave={() => removeMember(userId)}
                      />
                    ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col">
          {activeSession && selectedListId === null ? (
            /* Shopping session view */
            <>
              <div className="p-4 border-b border-border">
                <SessionBanner
                  session={activeSession}
                  onEndShopping={handleEndShopping}
                  onManageShoppers={() => setShoppersDialogOpen(true)}
                />
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Unpurchased items grouped by list */}
                  {Array.from(sessionItemsByList.entries()).map(([listName, sessionItems]: [string, SessionItemType[]]) => {
                    const unpurchased = sessionItems.filter((i: SessionItemType) => !i.isPurchased);
                    if (unpurchased.length === 0) return null;

                    return (
                      <div key={listName}>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">
                          {listName}
                        </h3>
                        <div className="space-y-0.5">
                          {unpurchased.map((item: SessionItemType) => (
                            <SessionItemRow
                              key={item.id}
                              item={item}
                              onPurchase={purchaseItem}
                              onUnpurchase={unpurchaseItem}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Purchased items */}
                  {purchasedSessionItems.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center px-3 py-1.5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Purchased ({purchasedSessionItems.length})
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {purchasedSessionItems.map((item) => (
                          <SessionItemRow
                            key={item.id}
                            item={item}
                            onPurchase={purchaseItem}
                            onUnpurchase={unpurchaseItem}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : selectedList ? (
            /* List detail view */
            <>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedList.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedList.memberCount > 1
                        ? `${selectedList.memberCount} members`
                        : ''}
                      {selectedList.memberCount > 1 && selectedList.itemCount > 0 ? ' · ' : ''}
                      {selectedList.itemCount > 0 ? `${selectedList.itemCount} items` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShareDialogOpen(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Share
                    </Button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Suggestions
                      </p>
                      <SuggestionChips
                        suggestions={suggestions}
                        listId={selectedListId!}
                        onAddItem={addItem}
                      />
                    </div>
                  )}

                  {/* Add item input */}
                  <AddItemInput
                    listId={selectedListId!}
                    products={products}
                    onAddItem={addItem}
                    autoFocus={items.length === 0}
                  />

                  {/* Item groups */}
                  <div className="space-y-3">
                    {Array.from(groupedItems.entries()).map(([category, categoryItems]) => (
                      <CategoryGroup
                        key={category}
                        category={category}
                        items={categoryItems}
                        isSessionActive={!!activeSession}
                        onCheck={checkItem}
                        onUncheck={uncheckItem}
                        onEditItem={setEditingItem}
                        onDeleteItem={(id) => setDeleteItemId(id)}
                      />
                    ))}
                  </div>

                  {/* Checked items */}
                  {checkedItems.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between px-3 py-1.5">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Checked ({checkedItems.length})
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={() => clearChecked()}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-0.5">
                        {checkedItems.map((item) => (
                          <GroceryItemRow
                            key={item.id}
                            item={item}
                            isSessionActive={!!activeSession}
                            onCheck={checkItem}
                            onUncheck={uncheckItem}
                            onEdit={setEditingItem}
                            onDelete={(id) => setDeleteItemId(id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {items.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <ShoppingBasket className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm">No items yet</p>
                      <p className="text-xs mt-1">
                        Add items using the input above
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            /* No list selected */
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Select a list or create a new one</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
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
        onOpenChange={(open) => {
          if (!open) setEditingItem(null);
        }}
        item={editingItem}
        onSave={updateItem}
        onDelete={(id) => {
          setEditingItem(null);
          setDeleteItemId(id);
        }}
      />

      <ConfirmDialog
        open={deleteListDialogOpen}
        onOpenChange={setDeleteListDialogOpen}
        title="Delete List"
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
        onOpenChange={(open) => {
          if (!open) setDeleteItemId(null);
        }}
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
