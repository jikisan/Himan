# Graph Report - Himan  (2026-08-30)

## Corpus Check
- Large corpus: 666 files · ~178,823 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2801 nodes · 5999 edges · 255 communities (151 shown, 104 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.83)
- Token cost: 384,499 input · 0 output

## Community Hubs (Navigation)
- Shared Subscriptions Domain
- Shared Notes Domain
- Web Notes Domain
- Storage & File Handling
- Mobile Offline Sync Storage (SQLite)
- Mobile Errand Start & Templates
- Web Passwords Domain
- Mobile Errand Session Screens
- Web Cards Domain
- Mobile App Shell & Auth Context
- Web Subscriptions Domain
- Mobile Product Catalog Screens
- Web Auth Domain
- Web Grocery Item Components
- Shared Grocery Invitations
- Shared Grocery Domain Types
- Web Grocery Module Boundary
- Mobile Sync Op Executor
- Mobile Product Edit Dialog
- Package Manifests & Dependencies
- Shared Invoice Generator
- Web Shared UI Primitives
- Shared Grocery
- Supabase Migrations
- Shared Shared
- Web Invoice
- Supabase Migrations
- Mobile Cards
- Shared Grocery
- Web Tsconfig
- Web Src
- Mobile Grocery
- Shared Friends
- Supabase Migrations
- Shared Passwords
- Web Invoice
- Shared Cards
- Web Invoice
- Web Invoice
- Mobile App
- Mobile Grocery
- Mobile Passwords
- Shared Cards
- Shared Storage
- Shared Shared
- Supabase Migrations
- Web Tsconfig
- Mobile Google
- Web Src
- Web Tsconfig
- Mobile Cards
- Mobile App
- Shared Grocery
- Web Package
- Mobile Package
- Mobile App
- Shared Auth
- Mobile Cards
- Mobile Tsconfig
- Shared Shared
- Shared Invoice
- Shared Shared
- Mobile Claude
- Mobile Cards
- Shared Grocery
- Mobile Grocery
- Mobile Grocery
- Shared Passwords
- Web Invoice
- Mobile Cards
- Shared Invoice
- Web Invoice
- Shared Storage
- Web Invoice
- Mobile Claude
- Mobile Grocery
- Shared Passwords
- Supabase Migrations
- Web Claude
- Web Src
- Mobile Grocery
- Mobile Grocery
- Shared Passwords
- Web Prompts
- Web Package
- Mobile Package
- Shared Storage
- Web Notes
- Web Notes
- Web Src
- Mobile Claude
- Web Package
- Mobile App
- Mobile Auth
- Mobile Grocery
- Mobile Grocery
- Supabase Migrations
- Web Prompts
- Web Src
- Web Dashboard
- Mobile Grocery
- Mobile App
- Shared Shared
- Web Claude
- Web Src
- Web Src
- Web Settings
- Web Shared
- Mobile Cards
- Mobile Grocery
- Mobile Metro
- Mobile Passwords
- Shared Auth
- Supabase Migrations
- Web Package
- Web Src
- Mobile Shared
- Mobile Grocery
- Shared Invoice
- Shared Shared
- Supabase Migrations
- Supabase Migrations
- Web Notes
- Web Src
- Mobile App
- Mobile App
- Mobile Package
- Web Claude
- Web Prompts
- Web Notes
- Mobile App
- Mobile App
- Web Tsconfig
- Web Src
- Web Shared
- Cross-cutting Concepts
- Mobile Grocery
- Mobile Grocery
- Mobile Grocery
- Mobile Grocery
- Mobile Grocery
- Mobile Grocery
- Supabase Migrations
- Supabase Migrations
- Web Src
- Web Src
- Web Src
- Web Src
- Web Src
- Web Invoice
- Web Shared
- Web Tsconfig
- Web Tsconfig
- Web Package
- Web Package
- Web Package
- Web Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Web Package
- Web Package
- Web Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Mobile Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Tsconfig
- Web Tsconfig
- Web Tsconfig
- Web Tsconfig
- Web Tsconfig
- Web Tsconfig
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package
- Web Package

## God Nodes (most connected - your core abstractions)
1. `getSupabase()` - 171 edges
2. `getLogger()` - 71 edges
3. `useAuth()` - 45 edges
4. `NotebookColors` - 37 edges
5. `GroceryItemType` - 37 edges
6. `expo-router` - 34 edges
7. `GroceryListType` - 33 edges
8. `SessionItemType` - 33 edges
9. `GrocerySessionRepository` - 29 edges
10. `ProductType` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Paper Notebook UI Direction` --semantically_similar_to--> `Notes-App Minimalist Direction`  [INFERRED] [semantically similar]
  docs/grocery-redesign-plan.md → mobile/src/modules/grocery/presentation/DESIGN.md
- `useFriends Hook` --semantically_similar_to--> `usePasswords Hook`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-08-01-grocery-friends.md → PASSWORDS_MOBILE_PLAN.md
- `Shared EncryptionService (AES-GCM)` --semantically_similar_to--> `CardEncryptionService`  [INFERRED] [semantically similar]
  PASSWORDS_MOBILE_PLAN.md → mobile/CARDS_PLAN.md
- `Passwords CategoryChips` --semantically_similar_to--> `CategoryGroup #tag Headers`  [INFERRED] [semantically similar]
  PASSWORDS_MOBILE_PLAN.md → mobile/src/modules/grocery/presentation/DESIGN.md
