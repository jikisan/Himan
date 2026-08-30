---
type: module
area: grocery
platforms: [mobile, shared, web]
status: active
---

# grocery

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 188 source files · 682 graph nodes
**Import path:** `@himan/shared/grocery`

## Where it lives

- **shared** — `packages/shared/src/modules/grocery/` (30 files)
- **web** — `web/src/modules/grocery/` (37 files)
- **mobile** — `mobile/src/modules/grocery/` (121 files)

## Key types & classes

`SuggestedCategory`, `GroceryItem`, `GroceryList`, `GrocerySession`, `Product`, `ProductStore`, `Store`, `OpExecutor`, `RetryClassifier`, `SyncEngine`, `SyncEngineOptions`, `EnqueueInput`, `SyncQueue`, `InMemorySyncStorage`, `SyncStorage`, `DroppedOp`, `PendingOp`, `PushResult`, `SyncEntity`, `SyncOpType`, `SyncStatus`, `CreateGroceryItemDto`, `ItemSuggestion`, `SessionItemType`

## Blast radius

_Changing these breaks the most callers:_

- `packages/shared/src/modules/grocery/index.ts` — imported by **58**
- `mobile/src/modules/grocery/presentation/theme/notebook.ts` — imported by **42**
- `packages/shared/src/modules/grocery/domain/types/index.ts` — imported by **38**
- `web/src/modules/grocery/domain/index.ts` — imported by **21**
- `mobile/src/modules/grocery/presentation/components/notebook/index.ts` — imported by **19**
- `mobile/src/modules/grocery/presentation/hooks/queryKeys.ts` — imported by **15**

## Mobile routes

- `mobile/app/(app)/grocery/[listId].tsx`
- `mobile/app/(app)/grocery/catalog/[productId]/edit.tsx`
- `mobile/app/(app)/grocery/catalog/[productId]/index.tsx`
- `mobile/app/(app)/grocery/catalog/index.tsx`
- `mobile/app/(app)/grocery/history.tsx`
- `mobile/app/(app)/grocery/session.tsx`
- `mobile/app/(app)/grocery/templates.tsx`
- `mobile/app/(app)/grocery.tsx`

## Migrations

- `20260426000000_create_grocery_tables.sql`
- `20260427000001_seed_grocery_data.sql`
- `20260427000002_fix_grocery_list_members_rls.sql`
- `20260731000000_grocery_redesign_phase_a.sql`
- `20260814000000_add_grocery_list_members_with_email_rpc.sql`
- `20260814000001_add_display_name_to_grocery_list_members_rpc.sql`
- `20260814000002_add_aisle_to_product_stores.sql`

## Related notes

[[grocery-redesign-plan]] · [[bugs]]

---
[[MAP|← back to MAP]]
