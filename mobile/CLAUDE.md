# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Context

This is the `@himan/mobile` workspace in an npm workspaces monorepo. See the root `CLAUDE.md` for overall architecture and shared package details.

**Important**: Run `npm install` from the repo root (not from `mobile/`) to set up workspace symlinks.

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
npx expo run:ios         # Build and run on iOS simulator (native build)
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
- `app/_layout.tsx` — Root Stack navigator
- `app/index.tsx` — Entry redirect
- Route groups use parenthesized folders: `(app)/`, `(auth)/`, `(tabs)/`
- `_layout.tsx` in each group defines its navigator

## Styling Conventions

NativeWind classes matching existing patterns:
- Background: `bg-gray-50` (screens), `bg-white` (cards/containers)
- Borders: `rounded-2xl border border-gray-200`
- Text hierarchy: `text-gray-900` (primary), `text-gray-500` (secondary), `text-gray-400` (muted)
- Accent color: `bg-indigo-600` (buttons/actions)
- SafeAreaView wraps all screens
- KeyboardAvoidingView with `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` for forms

## Key Config Files

- `metro.config.js` — Monorepo watchFolders, NativeWind integration, `.js` → `.ts` resolver for shared package
- `babel.config.js` — `babel-preset-expo` + `nativewind/babel`
- `tailwind.config.js` — NativeWind preset, scans `app/`, `src/`, `components/`
- `app.json` — Expo config (bundle IDs: `com.himan.app`, scheme: `himan`)
