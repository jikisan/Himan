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
