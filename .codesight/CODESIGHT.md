# Himan — AI Context Map

> **Stack:** swiftui | none | react | typescript
> **Monorepo:** @himan/shared, @himan/web, @himan/mobile, ios, Himan.xcodeproj

> 0 routes | 21 models | 91 components | 103 lib files | 4 env vars | 2 middleware | 5% test coverage
> **Token savings:** this file is ~10,200 tokens. Without it, AI exploration would cost ~74,700 tokens. **Saves ~64,400 tokens per conversation.**
> **Last scanned:** 2026-04-29 04:26 — re-run after significant changes

---

# Schema

### folders
- id: uuid (pk)
- name: text (required)
- color: text
- icon: text
- user_id: uuid (required, fk)

### notes
- id: uuid (pk)
- title: text (required)
- content: text (required)
- excerpt: text (required)
- folder_id: uuid (fk)
- user_id: uuid (required, fk)
- is_pinned: boolean (required)

### password_categories
- id: uuid (pk)
- name: text (required)
- icon: text
- user_id: uuid (required, fk)

### passwords
- id: uuid (pk)
- title: text (required)
- username: text
- encrypted_password: text (required)
- url: text
- notes: text
- category_id: uuid (fk)
- user_id: uuid (required, fk)
- is_favorite: boolean (default)

### user_subscriptions
- id: uuid (pk)
- user_id: uuid (required, fk)
- tier: subscription_tier (required)
- valid_until: timestamp with time zone

### usage_limits
- id: uuid (pk)
- user_id: uuid (required, fk)
- notes_count: integer (required)
- folders_count: integer (required)
- passwords_count: integer (required)
- categories_count: integer (required)

### storage_folders
- id: uuid (pk)
- user_id: uuid (required, fk)
- name: text (required)
- files_count: integer (required)

### files
- id: uuid (pk)
- user_id: uuid (required, fk)
- folder_id: uuid (fk)
- name: text (required)
- size: bigint (required)
- mime_type: text (required)
- description: text
- thumbnail_url: text
- storage_path: text (required)

### card_categories
- id: uuid (pk)
- name: text (required)
- icon: text
- user_id: uuid (required, fk)

### credit_cards
- id: uuid (pk)
- card_name: text (required)
- encrypted_card_number: text (required)
- encrypted_cvv: text (required)
- expiry_month: integer (required)
- expiry_year: integer (required)
- bank_name: text
- card_issuer: text
- card_type: text
- category_id: uuid (fk)
- user_id: uuid (required, fk)
- is_favorite: boolean (default)
- notes: text

### invoice_folders
- id: uuid (pk)
- user_id: uuid (required, fk)
- name: text (required)
- invoice_number_prefix: text
- invoice_number_format: text (required)
- next_sequence_number: integer (required)
- invoices_count: integer (required)

### invoices
- id: uuid (pk)
- user_id: uuid (required, fk)
- folder_id: uuid (fk)
- invoice_number: text (required)
- po_number: text
- company_details: text
- bill_to: text
- invoice_date: date
- due_date: date
- currency: text (required)
- line_items: jsonb (required)
- tax_rate: numeric
- discount: numeric
- shipping_fee: numeric
- subtotal: numeric
- tax_amount: numeric
- total: numeric
- notes: text
- bank_details: text
- storage_path: text
- file_size: bigint
- is_favorite: boolean (required)

### invoice_saved_options
- id: uuid (pk)
- user_id: uuid (required, fk)
- option_type: text (required)
- label: text (required)
- value: text (required)
- is_default: boolean (required)
- sort_order: integer (required)

### product_catalog
- id: uuid (pk)
- user_id: uuid (required, fk)
- name: text (required)
- category: text
- default_quantity: numeric (default)
- default_unit: text
- lifespan_days: integer
- last_purchased_at: timestamp with time zone
- purchase_count: integer (default)

### grocery_lists
- id: uuid (pk)
- name: text (required)
- owner_id: uuid (required, fk)
- is_archived: boolean (default)

### grocery_list_members
- id: uuid (pk)
- list_id: uuid (required, fk)
- user_id: uuid (required, fk)
- role: text (required)
- invited_by: uuid (fk)
- joined_at: timestamp with time zone (default)

### grocery_items
- id: uuid (pk)
- list_id: uuid (required, fk)
- product_id: uuid (fk)
- name: text (required)
- category: text
- quantity: numeric (default)
- unit: text
- notes: text
- is_checked: boolean (default)
- price: numeric
- added_by: uuid (required)
- sort_order: integer (default)

### grocery_sessions
- id: uuid (pk)
- started_by: uuid (required)
- store_name: text
- status: text (required)
- started_at: timestamp with time zone (default)
- completed_at: timestamp with time zone