- `friendlyError Postgres Exception Mapper` --semantically_similar_to--> `MobileAuthRepository`  [INFERRED] [semantically similar]
  docs/superpowers/plans/2026-08-01-grocery-friends.md → mobile/GOOGLE_SIGNIN_PLAN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Friends Feature End-to-End Flow (migration to UI)** — docs_superpowers_plans_2026_08_01_grocery_friends_friendships_table, docs_superpowers_plans_2026_08_01_grocery_friends_send_friend_request, docs_superpowers_plans_2026_08_01_grocery_friends_friendrepository, docs_superpowers_plans_2026_08_01_grocery_friends_usefriends, docs_superpowers_plans_2026_08_01_grocery_friends_friendpicker, docs_superpowers_plans_2026_08_01_grocery_friends_friendsscreen [EXTRACTED 1.00]
- **Mobile Auth Bootstrap Chain** — mobile_google_signin_plan_initsupabase, mobile_google_signin_plan_exposecurestoreadapter, mobile_google_signin_plan_mobileauthrepository, mobile_google_signin_plan_authprovider, mobile_google_signin_plan_uselogin, mobile_google_signin_plan_protected_routing [EXTRACTED 1.00]
- **Offline Sync Write Path (optimistic to drained)** — docs_grocery_redesign_plan_syncqueue, docs_grocery_redesign_plan_syncengine, docs_grocery_redesign_plan_sqlitesyncstorage, docs_grocery_redesign_plan_lww_conflict_resolution, docs_grocery_redesign_plan_client_generated_uuids, docs_grocery_redesign_plan_auth_hardening [EXTRACTED 1.00]
- **Notes Three-Panel UI Composition** — web_src_modules_notes_readme_notespage, web_src_modules_notes_readme_folderlist, web_src_modules_notes_readme_noteslist, web_src_modules_notes_readme_noteeditor, web_src_modules_notes_readme_richtexteditor [EXTRACTED 1.00]
- **Clean Architecture Principle Set Governing All Modules** — web_prompts_setup_file_structure_dependency_rule, web_prompts_setup_file_structure_module_independence, web_prompts_setup_file_structure_public_api_barrel, web_prompts_setup_file_structure_use_case_driven, web_prompts_setup_file_structure_framework_agnostic_domain, web_src_modules_notes_implementation_summary_dependency_inversion [EXTRACTED 1.00]
- **Invoice PDF Generation Flow** — web_prompts_invoice_generator_line_items, web_prompts_invoice_generator_blank_item_filtering, web_prompts_invoice_generator_calculation_logic, web_prompts_invoice_generator_currency_handling, web_prompts_invoice_generator_pdf_generation [EXTRACTED 1.00]

## Communities (255 total, 104 thin omitted)

### Community 0 - "Shared Subscriptions Domain"
Cohesion: 0.05
Nodes (31): ROLE_DESCRIPTIONS, ROLE_NAMES, TIER_DESCRIPTIONS, TIER_LIMITS, TIER_NAMES, Subscription, UsageLimits, FeatureAccessResult (+23 more)

### Community 1 - "Shared Notes Domain"
Cohesion: 0.07
Nodes (16): Folder, Note, CreateFolderDto, CreateNoteDto, Folder, LocalNotesStoragePort, Note, NoteFilters (+8 more)

### Community 2 - "Web Notes Domain"
Cohesion: 0.06
Nodes (32): Folder, Note, CreateFolderDto, CreateNoteDto, Folder, Note, NoteFilters, UpdateFolderDto (+24 more)

### Community 3 - "Storage & File Handling"
Cohesion: 0.06
Nodes (32): StorageService, File, StorageFolder, CreateFileDto, CreateStorageFolderDto, FileFilters, FileType, FileUploadProgress (+24 more)

### Community 4 - "Mobile Offline Sync Storage (SQLite)"
Cohesion: 0.07
Nodes (26): RFC-4122, getDb(), kvGet(), kvRemove(), kvSet(), OutboxRow, SqliteSyncStorage, SyncContextValue (+18 more)

### Community 5 - "Mobile Errand Start & Templates"
Cohesion: 0.08
Nodes (40): TemplatesScreen(), ErrandNameField(), ErrandNameFieldProps, ListSelector(), ListSelectorProps, ListSelectorRow(), ListSelectorRowProps, StartErrandModal() (+32 more)

### Community 6 - "Web Passwords Domain"
Cohesion: 0.08
Nodes (32): Category, Password, CategoryType, CreateCategoryDto, CreatePasswordDto, PasswordFilters, PasswordType, UpdateCategoryDto (+24 more)

### Community 7 - "Mobile Errand Session Screens"
Cohesion: 0.06
Nodes (34): HistoryScreen(), expo-router, ExpoRouter, __routes, ErrandEmptyState(), ErrandItemEditModal(), ErrandItemEdits, parseNumber() (+26 more)

