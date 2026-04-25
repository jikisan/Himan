# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Himan is a personal productivity suite with multiple feature modules (notes, password manager, file storage, credit cards, invoice generator, etc.). The repo is an **npm workspaces monorepo**.

## Repository Structure

```
Himan/
├── packages/shared/        # @himan/shared — framework-agnostic domain + infrastructure code
├── web/                    # @himan/web — Vite + React + TypeScript web app (has its own CLAUDE.md)
├── mobile/                 # @himan/mobile — placeholder for future React Native app
├── package.json            # root workspace config
└── web/supabase/migrations/ # Database migration files
```

### Shared Package (`packages/shared/`)

Contains domain logic and Supabase infrastructure code reusable across web and mobile:
- `src/config/` — Supabase client factory (`initSupabase`/`getSupabase`)
- `src/services/` — Logger factory (`initLogger`/`getLogger`)
- `src/modules/` — Per-module domain (entities, types, usecases) and infrastructure (repositories, services)
- **No DOM lib** — shared tsconfig omits `"DOM"` to catch browser-specific code at compile time
- **No build step** — exports raw `.ts` files, consumed directly by Vite/Metro bundlers
- Web Crypto ambient types in `src/types/crypto.d.ts`

### Supabase Client Pattern

The shared package uses dependency injection for the Supabase client:
- `initSupabase({ url, anonKey })` — called once at app startup (web calls this with `import.meta.env` values)
- `getSupabase()` — used by all repositories in the shared package
- Same pattern for Logger: `initLogger({ isDevelopment })` / `getLogger()`

## Quick Start

```bash
npm install              # Install all workspaces from root
cd web && npm run dev    # Start web dev server
cd web && npm run build  # TypeScript check + Vite build
cd web && npm run lint   # ESLint
cd web && npm run test:run  # Run tests once (Vitest)
```

## Key Architecture

See `web/CLAUDE.md` for detailed web app documentation. Key points:

- **Simplified Clean Architecture** with feature modules under `web/src/modules/`
- Each module has three layers: `domain/` → `infrastructure/` → `presentation/`
- Domain + infrastructure layers are extracted to `packages/shared/` for cross-platform reuse
- Web infrastructure `index.ts` files re-export from `@himan/shared` — path aliases unchanged
- Backend is **Supabase** (auth, database, storage, RLS)
- UI built with **Tailwind CSS v4**, **Radix UI**, and **shadcn/ui** patterns
- Deployment: **Cloudflare Pages** with git integration (root directory must be `/`, build command `cd web && npm run build`)

## Git Workflow

- Main branch: `main`
- Development branch: `develop`
- Commit messages follow conventional commit format (e.g., `feat:`, `fix:`, `refactor:`)
- Do not include AI attribution in commit messages