### grocery_session_items
- id: uuid (pk)
- session_id: uuid (required, fk)
- grocery_item_id: uuid (fk)
- list_name: text (required)
- name: text (required)
- category: text
- quantity: numeric (default)
- unit: text
- notes: text
- is_purchased: boolean (default)
- purchased_at: timestamp with time zone
- price: numeric

### grocery_session_members
- id: uuid (pk)
- session_id: uuid (required, fk)
- user_id: uuid (required, fk)
- added_by: uuid (required)
- joined_at: timestamp with time zone (default)

### grocery_invitations
- id: uuid (pk)
- list_id: uuid (required, fk)
- invited_by: uuid (required)
- invited_email: text (required)
- status: text (default)

---

# Components

- **App** — `web/src/App.tsx`
- **AuthLayout** — `web/src/layouts/AuthLayout.tsx`
- **DashboardLayout** — `web/src/layouts/DashboardLayout.tsx`
- **InvoiceLayout** — `web/src/layouts/InvoiceLayout.tsx`
- **RootLayout** — `web/src/layouts/RootLayout.tsx`
- **MobileNav** — props: isOpen, onClose — `web/src/layouts/components/MobileNav.tsx`
- **Navbar** — `web/src/layouts/components/Navbar.tsx`
- **AuthProvider** — `web/src/modules/auth/presentation/contexts/AuthContext.tsx`
- **LoginPage** — `web/src/modules/auth/presentation/pages/LoginPage.tsx`
- **SignUpPage** — `web/src/modules/auth/presentation/pages/SignUpPage.tsx`
- **CardCard** — props: card, onEdit, onDelete, onToggleFavorite — `web/src/modules/cards/presentation/components/CardCard.tsx`
- **CardCategoryList** — props: categories, selectedCategoryId, onSelectCategory, onCreateCategory, onUpdateCategory, onDeleteCategory, loading, isCollapsed, onToggleCollapse — `web/src/modules/cards/presentation/components/CardCategoryList.tsx`
- **CardDialog** — props: open, onOpenChange, card, categories, onSave — `web/src/modules/cards/presentation/components/CardDialog.tsx`
- **CardGrid** — props: cards, onEdit, onDelete, onToggleFavorite — `web/src/modules/cards/presentation/components/CardGrid.tsx`
- **CardsPage** — `web/src/modules/cards/presentation/pages/CardsPage.tsx`
- **DashboardPage** — `web/src/modules/dashboard/presentation/pages/DashboardPage.tsx`
- **AddItemInput** — props: listId, products, onAddItem, autoFocus — `web/src/modules/grocery/presentation/components/AddItemInput.tsx`
- **AddShopperDialog** — props: open, onOpenChange, members, participants, currentUserId, startedBy, onAddShopper, onRemoveShopper, isAdding — `web/src/modules/grocery/presentation/components/AddShopperDialog.tsx`
- **CategoryGroup** — props: category, items, isSessionActive, collapseStamp, onCheck, onUncheck, onEditItem, onDeleteItem — `web/src/modules/grocery/presentation/components/CategoryGroup.tsx`
- **EndShoppingDialog** — props: open, onOpenChange, onComplete, onCancel, isCompleting, isCancelling — `web/src/modules/grocery/presentation/components/EndShoppingDialog.tsx`
- **GroceryItemRow** — props: item, isSessionActive, onCheck, onUncheck, onEdit, onDelete — `web/src/modules/grocery/presentation/components/GroceryItemRow.tsx`
- **GroceryListCard** — props: list, isSelected, isOwner, onSelect, onRename, onArchive, onDelete, onLeave — `web/src/modules/grocery/presentation/components/GroceryListCard.tsx`
- **InvitationBanner** — props: invitations, onAccept, onDecline — `web/src/modules/grocery/presentation/components/InvitationBanner.tsx`
- **ItemDetailSheet** — props: open, onOpenChange, item, onSave, onDelete — `web/src/modules/grocery/presentation/components/ItemDetailSheet.tsx`
- **ListTabsContent** — props: listId, groupedItems, checkedItems, suggestions, products, isSessionActive, onAddItem, onCheck, onUncheck, onEditItem — `web/src/modules/grocery/presentation/components/ListTabsContent.tsx`
- **SessionBanner** — props: session, onEndShopping, onManageShoppers — `web/src/modules/grocery/presentation/components/SessionBanner.tsx`
- **SessionCategoryGroup** — props: category, items, onPurchase, onUnpurchase, collapseStamp — `web/src/modules/grocery/presentation/components/SessionCategoryGroup.tsx`
- **SessionItemRow** — props: item, onPurchase, onUnpurchase — `web/src/modules/grocery/presentation/components/SessionItemRow.tsx`
- **SessionListGroup** — props: listName, groupedByCategory, onPurchase, onUnpurchase, collapseStamp, flat — `web/src/modules/grocery/presentation/components/SessionListGroup.tsx`
- **SessionTabsContent** — props: activeSession, sessionItemsByListAndCategory, purchasedSessionItems, sessionCollapseStamp, addSessionItem, isAddingSessionItem, purchaseItem, unpurchaseItem, triggerSessionCollapse — `web/src/modules/grocery/presentation/components/SessionTabsContent.tsx`
- **ShareListDialog** — props: open, onOpenChange, listName, members, invitations, currentUserId, onInvite, onCancelInvitation, onRemoveMember — `web/src/modules/grocery/presentation/components/ShareListDialog.tsx`
- **StartSessionDialog** — props: open, onOpenChange, lists, recentStores, onStart, isStarting — `web/src/modules/grocery/presentation/components/StartSessionDialog.tsx`
- **SuggestionChips** — props: suggestions, listId, onAddItem — `web/src/modules/grocery/presentation/components/SuggestionChips.tsx`
- **GroceryPage** — `web/src/modules/grocery/presentation/pages/GroceryPage.tsx`
- **CategoryList** — props: categories, selectedCategoryId, onSelectCategory, onCreateCategory, onUpdateCategory, onDeleteCategory, loading, isCollapsed, onToggleCollapse, onOpenFolderSettings — `web/src/modules/invoice-generator/presentation/components/CategoryList.tsx`
- **CurrencySelect** — props: value, onChange — `web/src/modules/invoice-generator/presentation/components/CurrencySelect.tsx`
- **FolderSettingsDialog** — props: open, onOpenChange, folder, onSave — `web/src/modules/invoice-generator/presentation/components/FolderSettingsDialog.tsx`
- **InvoiceFooter** — props: data, onChange, savedNotesOptions, savedBankOptions, onSaveOption, onManageSavedOptions — `web/src/modules/invoice-generator/presentation/components/InvoiceFooter.tsx`
- **InvoiceGenerator** — `web/src/modules/invoice-generator/presentation/components/InvoiceGenerator.tsx`
- **InvoiceHeader** — props: data, onChange, savedCompanyOptions, savedBillToOptions, onSaveOption, onManageSavedOptions, autoInvoiceNumber — `web/src/modules/invoice-generator/presentation/components/InvoiceHeader.tsx`
- **InvoiceLineItems** — props: items, currency, onChange, bulkDialogOpen, onBulkDialogOpenChange — `web/src/modules/invoice-generator/presentation/components/InvoiceLineItems.tsx`
- **InvoiceList** — props: invoices, folders, loading, onToggleFavorite, onDelete, onMoveToFolder — `web/src/modules/invoice-generator/presentation/components/InvoiceList.tsx`
- **InvoicePreview** — props: data — `web/src/modules/invoice-generator/presentation/components/InvoicePreview.tsx`
- **InvoiceSummary** — props: data, onChange — `web/src/modules/invoice-generator/presentation/components/InvoiceSummary.tsx`
- **LogoUploader** — props: logo, onLogoChange — `web/src/modules/invoice-generator/presentation/components/LogoUploader.tsx`
- **SavedOptionDialog** — props: open, onOpenChange, optionType, options, onSave, onUpdate, onDelete — `web/src/modules/invoice-generator/presentation/components/SavedOptionDialog.tsx`
- **SavedOptionSelect** — props: options, currentValue, onSelect, onSaveCurrent, onManage — `web/src/modules/invoice-generator/presentation/components/SavedOptionSelect.tsx`
- **InvoiceGeneratorPage** — `web/src/modules/invoice-generator/presentation/pages/InvoiceGeneratorPage.tsx`
- **EditorToolbar** — props: editor, onToggleBold, onToggleItalic, onToggleStrikethrough, onToggleHeading, onToggleBulletList, onToggleOrderedList, onToggleTaskList, onToggleHighlight — `web/src/modules/notes/presentation/components/EditorToolbar.tsx`
- **FolderItem** — props: folder, isActive, onClick, onEdit, onDelete — `web/src/modules/notes/presentation/components/FolderItem.tsx`
- **FolderList** — props: folders, selectedFolderId, onSelectFolder, onCreateFolder, onUpdateFolder, onDeleteFolder, loading, isCollapsed, onToggleCollapse — `web/src/modules/notes/presentation/components/FolderList.tsx`
- **MobileNotesMenu** — props: folders, selectedFolderId, onSelectFolder, onCreateFolder, onDeleteFolder, foldersLoading, notes, selectedNoteId, onSelectNote, onCreateNote — `web/src/modules/notes/presentation/components/MobileNotesMenu.tsx`
- **NoteEditor** — props: note, onTitleChange, onContentChange, onTogglePin, onDelete, onMoveToFolder, onOpenMobileMenu, syncStatus — `web/src/modules/notes/presentation/components/NoteEditor.tsx`
- **NoteItem** — props: note, isActive, onClick, isDirty — `web/src/modules/notes/presentation/components/NoteItem.tsx`
- **NotesList** — props: notes, selectedNoteId, onSelectNote, onCreateNote, loading, searchQuery, onSearchChange, selectedFolderId, folders, syncStatus — `web/src/modules/notes/presentation/components/NotesList.tsx`
- **RichTextEditor** — props: content, onChange, editable — `web/src/modules/notes/presentation/components/RichTextEditor.tsx`
- **NotesPage** — `web/src/modules/notes/presentation/pages/NotesPage.tsx`
- **CategoryItem** — props: category, isActive, onClick, onEdit, onDelete — `web/src/modules/passwords/presentation/components/CategoryItem.tsx`
- **CategoryList** — props: categories, selectedCategoryId, onSelectCategory, onCreateCategory, onUpdateCategory, onDeleteCategory, loading, isCollapsed, onToggleCollapse — `web/src/modules/passwords/presentation/components/CategoryList.tsx`
- **PasswordCard** — props: password, onEdit, onDelete, onToggleFavorite — `web/src/modules/passwords/presentation/components/PasswordCard.tsx`
- **PasswordDetails** — props: password, onUpdate, onToggleFavorite, onDelete, onMoveToCategory — `web/src/modules/passwords/presentation/components/PasswordDetails.tsx`
- **PasswordDialog** — props: open, onOpenChange, password, categories, onSave — `web/src/modules/passwords/presentation/components/PasswordDialog.tsx`
- **PasswordGrid** — props: passwords, onEdit, onDelete, onToggleFavorite — `web/src/modules/passwords/presentation/components/PasswordGrid.tsx`
- **PasswordItem** — props: password, isActive, onClick — `web/src/modules/passwords/presentation/components/PasswordItem.tsx`
- **PasswordList** — props: passwords, selectedPasswordId, onSelectPassword, onCreatePassword, loading, searchQuery, onSearchChange — `web/src/modules/passwords/presentation/components/PasswordList.tsx`
- **PasswordTable** — props: passwords, onEdit, onToggleFavorite, onDelete — `web/src/modules/passwords/presentation/components/PasswordTable.tsx`
- **PasswordsPage** — `web/src/modules/passwords/presentation/pages/PasswordsPage.tsx`
- **SubscriptionSettingsCard** — `web/src/modules/settings/presentation/components/SubscriptionSettingsCard.tsx`
- **ProfilePage** — `web/src/modules/settings/presentation/pages/ProfilePage.tsx`
- **SettingsPage** — `web/src/modules/settings/presentation/pages/SettingsPage.tsx`
- **LoadingScreen** — `web/src/modules/shared/presentation/components/LoadingScreen.tsx`
- **SidebarList** — props: moduleName, title, items, selectedItemId, onSelectItem, onCreate, onUpdate, onDelete, loading, isCollapsed — `web/src/modules/shared/presentation/components/common/SidebarList.tsx`
- **SidebarListItem** — props: name, Icon, count, isActive, onClick, onSettings, onEdit, onDelete — `web/src/modules/shared/presentation/components/common/SidebarListItem.tsx`
- **QueryProvider** — `web/src/modules/shared/presentation/contexts/QueryProvider.tsx`
- **ThemeProvider** — props: defaultTheme, storageKey — `web/src/modules/shared/presentation/contexts/ThemeProvider.tsx`
- **NotFoundPage** — `web/src/modules/shared/presentation/pages/NotFoundPage.tsx`
- **FileCard** — props: file, onEdit, onDelete, onPreview — `web/src/modules/storage/presentation/components/FileCard.tsx`
- **FileDialog** — props: file, folders, open, onOpenChange, onSave — `web/src/modules/storage/presentation/components/FileDialog.tsx`
- **FileGrid** — props: files, onEdit, onDelete, onPreview, loading, folderId, onUploadComplete — `web/src/modules/storage/presentation/components/FileGrid.tsx`
- **FilePreviewDialog** — props: file, open, onOpenChange, onEdit, onDelete, onDownload — `web/src/modules/storage/presentation/components/FilePreviewDialog.tsx`
- **FileUploadButton** — props: folderId, onUploadComplete — `web/src/modules/storage/presentation/components/FileUploadButton.tsx`
- **FolderList** — props: folders, selectedFolderId, onSelectFolder, onCreateFolder, onUpdateFolder, onDeleteFolder, loading, isCollapsed, onToggleCollapse — `web/src/modules/storage/presentation/components/FolderList.tsx`
- **StoragePage** — `web/src/modules/storage/presentation/pages/StoragePage.tsx`
- **RoleBadge** — props: role, className — `web/src/modules/subscriptions/presentation/components/RoleBadge.tsx`
- **TierBadge** — props: tier, className — `web/src/modules/subscriptions/presentation/components/TierBadge.tsx`
- **UpgradeDialog** — props: open, onClose, currentTier, reason, feature — `web/src/modules/subscriptions/presentation/components/UpgradeDialog.tsx`
- **UsageIndicator** — props: label, current, limit, className — `web/src/modules/subscriptions/presentation/components/UsageIndicator.tsx`
- **SubscriptionProvider** — `web/src/modules/subscriptions/presentation/contexts/SubscriptionContext.tsx`
- **ProtectedRoute** — `web/src/router/ProtectedRoute.tsx`
- **PublicRoute** — `web/src/router/PublicRoute.tsx`
- **Router** — `web/src/router/index.tsx`

