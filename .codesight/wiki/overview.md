# Himan — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**Himan** is a typescript project built with swiftui, organized as a monorepo.

**Workspaces:** `@himan/shared` (`packages/shared`), `@himan/web` (`web`), `@himan/mobile` (`mobile`), `ios` (`ios`), `Himan.xcodeproj` (`ios/Himan.xcodeproj`)

## Scale

21 database models · 91 UI components · 103 library files · 2 middleware layers · 4 environment variables

**Database:** unknown, 21 models — see [database.md](./database.md)

**UI:** 91 components (react) — see [ui.md](./ui.md)

**Libraries:** 103 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `web/src/modules/grocery/domain/index.ts` — imported by **24** files
- `packages/shared/src/config/index.ts` — imported by **21** files
- `packages/shared/src/services/index.ts` — imported by **13** files
- `web/src/modules/storage/domain/entities/index.ts` — imported by **12** files
- `web/src/modules/passwords/domain/index.ts` — imported by **10** files
- `web/src/modules/invoice-generator/domain/types/index.ts` — imported by **8** files

## Required Environment Variables

- `DEV` — `web/src/modules/shared/infrastructure/services/Logger.ts`

---
_Back to [index.md](./index.md) · Generated 2026-04-29_