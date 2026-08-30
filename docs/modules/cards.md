---
type: module
area: cards
platforms: [mobile, shared, web]
status: active
---

# cards

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 46 source files · 152 graph nodes
**Import path:** `@himan/shared/cards`

## Where it lives

- **shared** — `packages/shared/src/modules/cards/` (12 files)
- **web** — `web/src/modules/cards/` (19 files)
- **mobile** — `mobile/src/modules/cards/` (15 files)

## Key types & classes

`CardCategory`, `CreditCard`, `CreditCardFilters`, `CreditCardType`, `UpdateCreditCardDto`, `CardCategoryType`, `CreateCardCategoryDto`, `UpdateCardCategoryDto`, `CreateCreditCardDto`, `CardCategoryRepository`, `CreditCardRepository`, `CardEncryptionService`, `CardCardProps`, `CardCategoryListProps`, `CardDialogProps`, `CardGridProps`, `CardDetailSheetProps`, `DetailRowProps`, `FormData`, `CardListItemProps`, `CardsHeaderProps`, `CategoryChipsProps`, `ChipProps`, `SelectedCategoryId`

## Blast radius

_Changing these breaks the most callers:_

- `packages/shared/src/modules/cards/index.ts` — imported by **14**
- `web/src/modules/cards/domain/index.ts` — imported by **8**
- `mobile/src/modules/cards/presentation/hooks/queryKeys.ts` — imported by **4**
- `packages/shared/src/modules/cards/domain/index.ts` — imported by **3**
- `packages/shared/src/modules/cards/domain/types/index.ts` — imported by **3**
- `web/src/modules/cards/domain/types/index.ts` — imported by **3**

## Mobile routes

- `mobile/app/(app)/cards/[cardId].tsx`
- `mobile/app/(app)/cards/add.tsx`
- `mobile/app/(app)/cards.tsx`

## Migrations

- `20260108000000_create_cards_tables.sql`
- `20260108000001_add_cards_usage_tracking.sql`
- `20260108000002_remove_cards_balance_fields.sql`

---
[[MAP|← back to MAP]]
