# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**103 library files** across 2 modules

## Web (53 files)

- `web/src/modules/invoice-generator/domain/types/index.ts` — isValidLineItem, generateLineItemId, LineItem, InvoiceData, CurrencyConfig, CurrencyCode, …
- `web/src/modules/subscriptions/domain/constants/tierLimits.ts` — isUnlimited, getLimit, TIER_LIMITS, TIER_NAMES, TIER_DESCRIPTIONS, ROLE_NAMES, …
- `web/src/modules/invoice-generator/presentation/utils/currency.ts` — formatCurrency, getCurrencySymbol, parseCurrencyInput
- `web/src/modules/invoice-generator/presentation/hooks/useInvoiceFolders.ts` — useInvoiceFolders, invoiceFolderKeys
- `web/src/modules/invoice-generator/presentation/utils/pdf.ts` — getPDFOptions, getPDFBuildOptions
- `web/src/modules/notes/presentation/hooks/useEditor.ts` — useEditor, NOTE_CONTENT_MAX_LENGTH
- `web/src/modules/shared/presentation/utils/url.ts` — isSafeUrl, safeOpenUrl
- `web/src/modules/auth/domain/entities/User.ts` — User
- `web/src/modules/auth/infrastructure/api/SupabaseAuthRepository.ts` — SupabaseAuthRepository
- `web/src/modules/auth/presentation/hooks/useAuth.ts` — useAuth
- `web/src/modules/auth/presentation/hooks/useLogin.ts` — useLogin
- `web/src/modules/cards/domain/entities/CardCategory.ts` — CardCategory
- `web/src/modules/cards/domain/entities/CreditCard.ts` — CreditCard
- `web/src/modules/cards/presentation/hooks/useCardCategories.ts` — useCardCategories
- `web/src/modules/cards/presentation/hooks/useCards.ts` — useCards
- `web/src/modules/grocery/presentation/hooks/useGroceryInvitations.ts` — useGroceryInvitations
- `web/src/modules/grocery/presentation/hooks/useGroceryItems.ts` — useGroceryItems
- `web/src/modules/grocery/presentation/hooks/useGroceryLists.ts` — useGroceryLists
- `web/src/modules/grocery/presentation/hooks/useGroceryRealtime.ts` — useGroceryRealtime
- `web/src/modules/grocery/presentation/hooks/useGrocerySession.ts` — useGrocerySession
- `web/src/modules/grocery/presentation/hooks/useProductCatalog.ts` — useProductCatalog
- `web/src/modules/grocery/presentation/hooks/useSuggestions.ts` — useSuggestions
- `web/src/modules/invoice-generator/domain/entities/Invoice.ts` — Invoice
- `web/src/modules/invoice-generator/domain/entities/InvoiceFolder.ts` — InvoiceFolder
- `web/src/modules/invoice-generator/domain/entities/InvoiceSavedOption.ts` — InvoiceSavedOption
- _…and 28 more files_

## Shared (50 files)

- `packages/shared/src/modules/invoice-generator/domain/types/index.ts` — isValidLineItem, generateLineItemId, LineItem, InvoiceData, CurrencyConfig, CurrencyCode, …
- `packages/shared/src/modules/subscriptions/domain/constants/tierLimits.ts` — isUnlimited, getLimit, TIER_LIMITS, TIER_NAMES, TIER_DESCRIPTIONS, ROLE_NAMES, …
- `packages/shared/src/config/supabase.ts` — initSupabase, getSupabase, SupabaseConfig
- `packages/shared/src/services/Logger.ts` — initLogger, getLogger, LoggerConfig
- `packages/shared/src/modules/auth/domain/entities/User.ts` — User
- `packages/shared/src/modules/cards/domain/entities/CardCategory.ts` — CardCategory
- `packages/shared/src/modules/cards/domain/entities/CreditCard.ts` — CreditCard
- `packages/shared/src/modules/cards/infrastructure/repositories/CardCategoryRepository.ts` — CardCategoryRepository
- `packages/shared/src/modules/cards/infrastructure/repositories/CreditCardRepository.ts` — CreditCardRepository
- `packages/shared/src/modules/cards/infrastructure/services/CardEncryptionService.ts` — CardEncryptionService
- `packages/shared/src/modules/grocery/domain/entities/GroceryItem.ts` — GroceryItem
- `packages/shared/src/modules/grocery/domain/entities/GroceryList.ts` — GroceryList
- `packages/shared/src/modules/grocery/domain/entities/GrocerySession.ts` — GrocerySession
- `packages/shared/src/modules/grocery/domain/entities/Product.ts` — Product
- `packages/shared/src/modules/grocery/domain/usecases/SuggestItems.ts` — SuggestItems
- `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryInvitationRepository.ts` — GroceryInvitationRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryItemRepository.ts` — GroceryItemRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/GroceryListRepository.ts` — GroceryListRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/GrocerySessionRepository.ts` — GrocerySessionRepository
- `packages/shared/src/modules/grocery/infrastructure/repositories/ProductCatalogRepository.ts` — ProductCatalogRepository
- `packages/shared/src/modules/grocery/infrastructure/services/GroceryRealtimeService.ts` — GroceryRealtimeService
- `packages/shared/src/modules/invoice-generator/domain/entities/Invoice.ts` — Invoice
- `packages/shared/src/modules/invoice-generator/domain/entities/InvoiceFolder.ts` — InvoiceFolder
- `packages/shared/src/modules/invoice-generator/domain/entities/InvoiceSavedOption.ts` — InvoiceSavedOption
- `packages/shared/src/modules/invoice-generator/infrastructure/repositories/InvoiceFolderRepository.ts` — InvoiceFolderRepository
- _…and 25 more files_

---
_Back to [overview.md](./overview.md)_