---

# Libraries

- `packages/shared/src/config/supabase.ts`
  - function initSupabase: (config) => SupabaseClient
  - function getSupabase: () => SupabaseClient
  - interface SupabaseConfig
- `packages/shared/src/modules/auth/domain/entities/User.ts` — class User
- `packages/shared/src/modules/cards/domain/entities/CardCategory.ts` — class CardCategory
- `packages/shared/src/modules/cards/domain/entities/CreditCard.ts` — class CreditCard
- `packages/shared/src/modules/cards/infrastructure/repositories/CardCategoryRepository.ts` — class CardCategoryRepository
- `packages/shared/src/modules/cards/infrastructure/repositories/CreditCardRepository.ts` — class CreditCardRepository
- `packages/shared/src/modules/cards/infrastructure/services/CardEncryptionService.ts` — class CardEncryptionService
- `packages/shared/src/modules/grocery/domain/entities/GroceryItem.ts` — class GroceryItem
- `packages/shared/src/modules/grocery/domain/entities/GroceryList.ts` — class GroceryList
- `packages/shared/src/modules/grocery/domain/entities/GrocerySession.ts` — class GrocerySession
- `packages/shared/src/modules/grocery/domain/entities/Product.ts` — class Product
- `packages/shared/src/modules/grocery/domain/usecases/SuggestItems.ts` — class SuggestItems
- `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryInvitationRepository.ts` — class GroceryInvitationRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryItemRepository.ts` — class GroceryItemRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryListRepository.ts` — class GroceryListRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/GrocerySessionRepository.ts` — class GrocerySessionRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/ProductCatalogRepository.ts` — class ProductCatalogRepository
- `packages/shared/src/modules/grocery/infrastructure/services/GroceryRealtimeService.ts` — class GroceryRealtimeService
- `packages/shared/src/modules/invoice-generator/domain/entities/Invoice.ts` — class Invoice
- `packages/shared/src/modules/invoice-generator/domain/entities/InvoiceFolder.ts` — class InvoiceFolder
- `packages/shared/src/modules/invoice-generator/domain/entities/InvoiceSavedOption.ts` — class InvoiceSavedOption
- `packages/shared/src/modules/invoice-generator/domain/types/index.ts`
  - function isValidLineItem
  - function generateLineItemId
  - interface LineItem
  - interface InvoiceData
  - interface CurrencyConfig
  - type CurrencyCode
  - _...15 more_