### Community 8 - "Web Cards Domain"
Cohesion: 0.07
Nodes (28): CardCategory, CreditCard, CardCategoryType, CreateCardCategoryDto, CreateCreditCardDto, CreditCardFilters, CreditCardType, UpdateCardCategoryDto (+20 more)

### Community 9 - "Mobile App Shell & Auth Context"
Cohesion: 0.12
Nodes (27): GroceryListDetailScreen(), Index(), AuthContext, AuthContextType, useAuth(), logger, SyncContext, groceryKeys (+19 more)

### Community 10 - "Web Subscriptions Domain"
Cohesion: 0.09
Nodes (16): ROLE_DESCRIPTIONS, ROLE_NAMES, TIER_DESCRIPTIONS, TIER_LIMITS, TIER_NAMES, Subscription, UsageLimits, FeatureAccessResult (+8 more)

### Community 11 - "Mobile Product Catalog Screens"
Cohesion: 0.08
Nodes (26): CatalogScreen(), CatalogAddRow(), CatalogAddRowProps, CatalogEmptyState(), CatalogHeader(), CatalogHeaderProps, CatalogProductList(), ProductDetailScreen() (+18 more)

### Community 12 - "Web Auth Domain"
Cohesion: 0.07
Nodes (15): User, AuthError, AuthRepository, AuthSession, LoginCredentials, SignUpCredentials, SupabaseAuthRepository, AuthContext (+7 more)

### Community 13 - "Web Grocery Item Components"
Cohesion: 0.14
Nodes (26): ErrandItemEditModalProps, CreateGroceryItemDto, ItemSuggestion, SessionItemType, AddItemInput(), AddItemInputProps, CategoryGroup(), CategoryGroupProps (+18 more)

### Community 14 - "Shared Grocery Invitations"
Cohesion: 0.11
Nodes (6): getSupabase(), GroceryInvitationType, GroceryInvitationRepository, GroceryListRepository, GroceryRealtimeService, RealtimeChannel

### Community 15 - "Shared Grocery Domain Types"
Cohesion: 0.13
Nodes (18): SUGGESTED_CATEGORIES, SuggestedCategory, ProductStore, AddSessionMemberDto, CheckItemDto, CreateGroceryListDto, CreateProductDto, GroceryItemFilters (+10 more)

### Community 16 - "Web Grocery Module Boundary"
Cohesion: 0.15
Nodes (15): InvitationBanner(), InvitationBannerProps, ShareListDialog(), ShareListDialogProps, StartSessionDialog(), StartSessionDialogProps, groceryKeys, useGroceryInvitations() (+7 more)

### Community 17 - "Mobile Sync Op Executor"
Cohesion: 0.12
Nodes (18): createOpExecutor(), isRetryableError(), items, lists, NETWORK_HINTS, P, prefs, products (+10 more)

### Community 18 - "Mobile Product Edit Dialog"
Cohesion: 0.14
Nodes (23): EASE_OUT, INPUT, INPUT_CARD, LABEL, Field(), ProductEditForm(), ProductEditFormProps, ProductEditFormValues (+15 more)

### Community 19 - "Package Manifests & Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, expo, react, react-native, devDependencies, supabase, expo, react (+23 more)

### Community 20 - "Shared Invoice Generator"
Cohesion: 0.12
Nodes (17): Invoice, CreateInvoiceDto, CURRENCY_CONFIGS, CURRENCY_OPTIONS, CurrencyCode, CurrencyConfig, generateLineItemId(), getDefaultInvoiceData (+9 more)

### Community 21 - "Web Shared UI Primitives"
Cohesion: 0.09
Nodes (13): supabase, itemNameSchema, SidebarList(), SidebarListItem, SidebarListProps, SpecialViewType, SidebarListItem(), SidebarListItemProps (+5 more)

### Community 22 - "Shared Grocery"
Cohesion: 0.13
Nodes (14): GROCERY_CATEGORIES, GROCERY_UNITS, ItemDetailMode, ItemDetailSheet(), ItemDetailSheetProps, GroceryItem, GroceryItemType, UpdateGroceryItemDto (+6 more)

### Community 23 - "Supabase Migrations"
Cohesion: 0.13
Nodes (25): auto_create_grocery_list_owner(), auto_create_session_starter_member(), create_grocery_list_owner, create_session_starter_member, get_user_id_by_email(), grocery_invitations, grocery_items, grocery_list_members (+17 more)

### Community 24 - "Shared Shared"
Cohesion: 0.08
Nodes (25): dependencies, date-fns, @supabase/supabase-js, zod, exports, ./auth, ./cards, ./config (+17 more)

### Community 25 - "Web Invoice"
Cohesion: 0.15
Nodes (19): CreateInvoiceDto, CreateInvoiceFolderDto, CreateSavedOptionDto, CURRENCY_OPTIONS, CurrencyCode, CurrencyConfig, generateLineItemId(), getDefaultInvoiceData (+11 more)

### Community 26 - "Supabase Migrations"
Cohesion: 0.12
Nodes (21): decrement_files_count, decrement_storage_folders_count, decrement_storage_on_file_delete, decrement_storage_used(), files, increment_files_count, increment_storage_folders_count, increment_storage_on_file_insert (+13 more)

