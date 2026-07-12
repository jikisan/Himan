# Plan: Implement Grocery Screen (Mobile)

## Context

`mobile/app/(app)/grocery.tsx` is a stub ("coming soon"). Goal: full grocery feature parity with `web/src/modules/grocery/presentation/pages/GroceryPage.tsx`, adapted for React Native/Expo patterns.

Domain + infrastructure already exist in `packages/shared/src/modules/grocery/`. Only need:
1. Mobile infrastructure re-exports
2. Mobile presentation hooks (ported from web, swapping web-specific deps)
3. Mobile UI components (React Native primitives instead of shadcn/web)
4. Screen routes

---

## Navigation Architecture

Use **two separate Expo Router routes** — more idiomatic for mobile than the web's single-screen `mobileView` toggle:

- `app/(app)/grocery.tsx` — **Lists screen**: sidebar equivalent (list of lists + session banner)
- `app/(app)/grocery/[listId].tsx` — **Detail screen**: list items view
- Session view: special state in `grocery.tsx` when `activeSession && selectedListId === null`; tapping "Shopping Session" navigates to `app/(app)/grocery/session.tsx`

Routes:
```
app/(app)/
├── grocery.tsx                 # Lists + active session entry
└── grocery/
    ├── [listId].tsx            # List detail + items
    └── session.tsx             # Active shopping session view
```

---

## Files to Create / Modify

### 1. Package (add dependency)
**Modify**: `mobile/package.json`
- Add `"@tanstack/react-query": "^5.0.0"` to dependencies

### 2. QueryProvider
**Modify**: `mobile/app/(app)/_layout.tsx`
- Wrap `<Stack>` in `<QueryClientProvider client={queryClient}>` where `queryClient = new QueryClient()`
- Import from `@tanstack/react-query`

### 3. Infrastructure re-exports
**Create**: `mobile/src/modules/grocery/infrastructure/index.ts`
```ts
export { GroceryListRepository, GroceryItemRepository, GrocerySessionRepository,
  ProductCatalogRepository, GroceryInvitationRepository, GroceryRealtimeService }
from '@himan/shared/grocery';
```
**Create**: `mobile/src/modules/grocery/domain/index.ts`
```ts
export * from '@himan/shared/grocery';
```

### 4. Hooks (port from web)
**Create**: `mobile/src/modules/grocery/presentation/hooks/`

Port all 7 hooks from `web/src/modules/grocery/presentation/hooks/`. Key substitutions:
- `import { useAuth } from '@auth/presentation/hooks'` → `import { useAuth } from '@/modules/auth/presentation/contexts/AuthContext'`
- `import { Logger } from '@core/...'` → `import { getLogger } from '@himan/shared'`
- `toast.error(...)` → `Alert.alert('Error', message)` (from react-native)
- `import { GroceryListRepository } from '../../infrastructure/...'` → `import { GroceryListRepository } from '@himan/shared/grocery'`
- queryKeys.ts: copy verbatim from web

Files:
- `queryKeys.ts` — copy from web verbatim
- `useGroceryLists.ts`
- `useGroceryItems.ts`
- `useGrocerySession.ts`
- `useProductCatalog.ts`
- `useSuggestions.ts`
- `useGroceryInvitations.ts`
- `useGroceryRealtime.ts`
- `index.ts`

### 5. Components (React Native ports)
**Create**: `mobile/src/modules/grocery/presentation/components/`

| Web Component | Mobile Equivalent | Notes |
|---|---|---|
| `GroceryListCard.tsx` | `GroceryListCard.tsx` | Pressable card, progress bar via View width %, context menu via long-press modal |
| `GroceryItemRow.tsx` | `GroceryItemRow.tsx` | Pressable checkbox, long-press for delete |
| `CategoryGroup.tsx` | `CategoryGroup.tsx` | Collapsible section with Pressable header, simple toggle |
| `AddItemInput.tsx` | `AddItemInput.tsx` | TextInput with suggestions dropdown (ScrollView below input) |
| `SuggestionChips.tsx` | `SuggestionChips.tsx` | ScrollView horizontal with Pressable chips |
| `InvitationBanner.tsx` | `InvitationBanner.tsx` | Pressable banner strip above list |
| `SessionBanner.tsx` | `SessionBanner.tsx` | Session header row with store name, progress, action buttons |
| `SessionItemRow.tsx` | `SessionItemRow.tsx` | Similar to GroceryItemRow, purchase toggle |
| `SessionListGroup.tsx` | `SessionListGroup.tsx` | Grouped by list name |
| `SessionCategoryGroup.tsx` | `SessionCategoryGroup.tsx` | Nested category under list group |
| `ItemDetailSheet.tsx` | `ItemDetailSheet.tsx` | React Native `Modal` slide-up, form inputs |
| `StartSessionDialog.tsx` | `StartSessionModal.tsx` | Modal with list multi-select + store name input |
| `EndShoppingDialog.tsx` | `EndShoppingModal.tsx` | Modal with complete/cancel actions |
| `ShareListDialog.tsx` | `ShareListModal.tsx` | Modal with email input + member list |
| `AddShopperDialog.tsx` | `AddShopperModal.tsx` | Modal with email input + active shoppers list |

All modals: use `<Modal animationType="slide" transparent={true}>` with semi-transparent backdrop.

### 6. Screens