- `packages/shared/src/modules/invoice-generator/infrastructure/repositories/InvoiceFolderRepository.ts` — class InvoiceFolderRepository
- `packages/shared/src/modules/invoice-generator/infrastructure/repositories/InvoiceRepository.ts` — class InvoiceRepository
- `packages/shared/src/modules/invoice-generator/infrastructure/repositories/SavedOptionRepository.ts` — class SavedOptionRepository
- `packages/shared/src/modules/invoice-generator/infrastructure/services/InvoiceNumberService.ts` — class InvoiceNumberService
- `packages/shared/src/modules/notes/domain/entities/Folder.ts` — class Folder
- `packages/shared/src/modules/notes/domain/entities/Note.ts` — class Note
- `packages/shared/src/modules/notes/infrastructure/repositories/FolderRepository.ts` — class FolderRepository
- `packages/shared/src/modules/notes/infrastructure/repositories/HybridNoteRepository.ts` — class HybridNoteRepository
- `packages/shared/src/modules/notes/infrastructure/repositories/NoteRepository.ts` — class NoteRepository
- `packages/shared/src/modules/notes/infrastructure/services/NoteSyncService.ts` — class NoteSyncService
- `packages/shared/src/modules/passwords/domain/entities/Category.ts` — class Category
- `packages/shared/src/modules/passwords/domain/entities/Password.ts` — class Password
- `packages/shared/src/modules/passwords/infrastructure/repositories/CategoryRepository.ts` — class CategoryRepository
- `packages/shared/src/modules/passwords/infrastructure/repositories/PasswordRepository.ts` — class PasswordRepository
- `packages/shared/src/modules/passwords/infrastructure/services/EncryptionService.ts` — class EncryptionService
- `packages/shared/src/modules/storage/domain/entities/File.ts` — class File
- `packages/shared/src/modules/storage/domain/entities/StorageFolder.ts` — class StorageFolder
- `packages/shared/src/modules/storage/infrastructure/repositories/FileRepository.ts` — class FileRepository
- `packages/shared/src/modules/storage/infrastructure/repositories/StorageFolderRepository.ts` — class StorageFolderRepository
- `packages/shared/src/modules/storage/infrastructure/services/StorageService.ts` — class StorageService
- `packages/shared/src/modules/subscriptions/domain/constants/tierLimits.ts`
  - function isUnlimited
  - function getLimit
  - const TIER_LIMITS: Record<TierType, TierLimits>
  - const TIER_NAMES: Record<TierType, string>
  - const TIER_DESCRIPTIONS: Record<TierType, string>
  - const ROLE_NAMES: Record<string, string>
  - _...1 more_
