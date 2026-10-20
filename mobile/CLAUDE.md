# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Context

This is the `@himan/mobile` workspace in an npm workspaces monorepo. See the root `CLAUDE.md` for overall architecture and shared package details.

**Important**: Run `npm install` from the repo root (not from `mobile/`) to set up workspace symlinks.

**After `npx expo install`** (or any install with a newer local npm), run `npx npm@10 install --package-lock-only --ignore-scripts`
from the repo root before committing. npm 11 drops the nested `mobile/node_modules/@types/react` entry from the lockfile and CI's
`npm ci` (npm 10) then fails with "Missing: @types/react@19.1.17 from lock file".

### Shared Package Integration

- Metro config resolves `@himan/shared` subpath imports and remaps `.js` → `.ts` extensions for shared package internals
- `config.resolver.unstable_enablePackageExports = true` required for subpath imports
- Supabase credentials via `EXPO_PUBLIC_` prefixed env vars in `.env`

## Commands

```bash
npx expo start           # Start dev server (press i for iOS, a for Android)
npx expo start --ios     # Start with iOS simulator directly
npx expo start --android # Start with Android emulator directly
npm run typecheck        # TypeScript check (tsc --noEmit)
npx expo prebuild        # Generate native ios/ and android/ directories
npx expo prebuild --clean  # Regenerate native dirs (wipes existing ios/ android/)
npx expo run:ios         # Build and run on iOS simulator (native build)
npx expo run:android --device  # Build and run on Android device/emulator (native build)
npx expo start --clear   # Start dev server with cleared Metro cache
npx expo install         # Install Expo-compatible package versions
npx expo doctor          # Check for config/dependency issues
eas build --platform android --profile preview --local  # Build APK locally
eas build --platform android --profile production --local  # Build AAB locally (Play Store)
eas build --platform ios --profile preview --local  # Build IPA locally
eas build --platform all --profile production  # Build both platforms on EAS cloud
```

## Technology Stack

- **Framework**: Expo SDK 54 + React Native 0.81 + React 19
- **Routing**: Expo Router v6 — file-based routing in `app/` directory
- **Styling**: NativeWind v4 (Tailwind CSS for React Native via `className` props)
- **Navigation**: React Native Screens + Gesture Handler + Reanimated
- **Secure Storage**: expo-secure-store (for auth tokens)
- **Deep Linking**: scheme `himan://`
- **Typed Routes**: `experiments.typedRoutes: true` in app.json — routes are type-checked

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → `./src/*`

When adding new aliases, update both `tsconfig.json` and Metro config.

## Routing Structure

Expo Router uses file-based routing from `app/` directory:
- `app/_layout.tsx` — Root Stack navigator with `AuthProvider`
- `app/index.tsx` — Entry redirect (auth check)
- `app/(auth)/` — Public routes (login)
- `app/(app)/` — Protected routes; `_layout.tsx` wraps with `ThemeProvider` + auth guard
- `_layout.tsx` in each group defines its navigator

Protected route guard pattern in `app/(app)/_layout.tsx`:
```tsx
const { user, loading } = useAuth();
if (loading) return null;
if (!user) return <Redirect href="/(auth)/login" />;
```

## Data Fetching

**TanStack React Query** — same patterns as web. Grocery hooks in `src/modules/grocery/presentation/hooks/`.

**Realtime** — `GroceryRealtimeService` (from `@himan/shared/grocery`) subscribes to Supabase postgres_changes and invalidates React Query cache. `useGroceryRealtime` wraps all subscriptions (items, sessions, session items). Presence tracking via Supabase Presence channels — active shoppers in a session tracked with `userId`, `displayName`, `onlineAt`.

## Modules

Active feature modules under `src/modules/`:

### `auth/`
Supabase auth, Google OAuth, session management.

### `shared/`
Supabase init with SecureStore adapter, shared config.

### `grocery/`
Realtime collaborative shopping. Components split into four groups:
- `GroceryList/` — list management (create, rename, tab between to-get/checked)
- `Main/` — item browsing, category grouping, inline add, suggestion chips, item detail sheet
- `Session/` — active shopping session UI; participants (presence), session item rows, start/end modals
- `Invitation/` — share list, accept/decline invitations

Hooks: `useGroceryLists`, `useGroceryItems`, `useGrocerySession`, `useGroceryRealtime`, `useGroceryInvitations`, `useGroceryScreenHandlers`, `useSuggestions`.

## Styling Conventions

NativeWind classes matching existing patterns:
- Background: `bg-gray-50` (screens), `bg-white` (cards/containers)
- Borders: `rounded-2xl border border-gray-200`
- Text hierarchy: `text-gray-900` (primary), `text-gray-500` (secondary), `text-gray-400` (muted)
- Accent color: `bg-indigo-600` (buttons/actions)
- SafeAreaView wraps all screens
- KeyboardAvoidingView with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` for forms

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

## Key Config Files

- `metro.config.js` — Monorepo watchFolders, NativeWind integration, `.js` → `.ts` resolver for shared package
- `babel.config.js` — `babel-preset-expo` + `nativewind/babel`
- `tailwind.config.js` — NativeWind preset, scans `app/`, `src/`, `components/`
- `app.json` — Expo config (bundle IDs: `com.himan.app`, scheme: `himan`)
