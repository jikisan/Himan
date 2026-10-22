# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Himan is a personal productivity suite (notes, passwords, file storage, credit cards, invoice generator, grocery lists, subscriptions). The repo is an **npm workspaces monorepo** with platform-specific apps sharing a common domain layer.

## Codebase Map — read this before exploring

`docs/` is an Obsidian vault holding the orientation layer. **Start with `docs/MAP.md`**
(~500 tokens: module table, core abstractions, gotchas, verified plan status), then
`docs/modules/<name>.md` for a specific module's layers, blast radius, routes, and migrations.

For anything deeper, query the knowledge graph rather than reading source files:

```bash
graphify query "how does grocery session sync work?" --budget 1500
graphify path "SyncEngine" "GrocerySessionRepository"   # shortest path between concepts
/graphify . --update                                     # incremental rebuild after changes
```

The graph lives in `graphify-out/` (gitignored): 2,801 nodes, 5,999 edges, 255 communities,
covering all 630 source files, 19 SQL migrations, and the project's design docs.

Note that `docs/` plan documents can lag the code — `docs/MAP.md` carries a verified
status block. Trust the code and the graph over a plan's checkboxes.

## Repository Structure

```
Himan/
├── packages/shared/         # @himan/shared — framework-agnostic domain + infrastructure
├── web/                     # @himan/web — Vite + React + TypeScript (has its own CLAUDE.md)
├── mobile/                  # @himan/mobile — Expo + React Native (has its own CLAUDE.md)
└── package.json             # root workspace config (workspaces: packages/*, web, mobile)
```

## Commands

```bash
# Always install from root
npm install

# Web
cd web && npm run dev            # Start dev server
cd web && npm run build          # TypeScript check + Vite build
cd web && npm run lint           # ESLint
cd web && npm run test:run       # Run tests once (Vitest)
cd web && npm run test:run -- src/path/to/file.test.ts  # Run single test file
cd web && npm test               # Tests in watch mode
cd web && npm run test:coverage  # Tests with coverage

# Mobile (see mobile/CLAUDE.md for full details)
cd mobile && npx expo start      # Start dev server
cd mobile && npm run typecheck   # TypeScript check
```

## Architecture

### Three-Layer Clean Architecture

Every feature module follows:

- **Domain** (`domain/`): Pure business logic — entities, types, use cases. No framework imports.
- **Infrastructure** (`infrastructure/`): Supabase repositories + services. Imports domain only.
- **Presentation** (`presentation/`): React hooks + UI components/pages. Platform-specific.

Domain + infrastructure live in `packages/shared/` for cross-platform reuse. Each platform re-exports from `@himan/shared/<module>` in its own `infrastructure/index.ts`, keeping internal path aliases unchanged.

### Module Boundaries

- Each module has an `index.ts` exporting its public API
- Inter-module imports must go through `index.ts` — never import internal paths directly
- Modules are independently deletable

### Shared Package (`packages/shared/`)

Exports raw `.ts` files (no build step) via subpath exports — consumed directly by Vite and Metro:

```
@himan/shared           # root (initSupabase, getSupabase, initLogger, getLogger)
@himan/shared/auth
@himan/shared/notes
@himan/shared/passwords
@himan/shared/cards
@himan/shared/storage
@himan/shared/invoice-generator
@himan/shared/subscriptions
@himan/shared/grocery
@himan/shared/rentals
@himan/shared/finances
@himan/shared/config
@himan/shared/services
```

- **No DOM lib** in tsconfig — catches browser-specific code at compile time
- Dependencies: `@supabase/supabase-js`, `zod`, `date-fns`
- Browser-specific services (ThumbnailService, CompressionService, InvoicePDFService, LocalNotesStorage) stay in web

### Supabase Client Pattern

Dependency injection via init/get singletons — each platform calls init once at startup:

```ts
// Web (Vite env vars)
initSupabase({ url: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY });

// Mobile (Expo env vars + SecureStore adapter)
initSupabase({ url: process.env.EXPO_PUBLIC_SUPABASE_URL, anonKey: ..., authStorage: ExpoSecureStoreAdapter });
```

All repositories call `getSupabase()` — same pattern applies to Logger (`initLogger` / `getLogger`).

### Web Path Aliases (gotcha)

The `@core` alias maps to `src/modules/shared/` (directory named `shared`, alias named `@core`):
```
@core  → src/modules/shared/    (NOT @shared)
@auth  → src/modules/auth/
@grocery → src/modules/grocery/
... (one alias per module)
```

Mobile uses only `@/*` → `./src/*`.

### Backend

- **Supabase**: auth, database, storage, Row-Level Security on all tables
- Migrations in `supabase/migrations/` (repo root, timestamped SQL files, managed by Supabase CLI)
- RLS policies use `auth.uid()` — every table scoped to authenticated user

## Adding New Modules

1. Create `packages/shared/src/modules/[name]/` with `domain/` + `infrastructure/` layers
2. Add subpath export in `packages/shared/package.json` exports field
3. **Web**: create `web/src/modules/[name]/` with presentation layer + `infrastructure/index.ts` re-exporting from shared; add alias to `vite.config.ts`, `tsconfig.app.json`, `vitest.config.ts`
4. **Mobile**: create `mobile/src/modules/[name]/` same structure; add alias to `tsconfig.json` + Metro config. Active mobile modules: `auth`, `cards`, `grocery`, `shared`

## Deployment

- **Web**: Cloudflare Pages — root directory `/`, build command `cd web && npm run build`

## Git Workflow

- Main branch: `main`, development branch: `develop`
- Conventional commits: `feat:`, `fix:`, `refactor:`, etc.
- Commit descriptions: proper sentences starting with verbs, one per line (not bullet points)
- Do **not** include AI attribution in commit messages