### Community 27 - "Mobile Cards"
Cohesion: 0.11
Nodes (12): CardsHeader(), CardsHeaderProps, CategoryChips(), CategoryChipsProps, ChipProps, SelectedCategoryId, CategoryModal(), CategoryModalProps (+4 more)

### Community 28 - "Shared Grocery"
Cohesion: 0.17
Nodes (5): CatalogProductListProps, Product, ProductType, SuggestItems, ProductCatalogRepository

### Community 29 - "Web Tsconfig"
Cohesion: 0.09
Nodes (22): ES2023, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module (+14 more)

### Community 30 - "Web Src"
Cohesion: 0.16
Nodes (18): Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, PopoverContent, Separator (+10 more)

### Community 31 - "Mobile Grocery"
Cohesion: 0.17
Nodes (14): GroceryHomeScreen(), GroceryHomeErrandBanner(), GroceryHomeErrandBannerProps, GroceryHomeHeader(), GroceryHomeHeaderProps, GroceryHomeShelfCard(), GroceryHomeShelfCardProps, GroceryHomeShelfGrid() (+6 more)

### Community 32 - "Shared Friends"
Cohesion: 0.15
Nodes (8): mapFriendRow(), FriendDirection, FriendRowType, FriendStatus, FriendType, friendlyError(), FriendRepository, row

### Community 33 - "Supabase Migrations"
Cohesion: 0.13
Nodes (17): initialize_user_subscription, decrement_categories_count, decrement_folders_count, decrement_notes_count, decrement_passwords_count, increment_categories_count, increment_folders_count, increment_notes_count (+9 more)

### Community 34 - "Shared Passwords"
Cohesion: 0.17
Nodes (8): DetailRowProps, PasswordDetailSheet(), PasswordDetailSheetProps, PasswordListItem(), PasswordListItemProps, Password, PasswordType, PasswordRepository

### Community 35 - "Web Invoice"
Cohesion: 0.15
Nodes (6): Invoice, CURRENCY_CONFIGS, InvoiceType, InvoicePDFService, InvoiceList(), InvoiceListProps

### Community 36 - "Shared Cards"
Cohesion: 0.21
Nodes (5): CreditCardFilters, CreditCardType, UpdateCreditCardDto, CreditCardRepository, CardEncryptionService

### Community 37 - "Web Invoice"
Cohesion: 0.16
Nodes (13): CategoryList(), CategoryListProps, CategoryType, CurrencySelect(), CurrencySelectProps, InvoiceFooter(), InvoiceFooterProps, InvoiceHeader() (+5 more)

### Community 38 - "Web Invoice"
Cohesion: 0.17
Nodes (14): InvoiceLineItems(), InvoiceLineItemsProps, NumericCellProps, parseLineItems(), formatNumber(), formatWithCurrency(), InvoicePreview, InvoicePreviewProps (+6 more)

### Community 39 - "Mobile App"
Cohesion: 0.17
Nodes (12): CategoryModalState, PasswordsScreen(), SelectedCategoryId, defaultForm(), FormData, generatePassword(), PasswordFormScreen(), PasswordFormScreenProps (+4 more)

### Community 40 - "Mobile Grocery"
Cohesion: 0.12
Nodes (7): CreateListInputProps, InvitationBanner(), InvitationBannerProps, InvitationsSectionProps, EndShoppingModalProps, SessionAddItemProps, SessionHeaderProps

### Community 41 - "Mobile Passwords"
Cohesion: 0.13
Nodes (12): CategoryChips(), CategoryChipsProps, ChipProps, SelectedCategoryId, CategoryModal(), CategoryModalProps, DeletePasswordModal(), DeletePasswordModalProps (+4 more)

### Community 42 - "Shared Cards"
Cohesion: 0.23
Nodes (5): CardCategory, CardCategoryType, CreateCardCategoryDto, UpdateCardCategoryDto, CardCategoryRepository

### Community 43 - "Shared Storage"
Cohesion: 0.20
Nodes (6): StorageFolder, CreateStorageFolderDto, FileUploadProgress, StorageFolderType, UpdateStorageFolderDto, StorageFolderRepository

### Community 44 - "Shared Shared"
Cohesion: 0.11
Nodes (18): compilerOptions, composite, declaration, declarationMap, erasableSyntaxOnly, lib, module, moduleResolution (+10 more)

### Community 45 - "Supabase Migrations"
Cohesion: 0.17
Nodes (17): folders, notes, auth.users, update_folders_updated_at, update_notes_updated_at, update_updated_at_column(), product_stores, auth.users (+9 more)

### Community 46 - "Web Tsconfig"
Cohesion: 0.11
Nodes (19): compilerOptions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, jsx, module, moduleDetection, moduleResolution (+11 more)

### Community 47 - "Mobile Google"
Cohesion: 0.14
Nodes (18): Row-Level Security via auth.uid(), Supabase Backend (auth, database, storage), Supabase init/get Singleton Dependency Injection, friendlyError Postgres Exception Mapper, FriendRepository, friendships Table Migration, get_friend_requests RPC, get_friends RPC (+10 more)

