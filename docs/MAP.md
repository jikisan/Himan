---
type: map
area: himan
status: current
---

# Himan — Map

> **Read this first.** It is the cheap orientation layer. For anything deeper, query the
> graph instead of reading source: `graphify query "your question" --budget 1500`.

Personal productivity suite — notes, passwords, file storage, credit cards, invoice
generator, grocery lists, subscriptions. npm workspaces monorepo, Supabase backend.

## Architecture in three lines

- **Domain** (`domain/`) — pure business logic, no framework imports.
- **Infrastructure** (`infrastructure/`) — Supabase repositories + services, imports domain only.
- **Presentation** (`presentation/`) — React hooks + UI, platform-specific.

Domain + infrastructure live in `packages/shared/`; each platform re-exports from
`@himan/shared/<module>` in its own `infrastructure/index.ts`. Inter-module imports go
through `index.ts` — never internal paths.

## Modules

| Module | Platforms | Files | Note |
|---|---|---|---|
| grocery | shared·web·mobile | 188 | [[grocery]] |
| passwords | shared·web·mobile | 52 | [[passwords]] |
| invoice-generator | shared·web | 49 | [[invoice-generator]] |
| cards | shared·web·mobile | 46 | [[cards]] |
| notes | shared·web | 39 | [[notes]] |
| storage | shared·web | 36 | [[storage]] |
| subscriptions | shared·web | 34 | [[subscriptions]] |
| auth | shared·web·mobile | 29 | [[auth]] |
| shared (core UI) | web·mobile | 27 | [[shared]] |
| dashboard | web | 9 | [[dashboard]] |
| friends | shared·web | 7 | [[friends]] |
| settings | web | 5 | [[settings]] |

## Core abstractions (highest edge count in the graph)

`getSupabase()` (171 edges) · `getLogger()` (71) · `useAuth()` (45) ·
`NotebookColors` (37) · `GroceryItemType` (37) · `GroceryListType` (33) ·
`SessionItemType` (33) · `GrocerySessionRepository` (29)

`getSupabase()` is the single biggest cross-community bridge (betweenness 0.152) — every
repository calls it. Changing its signature touches nearly everything.

## Gotchas

- `@core` alias maps to `src/modules/shared/` — the directory is `shared`, the alias is `@core`.
- Mobile uses only `@/*` → `./src/*`.
- Shared package exports raw `.ts` (no build step), consumed directly by Vite and Metro.
- Migrations live in `supabase/migrations/` at the **repo root** — not `web/supabase/`,
  despite what [[grocery-redesign-plan]] says.

## Plan status (verified against code, 2026-08-30)

- [[2026-08-01-grocery-friends]] — **shipped**, though its checkboxes are still unticked.
  `20260801000000_create_friendships.sql`, `packages/shared/src/modules/friends/`, and
  `mobile/app/(app)/friends.tsx` all exist.
- [[grocery-redesign-plan]] — **Phase A + B shipped** (`20260731000000_grocery_redesign_phase_a.sql`,
  `SqliteSyncStorage`, `opExecutor`, `syncPersister`). Phase C notebook UI partly built
  (`presentation/components/notebook/`, `theme/notebook.ts`).
- [[bugs]] — 3 open session-mode items.

## Regenerating

```bash
/graphify                 # full rebuild
/graphify . --update      # incremental, only changed files
graphify query "..."      # ask the graph instead of reading files
```

Graph lives in `graphify-out/` (gitignored): 2,801 nodes · 5,999 edges · 255 communities.
