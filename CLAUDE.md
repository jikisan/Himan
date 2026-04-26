# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Himan is a personal productivity suite (notes, password manager, file storage, credit cards, invoice generator, subscriptions, settings). The repo is an **npm workspaces monorepo** with platform-specific apps sharing a common domain layer.

## Repository Structure

```
Himan/
├── packages/shared/         # @himan/shared — framework-agnostic domain + infrastructure
├── web/                     # @himan/web — Vite + React + TypeScript (has its own CLAUDE.md)
├── mobile/                  # @himan/mobile — future React Native app
└── package.json             # root workspace config (workspaces: packages/*, web, mobile)
```

## Commands

```bash
npm install                      # Install all workspaces (MUST run from repo root)
cd web && npm run dev            # Start web dev server
cd web && npm run build          # TypeScript check + Vite build
cd web && npm run lint           # ESLint
cd web && npm run test:run       # Run tests once (Vitest)
cd web && npm test               # Tests in watch mode
cd web && npm run test:coverage  # Tests with coverage
```

## Architecture

### Simplified Clean Architecture

Every feature module follows three layers:

- **Domain** (`domain/`): Pure business logic — entities, types, use cases. No framework imports.
- **Infrastructure** (`infrastructure/`): Supabase repositories, services, mappers. Imports domain only.
- **Presentation** (`presentation/`): UI components, hooks, pages. Platform-specific (web or mobile).

Domain + infrastructure layers live in `packages/shared/` for cross-platform reuse. Each platform app re-exports from `@himan/shared` in its own infrastructure `index.ts` files, keeping path aliases unchanged.

### Module Boundaries

- Each module has an `index.ts` exporting its public API
- Inter-module imports must go through `index.ts` — never import internal paths
- Modules should be independently deletable

### Shared Package (`packages/shared/`)

- Exports raw `.ts` files (no build step) — consumed directly by Vite/Metro bundlers
- **No DOM lib** in tsconfig — catches browser-specific code at compile time
- Web Crypto ambient types in `src/types/crypto.d.ts`
- Modules: auth, notes, passwords, cards, storage, invoice-generator, subscriptions
- Dependencies: `@supabase/supabase-js`, `zod`, `date-fns`

### Supabase Client Pattern

Dependency injection via init/get singletons:
- `initSupabase({ url, anonKey })` — called once at app startup (each platform provides its own env values)
- `getSupabase()` — used by all repositories in the shared package
- Same pattern for Logger: `initLogger({ isDevelopment })` / `getLogger()`

### Backend

- **Supabase**: auth, database, storage, Row-Level Security
- Migrations in `web/supabase/migrations/`

## Adding New Modules

1. Create `packages/shared/src/modules/[name]/` with domain + infrastructure layers
2. Add export entry in `packages/shared/package.json` exports field
3. In each platform app (web, mobile):
   - Create `src/modules/[name]/` with presentation layer + infrastructure re-exports
   - Add path alias to TypeScript and bundler configs
4. Browser-specific services (e.g. ThumbnailService, CompressionService) stay in web, not shared

## Deployment

- **Web**: Cloudflare Pages — root directory `/`, build command `cd web && npm run build`

## Git Workflow

- Main branch: `main`, development branch: `develop`
- Conventional commits: `feat:`, `fix:`, `refactor:`, etc.
- Commit descriptions use proper sentences starting with verbs, one per line (not bullet points)
- Do **not** include AI attribution in commit messages
