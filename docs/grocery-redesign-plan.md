---
type: plan
area: grocery
status: phase-c-in-progress
created: 2026-08-01
note: "Phases A+B verified shipped 2026-08-30. Migrations live in supabase/migrations/ at repo root, not web/supabase/ as written below."
---

# Grocery & Errand Assistant Redesign — Data Model → Offline Sync → Notebook UI

## Context

Redesign of the grocery module into a "digital shopping notebook": centralized product catalog with per-store info, reusable shopping-list templates, errand sessions, offline-first behavior with background sync to Supabase, and a paper-notebook UI. Confirmed scope decisions:

- **Order**: data model first, then offline sync, then UI redesign (least rework).
- **Lists become pure templates** — checking/purchasing happens only in errand sessions; direct list checking and the purchase→list sync trigger go away.
- **Web must keep compiling** (shared domain is consumed directly by `web/src/modules/grocery`); no web UI redesign.
- **Collaboration preserved** (shared lists/members/invitations/realtime presence), online-only when offline.
- **Mobile-only offline sync** with shared-ready core; **expo-sqlite** cache + outbox; **LWW** conflicts.

## What already exists (reuse, don't rebuild)

- `GrocerySession` = "errand" (active/completed/cancel, free-text `storeName`, snapshot items, `addSessionItem` = temporary items, multi-list via `listName` on session items) — `packages/shared/src/modules/grocery/`
- Collaboration: `grocery_list_members`, `grocery_invitations`, `GroceryRealtimeService` (postgres_changes + presence)
- Suggestions: `SuggestItems` usecase (running_low / frequently_bought / recently_bought)
- Purchase tracking triggers: `update_product_on_check`, `purchase_count`/`last_purchased_at` on `product_catalog`
- Auth persistence: chunked SecureStore adapter, supabase-js default `persistSession`/`autoRefreshToken`
- React Query v5 in mobile hooks; `queryKeys.ts`; existing optimistic pattern in `useGroceryItems.checkItem`

---

## Phase A — Data model & domain redesign

### Schema (new migrations in `web/supabase/migrations/`, RLS on everything via `auth.uid()`)

1. **`stores`** (new): `id, user_id, name, created_at, updated_at`. Backfill from distinct `grocery_sessions.store_name`. Keep `store_name` text on sessions during transition; add `store_id` FK (nullable).
2. **`product_stores`** (new): `id, product_id, store_id, price numeric, aisle text, availability boolean, sku text, updated_at`. Unique (product_id, store_id).
3. **`product_catalog`** extend: `brand, barcode, package_size, image_path, notes, is_favorite boolean default false`. Keep existing `default_quantity/default_unit/lifespan_days/purchase_count/last_purchased_at`.
4. **Lists → templates**: keep tables `grocery_lists`/`grocery_items` (avoids breaking web + collaboration FKs). Drop usage of `is_checked/checked_by/checked_at` in the new model; remove/replace trigger `sync_grocery_item_on_session_purchase`. `grocery_items` gains `product_id` already exists — keep; add `sort_order` already exists.
5. **Sessions → errands** extend: `name text` (e.g. "Weekend Shopping"), `store_id` FK nullable, `status` add `'paused'`? — no: "Resume Later" = stays `active`; keep `active|completed` + cancel (delete). Add `updated_at` + trigger (needed for sync anyway).
6. **`grocery_session_items`** extend: `price_paid numeric, quantity_purchased numeric, aisle text, store_id nullable, category` (exists), `updated_at` + trigger. Purchase-edit dialog writes here.
7. **Price feedback policy**: on session complete, upsert `product_stores` (price = last price_paid, aisle) for catalog-linked items — server-side function or client-side in repository `complete()`. Temporary items (no `product_id`) never touch catalog (spec requirement).
8. **Categories**: keep free text + a fixed suggested list w/ color mapping in domain (`domain/types` constant) — no schema change; colors are presentation.
9. **Currency**: user preference (default ₱), stored in a `user_preferences` table (new, also caches other prefs) — display only, prices stored as numeric.

### Domain (`packages/shared/src/modules/grocery/domain/`)

- New/updated entities: `Store`, `ProductStore`, extended `Product`, `GroceryList` (template semantics: drop checked counts, keep memberCount/itemCount), `GrocerySession` (+name, storeId, totals getters: estimatedTotal from product_stores, actualTotal from price_paid), extended `SessionItemType`.
- New DTOs + filters (price-range, favorite, barcode search).
- Repositories: new `StoreRepository`, `ProductStoreRepository` (or fold into `ProductCatalogRepository`); extend `GrocerySessionRepository` (import multiple lists on create — already snapshots; add name/store), `ProductCatalogRepository` (barcode/brand search, favorite toggle).
- **Web compatibility**: update `web/src/modules/grocery` usages of removed fields (checked state on lists) minimally — swap list check UI to read-only or route through sessions; goal is compile + basic function, not redesign. Run web build/tests to verify.