**Replace**: `mobile/app/(app)/grocery.tsx`
- Lists view: renders `FlatList` of `GroceryListCard` items
- Active session banner at top when `activeSession` exists
- `InvitationBanner` for pending invites
- `+` button (Pressable) for create list
- Tapping list → `router.push('/(app)/grocery/' + listId)`
- Tapping session banner → `router.push('/(app)/grocery/session')`
- Inline list creation: TextInput replaces + button when `isCreatingList`
- Archived lists: collapsible section at bottom

**Create**: `mobile/app/(app)/grocery/[listId].tsx`
- Header: list name, member count, Share button
- `FlatList` with `CategoryGroup` sections (unchecked items)
- Checked items section below (collapsible)
- `AddItemInput` pinned near bottom (KeyboardAvoidingView)
- `SuggestionChips` above add input
- Edit item → opens `ItemDetailSheet` modal
- Delete item → Alert.alert confirm
- Back button → `router.back()`

**Create**: `mobile/app/(app)/grocery/session.tsx`
- Session header: `SessionBanner`
- Items grouped: `SessionListGroup` → `SessionCategoryGroup` → `SessionItemRow`
- Ad-hoc add item input at bottom
- Purchased items section (collapsible)

---

## Implementation Sequence

1. **Install package**: add `@tanstack/react-query` to `mobile/package.json`, run `npm install` from root
2. **QueryProvider**: wrap `_layout.tsx` in `QueryClientProvider`
3. **Infrastructure re-exports**: create `mobile/src/modules/grocery/infrastructure/index.ts` + `domain/index.ts`
4. **queryKeys.ts**: copy from web
5. **useGroceryLists**: port + test with stub screen
6. **useGroceryItems**: port
7. **useGrocerySession**: port
8. **useProductCatalog** + **useSuggestions**: port
9. **useGroceryInvitations**: port
10. **useGroceryRealtime**: port
11. **Primitive components**: GroceryListCard, GroceryItemRow, CategoryGroup, AddItemInput, SuggestionChips, InvitationBanner, SessionBanner, SessionItemRow, SessionListGroup, SessionCategoryGroup
12. **Modal components**: ItemDetailSheet, StartSessionModal, EndShoppingModal, ShareListModal, AddShopperModal
13. **Lists screen** (`grocery.tsx`): replace stub
14. **Detail screen** (`grocery/[listId].tsx`)
15. **Session screen** (`grocery/session.tsx`)

---

## Key Implementation Notes

### No `toast` in React Native
Replace all `toast.error()` with:
```ts
import { Alert } from 'react-native';
Alert.alert('Error', 'Failed to ...');
```

### Logger
`getLogger()` from `@himan/shared` should work in mobile (framework-agnostic). Use directly.

### Modal pattern
```tsx
<Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
  <Pressable className="flex-1 bg-black/40" onPress={() => onOpenChange(false)} />
  <View className="bg-white dark:bg-gray-900 rounded-t-2xl p-6">
    {/* content */}
  </View>
</Modal>
```

### Realtime lifecycle in RN
`useGroceryRealtime` uses `useEffect` with cleanup — works identically in RN. Supabase handles reconnection on app foreground automatically.

### QueryClient placement
Add to `app/(app)/_layout.tsx` (protected layout) — grocery screens share same cache. Not root `_layout.tsx` (auth screens don't need it).

### List context menu
Use simple bottom `Modal` with action buttons (rename/archive/delete/leave) on long-press of `GroceryListCard`. Cross-platform, simpler than ActionSheetIOS.

### Progress bar
Web uses CSS width %. Mobile:
```tsx
<View className="h-1 bg-gray-200 rounded-full">
  <View style={{ width: `${progress * 100}%` }} className="h-1 bg-indigo-500 rounded-full" />
</View>
```

### Collapse-all/expand-all
Keep web's `CollapseStamp` pattern (`{ collapsed: boolean, n: number }`) — works identically in RN.

---

## Verification

1. `npm run typecheck` in `mobile/` — no TS errors
2. `npx expo start --ios` — run on simulator
3. Lists screen: create list, rename (inline), archive, delete, see invitation banner
4. Detail screen: add item, check/uncheck, category grouping, suggestions, edit via sheet, delete
5. Session: start session selecting multiple lists, purchase items (real-time across two devices), end/cancel
6. Sharing: invite by email, accept invitation, see shared list, remove member
7. Dark mode: toggle in settings, verify all screens respect dark: classes

---

## Critical Files

| File | Action |
|---|---|
| `mobile/package.json` | Add `@tanstack/react-query` |
| `mobile/app/(app)/_layout.tsx` | Add `QueryClientProvider` |
| `mobile/app/(app)/grocery.tsx` | Replace stub with lists screen |
| `mobile/app/(app)/grocery/[listId].tsx` | Create detail screen |
| `mobile/app/(app)/grocery/session.tsx` | Create session screen |
| `mobile/src/modules/grocery/infrastructure/index.ts` | Re-export from shared |
| `mobile/src/modules/grocery/domain/index.ts` | Re-export from shared |
| `mobile/src/modules/grocery/presentation/hooks/*.ts` | Port all 7 hooks + queryKeys |
| `mobile/src/modules/grocery/presentation/components/*.tsx` | Port all 15 components |
| `packages/shared/src/modules/grocery/` | Read-only — do not modify |
