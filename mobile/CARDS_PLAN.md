# Plan: Mobile Cards Module

## Context

Cards module exists on web with full CRUD, categories, search, favorites, encrypted storage. Mobile dashboard has a "Coming Soon" placeholder for cards. Goal: implement the Cards feature in mobile, following existing mobile patterns (grocery module), reusing shared package repositories/entities.

## Encryption Compatibility

`CardEncryptionService` uses Web Crypto API (`crypto.subtle` — AES-GCM, PBKDF2). React Native 0.81/Hermes doesn't fully support `crypto.subtle`.

**Solution**: Install `react-native-quick-crypto` — JSI-based polyfill. Import at top of `mobile/app/_layout.tsx` before other imports. Project already uses native builds (`expo run:ios`), so no Expo Go limitation.

Also need `expo-clipboard` for copy-to-clipboard in card detail view.

## File Structure

```
mobile/src/modules/cards/
  domain/index.ts                           # re-export from @himan/shared/cards
  infrastructure/index.ts                   # re-export repos/services from @himan/shared/cards
  presentation/
    hooks/
      index.ts
      queryKeys.ts                          # card query key factory
      useCards.ts                           # CRUD + toggleFavorite, TanStack Query
      useCardCategories.ts                  # category CRUD, TanStack Query
    components/
      index.ts
      CardsHeader.tsx                       # back button, title, search toggle, add button
      CategoryChips.tsx                     # horizontal scroll chips (All, Favorites, categories, +)
      CardListItem.tsx                      # compact card row for FlatList
      CardDetailSheet.tsx                   # modal with full card info, show/hide, copy, actions
      CardFormScreen.tsx                    # reusable full-screen add/edit form
      DeleteCardModal.tsx                   # delete confirmation modal
      CategoryModal.tsx                     # add/edit/delete category modal
      EmptyState.tsx                        # no cards found state

mobile/app/(app)/cards.tsx                  # main cards screen
mobile/app/(app)/cards/add.tsx              # add card (full screen form)
mobile/app/(app)/cards/[cardId].tsx         # edit card (full screen form, prefilled)
```

## Key Design Decisions

### Mobile UX (adapted from web's sidebar+grid)
- **Categories**: Horizontal scrollable chips instead of sidebar (All Cards, Favorites, user categories)
- **Card list**: FlatList of compact card rows (name, masked number, expiry, brand, favorite star, expired badge)
- **Card detail**: Bottom sheet modal (iOS pageSheet style) with show/hide toggles, copy buttons, all fields
- **Add/Edit**: Full-screen form with KeyboardAvoidingView + ScrollView (better than dialog on mobile)
- **FAB**: Floating action button (bottom-right) for quick "Add Card"
- **Category management**: Long-press chip to edit/delete, + chip to add

### Hooks Pattern (mirrors grocery)
- `useCards(filters?)` — React Query, `CreditCardRepository`, `Alert.alert()` on error, `getLogger()`
- `useCardCategories()` — same pattern for `CardCategoryRepository`
- Filter stabilization with `useMemo` on individual filter properties (from web pattern)
- No `useSubscription` checks (mobile doesn't use it yet)

### Form Validation
- Luhn algorithm for card number (copied from web `CardDialog.tsx`)
- CVV: 3-4 digits only
- Required: card name, card number, CVV
- Selects (issuer/type/category/month/year): rendered as selectable chips or modal picker (no third-party picker dep)

## Implementation Order

| Step | What | Files |
|------|------|-------|
| 1 | Install deps + crypto polyfill | `package.json`, `app/_layout.tsx` |
| 2 | Domain + Infrastructure layers | `src/modules/cards/domain/index.ts`, `src/modules/cards/infrastructure/index.ts` |
| 3 | Hooks | `queryKeys.ts`, `useCards.ts`, `useCardCategories.ts`, `index.ts` |
| 4 | Core components | `CardsHeader`, `CategoryChips`, `CardListItem`, `EmptyState` |
| 5 | Main screen + dashboard wiring | `app/(app)/cards.tsx`, update `dashboard.tsx` route |
| 6 | Card detail sheet | `CardDetailSheet.tsx` |
| 7 | Form + routes | `CardFormScreen.tsx`, `cards/add.tsx`, `cards/[cardId].tsx` |
| 8 | Modals | `DeleteCardModal.tsx`, `CategoryModal.tsx` |

## Critical Reference Files

- `packages/shared/src/modules/cards/` — domain types, entities, repos, encryption
- `web/src/modules/cards/presentation/hooks/useCards.ts` — filter stabilization, mutation logic
- `web/src/modules/cards/presentation/components/CardDialog.tsx` — Luhn validation, form fields
- `web/src/modules/cards/presentation/components/CardCard.tsx` — show/hide, copy, detail modal
- `mobile/src/modules/grocery/presentation/hooks/useGroceryLists.ts` — mobile hook pattern
- `mobile/app/(app)/grocery.tsx` — mobile screen structure pattern
- `mobile/app/(app)/_layout.tsx` — Stack navigator (headerShown: false)

## Verification

1. `npm run typecheck` in mobile/ passes
2. Cards load and decrypt correctly on iOS simulator
3. CRUD operations work: add card, edit card, delete card
4. Categories: create, filter by, edit, delete
5. Search filters cards by name/bank/issuer
6. Favorites toggle works
7. Show/hide card number and CVV works
8. Copy to clipboard works
9. Dark mode renders correctly
10. Dashboard quick link navigates to cards screen