- `packages/shared/src/modules/subscriptions/domain/entities/Subscription.ts` — class Subscription
- `packages/shared/src/modules/subscriptions/domain/entities/UsageLimits.ts` — class UsageLimits
- `packages/shared/src/modules/subscriptions/domain/usecases/CheckFeatureAccess.ts` — class CheckFeatureAccess
- `packages/shared/src/modules/subscriptions/domain/usecases/GetCurrentUsage.ts` — class GetCurrentUsage
- `packages/shared/src/modules/subscriptions/infrastructure/repositories/SubscriptionRepository.ts` — class SubscriptionRepository
- `packages/shared/src/modules/subscriptions/infrastructure/repositories/UsageLimitsRepository.ts` — class UsageLimitsRepository
- `packages/shared/src/services/Logger.ts`
  - function initLogger: (config) => LoggerService
  - function getLogger: () => LoggerService
  - interface LoggerConfig
- `web/src/modules/auth/domain/entities/User.ts` — class User
- `web/src/modules/auth/infrastructure/api/SupabaseAuthRepository.ts` — class SupabaseAuthRepository
- `web/src/modules/auth/presentation/hooks/useAuth.ts` — function useAuth
- `web/src/modules/auth/presentation/hooks/useLogin.ts` — function useLogin
- `web/src/modules/cards/domain/entities/CardCategory.ts` — class CardCategory
- `web/src/modules/cards/domain/entities/CreditCard.ts` — class CreditCard
- `web/src/modules/cards/presentation/hooks/useCardCategories.ts` — function useCardCategories
- `web/src/modules/cards/presentation/hooks/useCards.ts` — function useCards
- `web/src/modules/grocery/presentation/hooks/useGroceryInvitations.ts` — function useGroceryInvitations
- `web/src/modules/grocery/presentation/hooks/useGroceryItems.ts` — function useGroceryItems
- `web/src/modules/grocery/presentation/hooks/useGroceryLists.ts` — function useGroceryLists
- `web/src/modules/grocery/presentation/hooks/useGroceryRealtime.ts` — function useGroceryRealtime
- `web/src/modules/grocery/presentation/hooks/useGrocerySession.ts` — function useGrocerySession
- `web/src/modules/grocery/presentation/hooks/useProductCatalog.ts` — function useProductCatalog
- `web/src/modules/grocery/presentation/hooks/useSuggestions.ts` — function useSuggestions
- `web/src/modules/invoice-generator/domain/entities/Invoice.ts` — class Invoice
- `web/src/modules/invoice-generator/domain/entities/InvoiceFolder.ts` — class InvoiceFolder
- `web/src/modules/invoice-generator/domain/entities/InvoiceSavedOption.ts` — class InvoiceSavedOption
- `web/src/modules/invoice-generator/domain/types/index.ts`
  - function isValidLineItem
  - function generateLineItemId
  - interface LineItem
  - interface InvoiceData
  - interface CurrencyConfig
  - type CurrencyCode
  - _...15 more_