## Phase B — Offline sync (previous plan, on new schema)

Architecture (details validated earlier):

```
packages/shared/src/modules/grocery/domain/sync/
  SyncTypes.ts   # PendingOp {opId uuid, type, entity, payload, baseUpdatedAt, createdAt}
  SyncQueue.ts   # ordered outbox: enqueue/peek/markDone/markFailed, coalescing
  SyncEngine.ts  # push (drain via repositories) → pull (delta by updated_at) → reseed RQ cache
  SyncStorage.ts # storage interface (platform-agnostic, no RN/DOM imports)
mobile/src/modules/grocery/infrastructure/SqliteSyncStorage.ts   # expo-sqlite outbox+cache
mobile/src/modules/shared/infrastructure/network/NetworkProvider.tsx  # NetInfo → RQ onlineManager + drain trigger
```

- **Auth hardening**: AppState → `startAutoRefresh()/stopAutoRefresh()` in `mobile/src/modules/shared/infrastructure/config/supabase.ts`; `AuthContext.tsx` treats network errors during refresh as "offline, still authed" — sign out only on invalid-refresh-token.
- **Read path**: `@tanstack/react-query-persist-client` + persister for cold-start hydration (catalog, stores, templates, errands, history, preferences). Repos stay remote-only.
- **Write path**: all grocery mutations optimistic (extend existing `checkItem` onMutate pattern) + enqueue to outbox. Client-generated UUIDs on creates (add `id?` to Create DTOs) so dependent offline ops need no remapping.
- **Sync**: drain on reconnect + foreground; exponential backoff; 4xx → drop + surface, network error → retain; pull after push reconciles DB-trigger side effects and other devices; LWW via `updated_at` (Phase A adds missing columns).
- **Online-only**: invitations, member management, `findUserByEmail` RPC — disabled offline with hint.
- **Product images**: upload deferred while offline (queue op); display via local file cache (expo-file-system) — image picker/upload itself is part of Phase A catalog work.
- **Sync status UI**: context store `synced | syncing | offline-pending(n) | error`; badge + tap-to-retry.

## Phase C — Notebook UI redesign (mobile)

Use `frontend-design` / `ui-ux-pro-max` skills when executing. NativeWind v4 + reanimated ~4.3 already installed.

- Design system: paper texture background, ruled-line list rows, handwritten-style display font for headers (expo-font), sticky-note notes, colored category chips, soft shadows, rounded cards, large touch targets, one-hand reach (bottom actions).
- Key screens: Catalog (search: name/brand/barcode/partial + recent; per-store price/aisle display), Templates (create/reorder/duplicate/rename; inline "Create New Product" when search misses), Errand session (big tap-to-purchase rows with strike-through + checkbox animation via reanimated; purchase-edit sheet: price/qty/store/aisle/notes/category; running estimated vs actual total), History (day-grouped, totals, duplicate/reuse), sort/filter (alphabetical/aisle/category/store/price/purchased/favorites).
- Dark mode variant preserving notebook aesthetic.
- Sync badge integrated into header.

## Deferred (explicit non-goals now)

Barcode scanner hardware integration, voice input, spending analytics dashboards, import/export, price-comparison views, auto aisle grouping — schema supports all (barcode, product_stores, history); build later.

## Critical files

- Migrations: `web/supabase/migrations/<ts>_*.sql` (stores, product_stores, catalog fields, session columns, updated_at triggers, drop purchase-sync trigger, user_preferences, realtime publication additions)
- `packages/shared/src/modules/grocery/domain/{types,entities}/*`, `infrastructure/repositories/*`, new `domain/sync/*`
- `mobile/src/modules/grocery/presentation/hooks/*` (all), `mobile/app/(app)/grocery*`
- `mobile/src/modules/auth/presentation/contexts/AuthContext.tsx`, `mobile/src/modules/shared/infrastructure/config/supabase.ts`, `mobile/app/(app)/_layout.tsx`
- `web/src/modules/grocery/**` — minimal compile fixes only

## Verification

- Per phase: `cd mobile && npm run typecheck`; `cd web && npm run build && npm run test:run` (shared touched every phase).
- Shared unit tests: sync queue ordering/coalescing/idempotency, totals getters, suggestion logic against new schema.
- Manual (device/simulator): full errand flow online; airplane-mode flow (relaunch → cached data + session survives → create errand, purchase items, complete → pending badge → reconnect → drain → rows in Supabase, second device gets realtime); LWW conflict test across two devices; template import into errand; temporary item does not enter catalog; price-paid updates product_stores on completion.
- SQL migration dry-run on local Supabase before applying.