### Community 48 - "Web Src"
Cohesion: 0.18
Nodes (9): AuthLayout(), MobileNav(), MobileNavProps, Navbar(), Sidebar(), SidebarProps, DashboardLayout(), InvoiceLayout() (+1 more)

### Community 49 - "Web Tsconfig"
Cohesion: 0.12
Nodes (17): src/modules/*, src/modules/auth/*, src/modules/grocery/*, src/modules/notes/*, src/modules/passwords/*, src/modules/shared/*, src/modules/storage/*, src/modules/subscriptions/* (+9 more)

### Community 50 - "Mobile Cards"
Cohesion: 0.17
Nodes (11): CARD_ISSUERS, CARD_TYPES, CardFormScreen(), CURRENT_YEAR, defaultForm(), formatCardNumber(), FormData, luhnCheck() (+3 more)

### Community 51 - "Mobile App"
Cohesion: 0.17
Nodes (12): AppLayout(), queryClient, SettingsScreen(), ThemeOption, themeOptions, ThemeContext, ThemeContextValue, ThemeMode (+4 more)

### Community 52 - "Shared Grocery"
Cohesion: 0.26
Nodes (6): ProductStorePickerProps, Store, CreateStoreDto, StoreType, UpdateStoreDto, StoreRepository

### Community 53 - "Web Package"
Cohesion: 0.13
Nodes (15): autoprefixer, @eslint/js, eslint-plugin-react-refresh, globals, jsdom, @types/react-dom, typescript-eslint, devDependencies (+7 more)

### Community 54 - "Mobile Package"
Cohesion: 0.13
Nodes (15): expo-auth-session, expo-build-properties, expo-constants, expo-router, expo-sqlite, dependencies, expo-auth-session, expo-build-properties (+7 more)

### Community 55 - "Mobile App"
Cohesion: 0.13
Nodes (14): typedRoutes, expo, experiments, icon, name, orientation, scheme, slug (+6 more)

### Community 56 - "Shared Auth"
Cohesion: 0.20
Nodes (4): AuthError, AuthRepository, LoginCredentials, SignUpCredentials

### Community 57 - "Mobile Cards"
Cohesion: 0.15
Nodes (6): CardDetailSheet(), CardDetailSheetProps, DetailRowProps, CardListItem(), CardListItemProps, CreditCard

### Community 58 - "Mobile Tsconfig"
Cohesion: 0.13
Nodes (14): compilerOptions, moduleResolution, noEmit, paths, strict, extends, include, expo-env.d.ts (+6 more)

### Community 59 - "Shared Shared"
Cohesion: 0.20
Nodes (7): getLogger(), initLogger(), _logger, LoggerConfig, LogLevel, TODO: Integrate with error tracking service, Logger

### Community 60 - "Shared Invoice"
Cohesion: 0.26
Nodes (6): InvoiceSavedOption, CreateSavedOptionDto, InvoiceSavedOptionType, SavedOptionType, UpdateSavedOptionDto, SavedOptionRepository

### Community 61 - "Shared Shared"
Cohesion: 0.13
Nodes (8): AesGcmParams, AesKeyGenParams, AlgorithmIdentifier, BufferSource, CryptoKey, KeyUsage, Pbkdf2Params, SubtleCrypto

### Community 62 - "Mobile Claude"
Cohesion: 0.20
Nodes (14): useFriends Hook, useCards Hook, Expo Router File-Based Routing, Protected Route Guard Pattern, TanStack React Query (mobile data fetching), Mobile AuthProvider / useAuth, ExpoSecureStoreAdapter, Auth-Driven Route Restructure (+6 more)

### Community 63 - "Mobile Cards"
Cohesion: 0.15
Nodes (14): CardDetailSheet, CardEncryptionService, CardFormScreen, Luhn Card Number Validation, Cards Mobile UX Adaptation, react-native-quick-crypto Polyfill, NativeWind v4 Styling, Mobile Styling Conventions (+6 more)

### Community 64 - "Shared Grocery"
Cohesion: 0.18
Nodes (5): GroceryListCard(), GroceryListCardProps, GroceryList, GroceryListCard(), GroceryListCardProps

### Community 65 - "Mobile Grocery"
Cohesion: 0.21
Nodes (9): CategoryGroupProps, GroceryItemRow(), GroceryItemRowProps, SessionItemRow(), SessionItemRowProps, Checkbox(), CheckboxProps, ItemRowContent() (+1 more)

### Community 66 - "Mobile Grocery"
Cohesion: 0.26
Nodes (8): getCollapseIcon(), SessionCollapseToggle(), SessionCollapseToggleProps, SessionItemListProps, SessionListGroup(), SessionTabSwitcherProps, CollapseLevel, TabType

### Community 68 - "Web Invoice"
Cohesion: 0.33
Nodes (9): InvoiceGenerator(), useInvoiceFolders(), useInvoiceNumber(), GenerateAndSaveResult, useInvoicePDF(), useInvoices(), useSavedOptions(), getPDFBuildOptions() (+1 more)

### Community 69 - "Mobile Cards"
Cohesion: 0.29
Nodes (8): CardsScreen(), CategoryModalState, SelectedCategoryId, cardsKeys, logger, useCardCategories(), logger, useCards()

### Community 70 - "Shared Invoice"
Cohesion: 0.35
Nodes (4): CreateInvoiceFolderDto, InvoiceFolderType, UpdateInvoiceFolderDto, InvoiceFolderRepository

### Community 71 - "Web Invoice"
Cohesion: 0.22
Nodes (5): InvoiceNumberService, InvoiceFolder, InvoiceFolderType, FolderSettingsDialog(), FolderSettingsDialogProps

### Community 72 - "Shared Storage"
Cohesion: 0.31
Nodes (5): CreateFileDto, FileFilters, FileType, UpdateFileDto, FileRepository

### Community 73 - "Web Invoice"
Cohesion: 0.27
Nodes (8): InvoiceSavedOption, InvoiceSavedOptionType, SavedOptionType, SavedOptionDialog(), SavedOptionDialogProps, TYPE_LABELS, SavedOptionSelectProps, savedOptionKeys

### Community 74 - "Mobile Claude"
Cohesion: 0.18
Nodes (12): Offline Auth Hardening, Client-Generated UUIDs on Create, Grocery Digital Shopping Notebook Redesign, Last-Write-Wins Conflict Resolution, Mobile-Only Offline Sync Architecture, Online-Only Operations Carve-Out, SqliteSyncStorage (expo-sqlite), SyncEngine (push then pull) (+4 more)

### Community 75 - "Mobile Grocery"
Cohesion: 0.23
Nodes (8): FriendsScreen(), FriendPicker(), FriendPickerProps, ShareListModal(), ShareListModalProps, GroceryHeader(), GroceryHeaderProps, useFriends()

### Community 76 - "Shared Passwords"
Cohesion: 0.35
Nodes (4): CategoryType, CreateCategoryDto, UpdateCategoryDto, CategoryRepository

### Community 77 - "Supabase Migrations"
Cohesion: 0.26
Nodes (11): invoice_folders, invoice_saved_options, invoices, auth.users, update_invoice_folder_count(), update_invoice_folder_count_on_delete, update_invoice_folder_count_on_insert, update_invoice_folder_count_on_update (+3 more)

### Community 78 - "Web Claude"
Cohesion: 0.18
Nodes (12): @core Alias Points To src/modules/shared, Dashboard Module (web), Web Path Aliases, rolldown-vite + SWC Build, Settings Module (theme + preferences), Web Technology Stack, cn() Component Styling Pattern, TypeScript Path Aliases (scaffold) (+4 more)

### Community 79 - "Web Src"
Cohesion: 0.27
Nodes (10): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+2 more)

### Community 80 - "Mobile Grocery"
Cohesion: 0.22
Nodes (11): Paper Notebook UI Direction, Friends Screen (/friends route), Grocery Header Friends Entry Point, Broadsheet Token Palette, Checkbox Reskin (highest leverage), GroceryHeader Reskin, GroceryItemRow Reskin, ItemRowContent Reskin (+3 more)

### Community 81 - "Mobile Grocery"
Cohesion: 0.22
Nodes (6): GroceryListCheckedContentProps, EmptyStateType, GroceryListEmptyState(), GroceryListEmptyStateProps, ListsSectionProps, CategoryGroup()

### Community 82 - "Shared Passwords"
Cohesion: 0.29
Nodes (4): Category, CreatePasswordDto, PasswordFilters, UpdatePasswordDto

### Community 83 - "Web Prompts"
Cohesion: 0.20
Nodes (11): VITE_ Prefixed Environment Variables, @himan/web Workspace, Logger Initialization (initLogger), Shared Package Integration, Supabase Client Initialization (initSupabase), Two-Level Folder Hierarchy (spec), Three-Panel Notes Layout (spec), Module Independence (+3 more)

### Community 84 - "Web Package"
Cohesion: 0.18
Nodes (11): scripts, build, deploy, deploy:preview, dev, lint, preview, test (+3 more)

### Community 85 - "Mobile Package"
Cohesion: 0.20
Nodes (9): main, name, private, scripts, android, ios, start, typecheck (+1 more)

### Community 87 - "Web Notes"
Cohesion: 0.20
Nodes (10): ProtectedRoute / PublicRoute Guards, Debounced Auto-Save (spec), Tiptap Rich Text Editor (spec), useFolders Hook (spec), FolderList (left panel), NoteEditor (right panel), NotesPage, RichTextEditor (Tiptap) (+2 more)

### Community 88 - "Web Notes"
Cohesion: 0.24
Nodes (10): Optimistic Updates (spec), Notes Supabase Schema (spec), SupabaseNoteRepository (spec example), useNotes Hook (spec example), Migration 001_create_notes_tables.sql, folders Table, notes Table, NotesList (middle panel) (+2 more)

### Community 89 - "Web Src"
Cohesion: 0.20
Nodes (8): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSubContent, DropdownMenuSubTrigger

### Community 90 - "Mobile Claude"
Cohesion: 0.25
Nodes (9): Himan Personal Productivity Suite, Module Boundary Rule (index.ts public API), npm Workspaces Monorepo Layout, @himan/shared Package (raw .ts subpath exports), Three-Layer Clean Architecture (domain/infrastructure/presentation), Standalone @himan/shared/friends Module Decision, Metro Shared-Package Resolution, Himan Mobile README (stub) (+1 more)

### Community 91 - "Web Package"
Cohesion: 0.22
Nodes (9): clsx, react-hook-form, @tiptap/extension-highlight, dependencies, clsx, date-fns, react-hook-form, @tiptap/extension-highlight (+1 more)

### Community 92 - "Mobile App"
Cohesion: 0.28
Nodes (7): LoginScreen(), plugins, useLogin(), expo-font, expo-sqlite, expo-web-browser, @react-native-google-signin/google-signin

### Community 94 - "Mobile Grocery"
Cohesion: 0.28
Nodes (5): GroceryListCollapseToggle(), GroceryListCollapseToggleProps, GroceryListToGetContentProps, SuggestionChips(), SuggestionChipsProps

### Community 95 - "Mobile Grocery"
Cohesion: 0.36
Nodes (5): AddShopperModalProps, SessionMemberType, SessionPresence, AddShopperDialog(), AddShopperDialogProps

### Community 96 - "Supabase Migrations"
Cohesion: 0.28
Nodes (6): decrement_card_categories_count, decrement_cards_count, increment_card_categories_count, increment_cards_count, decrement_usage_count, increment_usage_count

### Community 97 - "Web Prompts"
Cohesion: 0.28
Nodes (9): Browser-Specific Services Stay In Web, Invoice Generator Module (web), Blank Line Item Filtering, Invoice Calculation Logic, Multi-Currency Formatting (no conversion), Invoice Generator UI Component (spec), Line Items Table, Logo Upload With Preview (+1 more)

### Community 98 - "Web Src"
Cohesion: 0.33
Nodes (4): App(), Router(), ProtectedRoute(), PublicRoute()

### Community 100 - "Mobile Grocery"
Cohesion: 0.29
Nodes (8): Deferred Grocery Non-Goals, Errand Session (GrocerySession), Lists Become Pure Templates, Price Feedback Policy on Session Complete, product_catalog (extended), product_stores Join Table, stores Table, SessionBanner Status Caption

### Community 101 - "Mobile App"
Cohesion: 0.25
Nodes (8): ios, CFBundleURLTypes, ITSAppUsesNonExemptEncryption, appleTeamId, buildNumber, bundleIdentifier, infoPlist, supportsTablet

### Community 102 - "Shared Shared"
Cohesion: 0.50
Nodes (5): initSupabase(), SupabaseConfig, TypedSupabaseClient, Database, Json

### Community 103 - "Web Claude"
Cohesion: 0.29
Nodes (8): Cards Module, Hybrid Local/Remote Offline-First Strategy, HybridNoteRepository, LocalNotesStorage, NoteSyncService, React Query Data Fetching Strategy, Storage Module, SupabaseNoteRepository

### Community 104 - "Web Src"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 105 - "Web Src"
Cohesion: 0.25
Nodes (5): SheetContent, SheetContentProps, SheetDescription, SheetOverlay, SheetTitle

### Community 106 - "Web Settings"
Cohesion: 0.43
Nodes (3): SubscriptionSettingsCard(), ProfilePage(), SettingsPage()

### Community 107 - "Web Shared"
Cohesion: 0.25
Nodes (5): initialState, Theme, ThemeProviderContext, ThemeProviderProps, ThemeProviderState

### Community 108 - "Mobile Cards"
Cohesion: 0.38
Nodes (7): Adding a New Module Recipe, Web Path Alias @core Gotcha, Mobile Cards Module Plan, Mobile Dashboard Quick-Links Grid, CategoryGroup #tag Headers, Passwords CategoryChips, Mobile Passwords Module Plan

### Community 109 - "Mobile Grocery"
Cohesion: 0.38
Nodes (7): FriendPicker Component, AddShopperModal (session membership flow), Friendship as Discovery Layer Only, ShareListModal (list invitation flow), Web-to-RN Grocery Component Mapping, RN Slide-Up Modal Pattern, AddItemInput Reskin

### Community 110 - "Mobile Metro"
Cohesion: 0.29
Nodes (6): config, { getDefaultConfig }, monorepoRoot, path, projectSrc, { withNativeWind }

### Community 111 - "Mobile Passwords"
Cohesion: 0.52
Nodes (3): passwordsKeys, logger, logger

### Community 113 - "Supabase Migrations"
Cohesion: 0.52
Nodes (6): friendships, get_friend_requests(), get_friends(), send_friend_request(), auth.users, update_friendships_updated_at

### Community 114 - "Web Package"
Cohesion: 0.29
Nodes (6): name, overrides, vite, private, type, version

### Community 115 - "Web Src"
Cohesion: 0.29
Nodes (4): DialogContent, DialogDescription, DialogOverlay, DialogTitle

### Community 116 - "Mobile Shared"
Cohesion: 0.33
Nodes (3): AuthProvider(), ExpoSecureStoreAdapter, supabase

### Community 117 - "Mobile Grocery"
Cohesion: 0.53
Nodes (4): CollapseStamp, SessionCategoryGroup(), SessionCategoryGroupProps, SessionListGroupProps

### Community 120 - "Supabase Migrations"
Cohesion: 0.47
Nodes (5): password_categories, passwords, auth.users, update_password_categories_updated_at, update_passwords_updated_at

### Community 121 - "Supabase Migrations"
Cohesion: 0.47
Nodes (5): card_categories, credit_cards, auth.users, update_card_categories_updated_at, update_credit_cards_updated_at

### Community 122 - "Web Notes"
Cohesion: 0.33
Nodes (6): Notes Module (web), Folder Entity, Note Entity, Notes Module Implementation, SupabaseFolderRepository, Notes Module (README)

### Community 123 - "Web Src"
Cohesion: 0.27
Nodes (4): DatePicker(), DatePickerProps, Switch, SwitchProps

### Community 124 - "Mobile App"
Cohesion: 0.40
Nodes (5): backgroundColor, foregroundImage, adaptiveIcon, package, android

### Community 125 - "Mobile App"
Cohesion: 0.40
Nodes (3): FeatherIconName, QuickLink, quickLinks

### Community 126 - "Mobile Package"
Cohesion: 0.40
Nodes (5): devDependencies, @types/react, typescript, @types/react, typescript

### Community 127 - "Web Claude"
Cohesion: 0.40
Nodes (5): Auth Module (web), Passwords Module (client-side AES-GCM), Subscriptions Module (tier + role access), Notes Module Known Limitations, Planned Offline Support Enhancement

### Community 128 - "Web Prompts"
Cohesion: 0.40
Nodes (5): Repository Pattern For Data Access (spec), Dependency Rule (inward only), Framework Agnostic Domain Layer, DTO To Entity Mappers, Dependency Inversion (domain defines interfaces)

### Community 130 - "Mobile App"
Cohesion: 0.50
Nodes (4): projectId, extra, eas, router

### Community 131 - "Mobile App"
Cohesion: 0.50
Nodes (4): splash, backgroundColor, image, resizeMode

### Community 132 - "Web Tsconfig"
Cohesion: 0.50
Nodes (4): DOM, DOM.Iterable, lib, ES2022

### Community 133 - "Web Src"
Cohesion: 0.67
Nodes (3): Button, ButtonProps, buttonVariants

## Ambiguous Edges - Review These
- `Client-Generated UUIDs on Create` → `friendships Table Migration`  [AMBIGUOUS]
  docs/grocery-redesign-plan.md · relation: conceptually_related_to
- `Expo Router File-Based Routing` → `Himan Mobile README (stub)`  [AMBIGUOUS]
  mobile/README.md · relation: conceptually_related_to
- `VITE_ Prefixed Environment Variables` → `Simplified Clean Architecture (Hybrid)`  [AMBIGUOUS]
  web/CLAUDE.md · relation: conceptually_related_to
- `Debounced Auto-Save (spec)` → `Blank Line Item Filtering`  [AMBIGUOUS]
  web/prompts/invoice-generator.md · relation: semantically_similar_to

## Knowledge Gaps
- **522 isolated node(s):** `package`, `expo-router`, `ExpoRouter`, `__routes`, `name` (+517 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **104 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Client-Generated UUIDs on Create` and `friendships Table Migration`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Expo Router File-Based Routing` and `Himan Mobile README (stub)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `VITE_ Prefixed Environment Variables` and `Simplified Clean Architecture (Hybrid)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Debounced Auto-Save (spec)` and `Blank Line Item Filtering`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `getSupabase()` connect `Shared Grocery Invitations` to `Shared Subscriptions Domain`, `Shared Notes Domain`, `Storage & File Handling`, `Mobile App Shell & Auth Context`, `Shared Grocery Domain Types`, `Mobile Sync Op Executor`, `Shared Invoice Generator`, `Shared Grocery`, `Shared Grocery`, `Shared Friends`, `Shared Passwords`, `Shared Cards`, `Shared Cards`, `Shared Storage`, `Shared Grocery`, `Shared Auth`, `Shared Shared`, `Shared Invoice`, `Shared Invoice`, `Shared Storage`, `Shared Passwords`, `Shared Passwords`, `Mobile App`, `Mobile Auth`, `Shared Shared`, `Mobile Shared`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `getLogger()` connect `Shared Shared` to `Shared Notes Domain`, `Shared Passwords`, `Shared Passwords`, `Shared Cards`, `Mobile Cards`, `Shared Invoice`, `Storage & File Handling`, `Shared Storage`, `Mobile App Shell & Auth Context`, `Shared Storage`, `Mobile Passwords`, `Shared Passwords`, `Shared Invoice Generator`, `Shared Invoice`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `expo-router` connect `Mobile Errand Session Screens` to `Mobile Cards`, `Mobile Errand Start & Templates`, `Mobile App`, `Mobile Grocery`, `Mobile App Shell & Auth Context`, `Mobile Product Catalog Screens`, `Mobile Grocery`, `Mobile Cards`, `Mobile App`, `Mobile Shared`, `Mobile Product Edit Dialog`, `Mobile App`, `Mobile App`, `Mobile Grocery`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._