- `web/src/modules/invoice-generator/infrastructure/services/InvoicePDFService.ts` — class InvoicePDFService
- `web/src/modules/invoice-generator/presentation/hooks/useInvoiceFolders.ts` — function useInvoiceFolders, const invoiceFolderKeys
- `web/src/modules/invoice-generator/presentation/hooks/useInvoiceNumber.ts` — function useInvoiceNumber
- `web/src/modules/invoice-generator/presentation/hooks/useInvoicePDF.ts` — function useInvoicePDF
- `web/src/modules/invoice-generator/presentation/hooks/useInvoices.ts` — function useInvoices
- `web/src/modules/invoice-generator/presentation/hooks/useSavedOptions.ts` — function useSavedOptions
- `web/src/modules/invoice-generator/presentation/utils/currency.ts`
  - function formatCurrency
  - function getCurrencySymbol
  - function parseCurrencyInput
- `web/src/modules/invoice-generator/presentation/utils/pdf.ts` — function getPDFOptions, function getPDFBuildOptions
- `web/src/modules/notes/domain/entities/Folder.ts` — class Folder
- `web/src/modules/notes/domain/entities/Note.ts` — class Note
- `web/src/modules/notes/infrastructure/storage/LocalNotesStorage.ts` — class LocalNotesStorage
- `web/src/modules/notes/presentation/hooks/useEditor.ts` — function useEditor, const NOTE_CONTENT_MAX_LENGTH
- `web/src/modules/notes/presentation/hooks/useFolders.ts` — function useFolders
- `web/src/modules/notes/presentation/hooks/useNotes.ts` — function useNotes
- `web/src/modules/passwords/domain/entities/Category.ts` — class Category
- `web/src/modules/passwords/domain/entities/Password.ts` — class Password
- `web/src/modules/passwords/presentation/hooks/useCategories.ts` — function useCategories
- `web/src/modules/passwords/presentation/hooks/usePasswords.ts` — function usePasswords
- `web/src/modules/shared/presentation/utils/cn.ts` — function cn: (...inputs) => void
- `web/src/modules/shared/presentation/utils/date.ts` — function formatRelativeTime: (date) => string
- `web/src/modules/shared/presentation/utils/url.ts` — function isSafeUrl, function safeOpenUrl
- `web/src/modules/storage/domain/entities/File.ts` — class File
- `web/src/modules/storage/domain/entities/StorageFolder.ts` — class StorageFolder
- `web/src/modules/storage/infrastructure/services/CompressionService.ts` — class CompressionService
- `web/src/modules/storage/infrastructure/services/ThumbnailService.ts` — class ThumbnailService
- `web/src/modules/storage/presentation/hooks/useFileUpload.ts` — function useFileUpload
- `web/src/modules/storage/presentation/hooks/useFiles.ts` — function useFiles
- `web/src/modules/storage/presentation/hooks/useStorageFolders.ts` — function useStorageFolders
- `web/src/modules/subscriptions/domain/constants/tierLimits.ts`
  - function isUnlimited
  - function getLimit
  - const TIER_LIMITS: Record<TierType, TierLimits>
  - const TIER_NAMES: Record<TierType, string>
  - const TIER_DESCRIPTIONS: Record<TierType, string>
  - const ROLE_NAMES: Record<string, string>
  - _...1 more_
