import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Plus,
  ShoppingCart,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShoppingBasket,
  Check,
  Loader2,
  ArrowLeft,
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

// ─── Session item row ──────────────────────────────────────────────────────────
const SessionItemRow = ({
  item,
  onPurchase,
  onUnpurchase,
}: {
  item: SessionItemType;
  onPurchase: (sessionItemId: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  onUnpurchase: (sessionItemId: string, groceryItemId: string | null) => Promise<unknown>;
}) => {
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckboxClick = async () => {
    if (isLoading) return;
    if (item.isPurchased) {
      setIsLoading(true);
      try { await onUnpurchase(item.id, item.groceryItemId); }
      finally { setIsLoading(false); }
      return;
    }
    setShowPriceInput(true);
  };

  const handlePriceSubmit = async () => {
    const parsedPrice = price ? parseFloat(price) : null;
    setShowPriceInput(false);
    setPrice('');
    setIsLoading(true);
    try { await onPurchase(item.id, item.groceryItemId, parsedPrice); }
    finally { setIsLoading(false); }
  };

  const handlePriceSkip = async () => {
    setShowPriceInput(false);
    setPrice('');
    setIsLoading(true);
    try { await onPurchase(item.id, item.groceryItemId, null); }
    finally { setIsLoading(false); }
  };

  const quantityLabel =
    item.quantity > 1
      ? `${item.quantity}${item.unit ? ` ${item.unit}` : ''}`
      : item.unit ?? '';

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 rounded-xl group hover:bg-accent/50 active:bg-accent/60 transition-colors cursor-pointer',
        (item.isPurchased || isLoading) && 'opacity-60',
        isLoading && 'pointer-events-none'
      )}
      onClick={handleCheckboxClick}
    >
      <Popover open={showPriceInput} onOpenChange={setShowPriceInput}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              'flex-shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all',
              item.isPurchased
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-muted-foreground/30 hover:border-emerald-400'
            )}
          >
            {isLoading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : item.isPurchased && <Check className="h-3 w-3" />
            }
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
            onKeyDown={(e) => { if (e.key === 'Enter') handlePriceSubmit(); }}
            className="mb-2 h-9 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={handlePriceSubmit}>Done</Button>
            <Button size="sm" variant="ghost" className="flex-1 h-8 text-xs" onClick={handlePriceSkip}>Skip</Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            item.isPurchased && 'line-through text-muted-foreground'
          )}>
            {item.name}
          </span>
          {quantityLabel && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{quantityLabel}</span>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.notes}</p>
        )}
        {item.isPurchased && item.price != null && (
          <p className="text-xs text-muted-foreground mt-0.5">₱{item.price.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
};

// ─── Session category group ────────────────────────────────────────────────────
const SessionCategoryGroup = ({
  category,
  items,
  onPurchase,
  onUnpurchase,
  collapseStamp,
}: {
  category: string;
  items: SessionItemType[];
  onPurchase: (sessionItemId: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  onUnpurchase: (sessionItemId: string, groceryItemId: string | null) => Promise<unknown>;
  collapseStamp: { collapsed: boolean; n: number } | null;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const prevStampRef = useRef<number | null>(null);
  useEffect(() => {
    if (collapseStamp !== null && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      setIsCollapsed(collapseStamp.collapsed);
    }
  }, [collapseStamp]);

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-accent/30 active:bg-accent/40 rounded-xl transition-colors"
      >
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex-1">
          {category}
        </span>
        <span className="text-xs text-muted-foreground/60">{items.length}</span>
        {isCollapsed
          ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {!isCollapsed && (
        <div className="mt-0.5 space-y-0.5">
          {items.map((item) => (
            <SessionItemRow key={item.id} item={item} onPurchase={onPurchase} onUnpurchase={onUnpurchase} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Session list group ────────────────────────────────────────────────────────
const SessionListGroup = ({
  listName,
  groupedByCategory,
  onPurchase,
  onUnpurchase,
  collapseStamp,
  flat = false,
}: {
  listName: string;
  groupedByCategory: Map<string, SessionItemType[]>;
  onPurchase: (sessionItemId: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  onUnpurchase: (sessionItemId: string, groceryItemId: string | null) => Promise<unknown>;
  collapseStamp: { collapsed: boolean; n: number } | null;
  flat?: boolean;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prevStampRef = useRef<number | null>(null);
  useEffect(() => {
    if (collapseStamp !== null && collapseStamp.n !== prevStampRef.current) {
      prevStampRef.current = collapseStamp.n;
      setIsCollapsed(collapseStamp.collapsed);
    }
  }, [collapseStamp]);

  const allItems = Array.from(groupedByCategory.values()).flat();
  const totalCount = allItems.length;

  return (
    <div>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2.5 px-4 py-3 w-full text-left hover:bg-accent/30 active:bg-accent/40 rounded-xl transition-colors"
      >
        <span className="text-sm font-semibold flex-1">{listName}</span>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full tabular-nums">
          {totalCount}
        </span>
        {isCollapsed
          ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {!isCollapsed && (
        <div className="mt-1 pl-2">
          {flat ? (
            <div className="space-y-0.5">
              {allItems.map((item) => (
                <SessionItemRow key={item.id} item={item} onPurchase={onPurchase} onUnpurchase={onUnpurchase} />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {Array.from(groupedByCategory.entries()).map(([category, items]) => (
                <SessionCategoryGroup
                  key={category}
                  category={category}
                  items={items}
                  onPurchase={onPurchase}
                  onUnpurchase={onUnpurchase}
                  collapseStamp={collapseStamp}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Page ──────────────────────────────────────────────────────────────────────
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
  const [sessionCollapseStamp, setSessionCollapseStamp] = useState<{ collapsed: boolean; n: number } | null>(null);
  const [sessionNewItem, setSessionNewItem] = useState('');
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
    startSession, endSession, cancelSession,
    purchaseItem, unpurchaseItem,
    addShopper, removeShopper, addSessionItem,
    isAddingSessionItem, isStarting, isEnding, isCancelling, isAddingShopper,
  } = useGrocerySession();
  const {
    pendingInvitations, listInvitations, members,
    invite, acceptInvitation, declineInvitation, cancelInvitation, removeMember,
  } = useGroceryInvitations(selectedListId ?? undefined);

  useGroceryRealtime(selectedListId, activeSession?.id);

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

  const handleEndShopping = useCallback(() => setEndShoppingDialogOpen(true), []);

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
          {/* Header */}
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

          {/* Invitations */}
          <InvitationBanner
            invitations={pendingInvitations}
            onAccept={acceptInvitation}
            onDecline={declineInvitation}
          />

          {/* Active session indicator */}
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

          {/* List of lists */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {/* Inline create */}
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

              {/* Archived section */}
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
              <div className="px-4 pt-3 pb-3 border-b border-border space-y-3">
                {/* Mobile back */}
                <button
                  onClick={() => setMobileView('lists')}
                  className="md:hidden flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground active:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Lists</span>
                </button>

                <SessionBanner
                  session={activeSession}
                  onEndShopping={handleEndShopping}
                  onManageShoppers={() => setShoppersDialogOpen(true)}
                />
              </div>

              {/* Tab switcher + content */}
              <SessionTabsContent
                activeSession={activeSession}
                sessionItemsByListAndCategory={sessionItemsByListAndCategory}
                purchasedSessionItems={purchasedSessionItems}
                sessionCollapseStamp={sessionCollapseStamp}
                sessionNewItem={sessionNewItem}
                setSessionNewItem={setSessionNewItem}
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
                    {/* Mobile back */}
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

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Suggestions */}
                  {suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Suggestions</p>
                      <SuggestionChips suggestions={suggestions} listId={selectedListId!} onAddItem={addItem} />
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
                  <div className="space-y-2">
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
                    <div className="pt-1">
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                          Checked ({checkedItems.length})
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground"
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
                      <ShoppingBasket className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">No items yet</p>
                      <p className="text-xs mt-1 opacity-70">Add items using the input above</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            /* ── No list selected (desktop only; mobile always shows sidebar) ── */
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

// ─── Session tabs content (extracted to keep flex layout working) ──────────────
const SessionTabsContent = ({
  activeSession,
  sessionItemsByListAndCategory,
  purchasedSessionItems,
  sessionCollapseStamp,
  sessionNewItem,
  setSessionNewItem,
  addSessionItem,
  isAddingSessionItem,
  purchaseItem,
  unpurchaseItem,
  triggerSessionCollapse,
}: {
  activeSession: NonNullable<ReturnType<typeof useGrocerySession>['activeSession']>;
  sessionItemsByListAndCategory: Map<string, Map<string, SessionItemType[]>>;
  purchasedSessionItems: SessionItemType[];
  sessionCollapseStamp: { collapsed: boolean; n: number } | null;
  sessionNewItem: string;
  setSessionNewItem: (v: string) => void;
  addSessionItem: (name: string) => Promise<unknown>;
  isAddingSessionItem: boolean;
  purchaseItem: (id: string, groceryItemId: string | null, price?: number | null) => Promise<unknown>;
  unpurchaseItem: (id: string, groceryItemId: string | null) => Promise<unknown>;
  triggerSessionCollapse: (collapsed: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'to-get' | 'purchased'>('to-get');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tab switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('to-get')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
            activeTab === 'to-get'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          To Get
          {activeSession.items.filter((i) => !i.isPurchased).length > 0 && (
            <span className="text-xs bg-primary/10 text-primary rounded-full px-1.5 tabular-nums">
              {activeSession.items.filter((i) => !i.isPurchased).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('purchased')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors border-b-2',
            activeTab === 'purchased'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Purchased
          {purchasedSessionItems.length > 0 && (
            <span className="text-xs bg-muted-foreground/10 text-muted-foreground rounded-full px-1.5 tabular-nums">
              {purchasedSessionItems.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'to-get' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Add item */}
          <div className="px-4 py-2.5 border-b border-border">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = sessionNewItem.trim();
                if (!trimmed) return;
                await addSessionItem(trimmed);
                setSessionNewItem('');
              }}
              className="flex gap-2"
            >
              <Input
                placeholder="Add an item..."
                value={sessionNewItem}
                onChange={(e) => setSessionNewItem(e.target.value)}
                className="h-9 text-sm"
                disabled={isAddingSessionItem}
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="h-9 px-3 flex-shrink-0"
                disabled={!sessionNewItem.trim() || isAddingSessionItem}
              >
                {isAddingSessionItem
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Plus className="h-4 w-4" />}
              </Button>
            </form>
          </div>

          {/* Collapse controls */}
          {sessionItemsByListAndCategory.size > 0 && (
            <div className="flex items-center justify-end gap-4 px-4 py-1.5 border-b border-border">
              <button onClick={() => triggerSessionCollapse(false)} className="text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors">
                Expand all
              </button>
              <button onClick={() => triggerSessionCollapse(true)} className="text-xs text-muted-foreground hover:text-foreground active:text-foreground transition-colors">
                Collapse all
              </button>
            </div>
          )}

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {Array.from(sessionItemsByListAndCategory.entries()).map(([listName, groupedByCategory]) => (
                <SessionListGroup
                  key={listName}
                  listName={listName}
                  groupedByCategory={groupedByCategory}
                  onPurchase={purchaseItem}
                  onUnpurchase={unpurchaseItem}
                  collapseStamp={sessionCollapseStamp}
                  flat={listName === 'Added Items'}
                />
              ))}
              {activeSession.items.every((i) => i.isPurchased) && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Check className="h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">All items purchased!</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-0.5">
            {purchasedSessionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">Nothing purchased yet</p>
              </div>
            ) : (
              purchasedSessionItems.map((item) => (
                <SessionItemRow
                  key={item.id}
                  item={item}
                  onPurchase={purchaseItem}
                  onUnpurchase={unpurchaseItem}
                />
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
