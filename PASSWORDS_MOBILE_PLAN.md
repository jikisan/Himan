# Passwords Mobile Implementation Plan

## Context

Port the web `PasswordsPage.tsx` password manager to mobile. Follow the **cards module** as the reference implementation. Passwords use client-side AES-GCM encryption via shared `EncryptionService` — `react-native-quick-crypto` already installed (see `app/_layout.tsx`).

Also adds safe area inset rules to `mobile/CLAUDE.md`.

---

## File Structure

```
mobile/src/modules/passwords/
├── domain/
│   └── index.ts
├── infrastructure/
│   └── index.ts
└── presentation/
    ├── hooks/
    │   ├── index.ts
    │   ├── queryKeys.ts
    │   ├── usePasswords.ts
    │   └── usePasswordCategories.ts
    └── components/
        ├── index.ts
        ├── PasswordListItem.tsx
        ├── PasswordDetailSheet.tsx
        ├── PasswordsHeader.tsx
        ├── CategoryChips.tsx
        ├── CategoryModal.tsx
        ├── DeletePasswordModal.tsx
        ├── PasswordFormScreen.tsx
        └── EmptyState.tsx

mobile/app/(app)/
├── passwords.tsx                  # Main list screen
└── passwords/
    ├── add.tsx                    # → PasswordFormScreen (create mode)
    └── [passwordId].tsx           # → PasswordFormScreen (edit mode)
```

---

## Part 1: CLAUDE.md Inset Rules

Add to `mobile/CLAUDE.md` after **Styling Conventions**:

```markdown
## Safe Area Insets

Always use `useSafeAreaInsets()` from `react-native-safe-area-context`. Never hardcode device-specific spacing.

| Scenario | Pattern |
|---|---|
| Full screen | `<SafeAreaView className="flex-1">` — handles all sides automatically |
| Bottom sheet footer | `paddingBottom: Math.max(insets.bottom, 24)` |
| Bottom sheet ScrollView | `contentContainerStyle={{ paddingBottom: insets.bottom }}` |
| FAB / floating button | `bottom: 24 + insets.bottom, right: 16` (inline style) |
| Top toast / overlay | `paddingTop: insets.top + 10` on absolutely-positioned container |
| Keyboard + form | `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>` inside SafeAreaView |
```

---

## Part 2: Domain & Infrastructure (thin re-exports)

### `domain/index.ts`
```typescript
export * from '@himan/shared/passwords';
```

### `infrastructure/index.ts`
```typescript
export { PasswordRepository, CategoryRepository, EncryptionService } from '@himan/shared/passwords';
```

---

## Part 3: Hooks

### `queryKeys.ts`
```typescript
export const passwordsKeys = {
  all: ['passwords'] as const,
  passwords: (filters?: object) => [...passwordsKeys.all, 'list', filters] as const,
  categories: () => [...passwordsKeys.all, 'categories'] as const,
};
```

### `usePasswords.ts`
Mirror `useCards.ts`:
- `useQuery` → `PasswordRepository.findAll(filters, userId)`
- Mutations: `createPassword`, `updatePassword`, `deletePassword`, `toggleFavorite`
- All mutations invalidate `passwordsKeys.passwords()`
- Filters shape: `{ categoryId?: string | null, searchQuery?: string, isFavorite?: boolean }`
- Errors via `Alert.alert` + `getLogger().error()`

### `usePasswordCategories.ts`
Mirror `useCardCategories.ts`:
- `useQuery` → `CategoryRepository.findAll(userId)`
- Mutations: `createCategory`, `updateCategory`, `deleteCategory`
- `deleteCategory` also invalidates `passwordsKeys.passwords()` (passwords lose their category ref)

---

## Part 4: Components

### `PasswordsHeader.tsx`
Copy `CardsHeader.tsx` structure:
- Back button + "Passwords" title + search toggle icon + add (+) button
- Animated search field slides in below header when search is open
- `useColorScheme()` for dark mode icon tinting