- `web/src/modules/subscriptions/domain/entities/Subscription.ts` — class Subscription
- `web/src/modules/subscriptions/domain/entities/UsageLimits.ts` — class UsageLimits
- `web/src/modules/subscriptions/domain/usecases/CheckFeatureAccess.ts` — class CheckFeatureAccess
- `web/src/modules/subscriptions/domain/usecases/GetCurrentUsage.ts` — class GetCurrentUsage
- `web/src/modules/subscriptions/presentation/hooks/useSubscription.ts` — function useSubscription

---

# Config

## Environment Variables

- `DEV` **required** — web/src/modules/shared/infrastructure/services/Logger.ts
- `VITE_APP_URL` (has default) — web/.env.example
- `VITE_SUPABASE_ANON_KEY` (has default) — web/.env.example
- `VITE_SUPABASE_URL` (has default) — web/.env.example

## Config Files

- `web/.env.example`
- `web/tailwind.config.js`
- `web/vite.config.ts`

---

# Middleware

## auth
- auth.types — `packages/shared/src/modules/auth/domain/types/auth.types.ts`
- auth.types — `web/src/modules/auth/domain/types/auth.types.ts`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `web/src/modules/grocery/domain/index.ts` — imported by **24** files
- `packages/shared/src/config/index.ts` — imported by **21** files
- `packages/shared/src/services/index.ts` — imported by **13** files
- `web/src/modules/storage/domain/entities/index.ts` — imported by **12** files
- `web/src/modules/passwords/domain/index.ts` — imported by **10** files
- `web/src/modules/invoice-generator/domain/types/index.ts` — imported by **8** files
- `web/src/modules/grocery/presentation/components/SessionCategoryGroup.tsx` — imported by **7** files
- `web/src/modules/grocery/presentation/hooks/queryKeys.ts` — imported by **7** files
- `web/src/modules/subscriptions/domain/index.ts` — imported by **7** files
- `packages/shared/src/modules/subscriptions/domain/types/index.ts` — imported by **6** files
- `web/src/modules/cards/domain/index.ts` — imported by **6** files
- `web/src/modules/grocery/infrastructure/repositories/index.ts` — imported by **6** files
- `web/src/modules/notes/domain/entities/Note.ts` — imported by **6** files
- `web/src/modules/notes/domain/index.ts` — imported by **6** files
- `web/src/modules/passwords/domain/entities/Password.ts` — imported by **6** files
- `packages/shared/src/modules/grocery/domain/types/index.ts` — imported by **5** files
- `packages/shared/src/modules/invoice-generator/domain/types/index.ts` — imported by **5** files
- `web/src/modules/storage/domain/types/index.ts` — imported by **5** files
- `web/src/modules/storage/infrastructure/services/index.ts` — imported by **5** files
- `web/src/modules/subscriptions/domain/types/index.ts` — imported by **5** files

## Import Map (who imports what)

- `web/src/modules/grocery/domain/index.ts` ← `web/src/modules/grocery/presentation/components/AddItemInput.tsx`, `web/src/modules/grocery/presentation/components/AddShopperDialog.tsx`, `web/src/modules/grocery/presentation/components/CategoryGroup.tsx`, `web/src/modules/grocery/presentation/components/GroceryItemRow.tsx`, `web/src/modules/grocery/presentation/components/GroceryItemRow.tsx` +19 more
- `packages/shared/src/config/index.ts` ← `packages/shared/src/index.ts`, `packages/shared/src/modules/cards/infrastructure/repositories/CardCategoryRepository.ts`, `packages/shared/src/modules/cards/infrastructure/repositories/CreditCardRepository.ts`, `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryInvitationRepository.ts`, `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryItemRepository.ts` +16 more
- `packages/shared/src/services/index.ts` ← `packages/shared/src/index.ts`, `packages/shared/src/modules/cards/infrastructure/repositories/CreditCardRepository.ts`, `packages/shared/src/modules/cards/infrastructure/services/CardEncryptionService.ts`, `packages/shared/src/modules/invoice-generator/infrastructure/repositories/InvoiceFolderRepository.ts`, `packages/shared/src/modules/invoice-generator/infrastructure/repositories/InvoiceRepository.ts` +8 more
- `web/src/modules/storage/domain/entities/index.ts` ← `web/src/modules/storage/domain/index.ts`, `web/src/modules/storage/presentation/components/FileCard.tsx`, `web/src/modules/storage/presentation/components/FileDialog.tsx`, `web/src/modules/storage/presentation/components/FileDialog.tsx`, `web/src/modules/storage/presentation/components/FileGrid.tsx` +7 more
- `web/src/modules/passwords/domain/index.ts` ← `web/src/modules/passwords/index.ts`, `web/src/modules/passwords/presentation/components/CategoryItem.tsx`, `web/src/modules/passwords/presentation/components/CategoryList.tsx`, `web/src/modules/passwords/presentation/components/PasswordCard.tsx`, `web/src/modules/passwords/presentation/components/PasswordDialog.tsx` +5 more
- `web/src/modules/invoice-generator/domain/types/index.ts` ← `web/src/modules/invoice-generator/domain/entities/Invoice.ts`, `web/src/modules/invoice-generator/domain/entities/Invoice.ts`, `web/src/modules/invoice-generator/domain/entities/InvoiceFolder.ts`, `web/src/modules/invoice-generator/domain/entities/InvoiceSavedOption.ts`, `web/src/modules/invoice-generator/presentation/components/SavedOptionDialog.tsx` +3 more
- `web/src/modules/grocery/presentation/components/SessionCategoryGroup.tsx` ← `web/src/modules/grocery/presentation/components/CategoryGroup.tsx`, `web/src/modules/grocery/presentation/components/ListTabsContent.tsx`, `web/src/modules/grocery/presentation/components/SessionListGroup.tsx`, `web/src/modules/grocery/presentation/components/SessionListGroup.tsx`, `web/src/modules/grocery/presentation/components/SessionTabsContent.tsx` +2 more
- `web/src/modules/grocery/presentation/hooks/queryKeys.ts` ← `web/src/modules/grocery/presentation/hooks/index.ts`, `web/src/modules/grocery/presentation/hooks/useGroceryInvitations.ts`, `web/src/modules/grocery/presentation/hooks/useGroceryItems.ts`, `web/src/modules/grocery/presentation/hooks/useGroceryLists.ts`, `web/src/modules/grocery/presentation/hooks/useGroceryRealtime.ts` +2 more
- `web/src/modules/subscriptions/domain/index.ts` ← `web/src/modules/subscriptions/index.ts`, `web/src/modules/subscriptions/presentation/components/RoleBadge.tsx`, `web/src/modules/subscriptions/presentation/components/RoleBadge.tsx`, `web/src/modules/subscriptions/presentation/components/TierBadge.tsx`, `web/src/modules/subscriptions/presentation/components/TierBadge.tsx` +2 more
- `packages/shared/src/modules/subscriptions/domain/types/index.ts` ← `packages/shared/src/modules/subscriptions/domain/constants/tierLimits.ts`, `packages/shared/src/modules/subscriptions/domain/entities/Subscription.ts`, `packages/shared/src/modules/subscriptions/domain/entities/UsageLimits.ts`, `packages/shared/src/modules/subscriptions/domain/index.ts`, `packages/shared/src/modules/subscriptions/domain/usecases/CheckFeatureAccess.ts` +1 more

---

# Test Coverage

> **5%** of routes and models are covered by tests
> 2 test files found

## Covered Models

- passwords

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_