### `CategoryChips.tsx`
Copy `cards/CategoryChips.tsx`, swap `CardCategoryType` → `CategoryType`:
- Chips: "All" · "Favorites" (⭐) · each category (long-press to edit) · "+ Add" (dashed)
- Selected: `bg-indigo-500 border-indigo-500 text-white`
- Unselected: `bg-white dark:bg-gray-800 border-gray-200`

### `PasswordListItem.tsx`
```
┌─ Pressable (tap → open detail sheet) ──────────────────────┐
│ [🔑]  Title                                    [★ fav]     │
│       username / email                                      │
│       example.com  (getDisplayUrl())                        │
├─ Action Row ────────────────────────────────────────────────┤
│ [Copy] Copy Username        |     [Copy] Copy Password      │
└─────────────────────────────────────────────────────────────┘
```
- Password always shows `••••••••` in list (never revealed here)
- Copy uses `Clipboard.setStringAsync` (expo-clipboard)
- `onCopied(label: string)` callback → triggers toast in parent
- Styling: `bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700`

### `PasswordDetailSheet.tsx`
Bottom sheet — mirror `CardDetailSheet.tsx`:
```
┌─ Drag Handle ─────────────────────────────────────────────┐
├─ Header: Title  [★]  [✕] ─────────────────────────────────┤
├─ ScrollView  contentContainerStyle={paddingBottom: bottom} ┤
│  Username     ············  [Copy]                         │
│  Password     ············  [👁]  [Copy]                   │
│  URL          example.com   [Copy]  [Open ↗]              │
│  Category     Work / Uncategorized                         │
│  Notes        (if present)                                 │
│  Updated      2 hours ago                                  │
├─ Footer  paddingBottom: Math.max(bottom, 24) ─────────────┤
│  [Delete]                                  [Edit]          │
└───────────────────────────────────────────────────────────┘
```
- Password masked by default; eye toggle reveals plaintext
- URL open: `Linking.openURL` guarded by `isValidUrl()`
- `useSafeAreaInsets().bottom` for footer padding
- Max height 88% of screen

### `PasswordFormScreen.tsx`
Full-screen add/edit form:
```
[<]  Add / Edit Password               [Save]
─────────────────────────────────────────────
Title *
Username
Password *   [👁]  [⚡ Generate]
URL
Notes  (multiline)
Category: [None] [Cat1] [Cat2 …]  (chip row)
[★] Mark as favorite
```
- Password generator: port web's rejection-sampling `crypto.getRandomValues` approach
  (16 chars, upper + lower + digits + symbols, no modulo bias)
  — `react-native-quick-crypto` polyfills `crypto` globally
- Validation: title required, password required
- Edit mode: receives `passwordId` prop, fetches from repo on mount
- Layout: `SafeAreaView` → `KeyboardAvoidingView` → `ScrollView` (same as `CardFormScreen`)

### `CategoryModal.tsx`
Copy `cards/CategoryModal.tsx` directly — no changes needed.

### `DeletePasswordModal.tsx`
Copy `cards/DeleteCardModal.tsx`, change:
- Icon: `lock` instead of `credit-card`
- Title: `"Delete Password"`
- Body: `Are you sure you want to delete "${password?.title}"? This cannot be undone.`

### `EmptyState.tsx`
```typescript
props: { hasSearch: boolean, onAdd: () => void }
```
- Search active: `"No passwords found — Try a different search or category"`
- Default: `"No passwords yet — Add your first password to get started"`
- Add button only in default state

---

## Part 5: Main Screen (`passwords.tsx`)

Mirror `app/(app)/cards.tsx`:

```typescript
// State
const [selectedCategoryId, setSelectedCategoryId] = useState<'all' | 'favorites' | string | null>('all');
const [searchQuery, setSearchQuery] = useState('');
const [isSearchOpen, setIsSearchOpen] = useState(false);
const [selectedPassword, setSelectedPassword] = useState<PasswordType | null>(null);
const [passwordToDelete, setPasswordToDelete] = useState<PasswordType | null>(null);
const [categoryModal, setCategoryModal] = useState<CategoryModalState>(null);

// Client-side filtering (categoryId + isFavorite + search on title/username/url)
const filtered = useMemo(() => { ... }, [allPasswords, selectedCategoryId, searchQuery]);

// Layout
<SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
  <PasswordsHeader ... />
  <CategoryChips ... />
  <FlatList data={filtered} renderItem={({ item }) => <PasswordListItem ... />} />

  {/* FAB */}
  <Pressable
    onPress={() => router.push('/(app)/passwords/add')}
    style={{ position: 'absolute', bottom: 24 + insets.bottom, right: 16 }}
    className="w-14 h-14 bg-indigo-600 rounded-full items-center justify-center shadow-lg"
  >
    <Plus color="white" size={24} />
  </Pressable>

  <PasswordDetailSheet ... />
  <DeletePasswordModal ... />
  <CategoryModal ... />
  <ToastView />
</SafeAreaView>
```

---

## Part 6: Route Files

### `passwords/add.tsx`
```typescript
import { PasswordFormScreen } from '@/modules/passwords/presentation/components';
export default function AddPasswordScreen() {
  return <PasswordFormScreen />;
}
```

### `passwords/[passwordId].tsx`
```typescript
import { useLocalSearchParams } from 'expo-router';
import { PasswordFormScreen } from '@/modules/passwords/presentation/components';
export default function EditPasswordScreen() {
  const { passwordId } = useLocalSearchParams<{ passwordId: string }>();
  return <PasswordFormScreen passwordId={passwordId} />;
}
```

---

## Part 7: Dashboard Integration

`mobile/app/(app)/dashboard.tsx` — add Passwords entry to quick-links grid, same pattern as existing Cards entry.

---

## Build Order

1. `mobile/CLAUDE.md` — add Safe Area Insets section
2. `domain/index.ts` + `infrastructure/index.ts`
3. `queryKeys.ts` → `usePasswordCategories.ts` → `usePasswords.ts`
4. `EmptyState.tsx` + `CategoryModal.tsx` + `DeletePasswordModal.tsx`
5. `CategoryChips.tsx`
6. `PasswordsHeader.tsx`
7. `PasswordListItem.tsx`
8. `PasswordDetailSheet.tsx`
9. `PasswordFormScreen.tsx` (most complex)
10. `passwords.tsx` main screen
11. `passwords/add.tsx` + `passwords/[passwordId].tsx`
12. Dashboard integration

---

## Key Reference Files

| What | Where |
|---|---|
| Bottom sheet pattern | `mobile/src/modules/cards/presentation/components/CardDetailSheet.tsx` |
| Form + keyboard pattern | `mobile/src/modules/cards/presentation/components/CardFormScreen.tsx` |
| TanStack Query hooks | `mobile/src/modules/cards/presentation/hooks/useCards.ts` |
| Main screen structure | `mobile/app/(app)/cards.tsx` |
| Shared repository | `packages/shared/src/modules/passwords/infrastructure/repositories/PasswordRepository.ts` |
| Shared encryption | `packages/shared/src/modules/passwords/infrastructure/services/EncryptionService.ts` |
| Web UI reference | `web/src/modules/passwords/presentation/pages/PasswordsPage.tsx` |

---

## Verification

```bash
cd mobile && npm run typecheck   # zero errors
npx expo start --ios
```

- Create password → appears in list
- Copy username/password → toast fires
- Open detail sheet → password masked, eye reveals
- Edit → form pre-populated
- Delete → confirm modal → removed
- Category CRUD → chips update, filtering works
- Search → live filter on title / username / url
- Favorites chip → filters correctly
- Dark mode → all components adapt
