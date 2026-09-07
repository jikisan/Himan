---
type: plan
area: career
status: implemented
created: 2026-08-31
revised: 2026-08-31
spec: null
---

# Career Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate role-tailored cover letters from a shared pool of reusable text blocks, so applying to a job means picking a saved role item and typing a job title and company — not re-editing a document.

**Architecture:** A new `@himan/shared/career` module (domain + Supabase repositories) backed by three tables and one private storage bucket. An **item** is not a document — it is an ordered *selection* of blocks from a shared pool, so adding a seventh role is picking checkboxes rather than writing a seventh letter, and improving a paragraph improves it everywhere at once.

**The share artifact is HTML, not PDF.** The domain layer emits an HTML string; that string is both what the recruiter opens and what the browser prints. This is what keeps the text real and selectable (ATS parsers cannot read a rasterized page) and what keeps the renderer out of the codebase entirely — see [Rejected approaches](#rejected-approaches).

**Tech Stack:** Supabase (Postgres + RLS + private Storage), TypeScript, `@supabase/supabase-js`, Vite + React, TanStack React Query, Vitest (shared-domain tests run from `web/`). **No new dependencies on either platform.**

**Scope:** Web only, `upload` CV mode only. Mobile, in-app CV authoring, external CV links, and job-description parsing are all deferred — see [Deferred](#deferred).

## Global Constraints

- Conventional commits (`feat:`, `fix:`, etc.); **no AI attribution** in commit messages.
- Commit descriptions: proper sentences starting with verbs, one per line.
- RLS enabled on every new table; policies scoped via `auth.uid()`.
- Inter-module imports go through each module's `index.ts` — never internal paths.
- Shared package exports raw `.ts` (no build step); consumed via package `exports` subpaths. Internal imports inside `packages/shared` use `.js` extensions (`from '../../domain/index.js'`) — Metro's resolver depends on this convention.
- **No DOM lib** in `packages/shared` — anything touching `window`, `document`, `Blob`, or canvas belongs in `web/`.
- Repositories call `getSupabase()` and take an explicit `userId: string` parameter; they never read the session themselves. Follow `invoice-generator/infrastructure/repositories/` exactly: `try` / `getLogger().error(...)` / rethrow a friendly `Error`, and a private `mapToEntity`.
- **No zod.** It is a `packages/shared` dependency but no shared module uses it; plain mappers match the codebase.
- Shared-domain tests run: `cd web && npm run test:run`.
- Migrations live in `supabase/migrations/` (repo root), timestamped `YYYYMMDDHHMMSS_name.sql`.
- Share links must be **permanent and revocable**. A Supabase signed URL with a 10-year expiry satisfies both: the bucket stays private, and rotating the token deletes the object so the old link 404s.

---

### Task 1: Migration — career tables, RLS, private bucket

**Files:**
- Create: `supabase/migrations/20260831000000_create_career_module.sql`

**Interfaces:**
- Consumes: `auth.users`, existing `update_updated_at_column()` (defined in `20251226144707_create_notes_tables.sql:73`).
- Produces: tables `career_blocks`, `career_items`, `career_item_blocks`, `career_renders`; bucket `career`.

**Why a new bucket rather than reusing `user-files`:** `user-files` has an `allowed_mime_types` allowlist without `text/html`, and career documents would surface in the Storage module's file browser. A separate bucket keeps both concerns clean.

- [ ] **Step 1: Prove the risky assumption first**

Everything downstream assumes Supabase serves a stored `text/html` object *inline* so a recruiter's browser renders it. Verify before writing a line of TypeScript: upload any `.html` file to a private bucket with `contentType: 'text/html'`, create a signed URL, open it signed-out.

- Renders as a page → proceed as planned.
- Downloads or serves as `text/plain` → **stop and report.** The fallback is to serve the letter from a public web route (`/share/:token`) that reads the render row directly, which changes Task 7 but nothing else.

- [x] **Step 2: Write the migration SQL**

```sql
-- ============================================================
-- Career: role-tailored cover letter generation.
-- An item is a selection of shared blocks, not a stored document.
-- ============================================================

CREATE TYPE career_block_kind AS ENUM (
  'greeting', 'opening', 'experience_line', 'proof',
  'portfolio_line', 'close', 'cv_summary'
);

-- A concrete variant, never a filter. NULL on career_item_blocks means
-- "always include"; there is deliberately no 'any' member.
CREATE TYPE career_length AS ENUM ('short', 'long');

-- Reusable text blocks. Body may contain {{placeholders}}.
CREATE TABLE career_blocks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind       career_block_kind NOT NULL,
  label      TEXT NOT NULL,
  body       TEXT NOT NULL,
  tags       TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, label)
);

-- A role item. share_token is both the storage folder name and the
-- revocation handle: rotating it deletes the old folder.
CREATE TABLE career_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  cv_file_path TEXT,
  -- gen_random_uuid() is built into PG13+; gen_random_bytes() would need
  -- pgcrypto, which no migration in this repo has ever enabled. 122 bits
  -- of entropy, and the signed-URL signature is the real gate anyway.
  share_token  TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- Which blocks an item uses, and in what order.
-- PK on (item_id, position) makes ordering total: no ties, and the same
-- block may legitimately appear at two positions.
-- length NULL = always include; 'short'/'long' = only in that variant.
CREATE TABLE career_item_blocks (
  item_id  UUID NOT NULL REFERENCES career_items(id)  ON DELETE CASCADE,
  -- RESTRICT, not CASCADE: deleting a block must not silently rewrite
  -- letters. The blocks UI blocks the delete instead (Task 5, Step 2).
  block_id UUID NOT NULL REFERENCES career_blocks(id) ON DELETE RESTRICT,
  position INT  NOT NULL,
  length   career_length,
  PRIMARY KEY (item_id, position)
);

-- One row per generated letter: what you actually claimed, to whom, when.
-- v1 only ever writes kind = 'cover_letter'.
CREATE TABLE career_renders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id        UUID NOT NULL REFERENCES career_items(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN ('cover_letter', 'cv')),
  length         career_length NOT NULL,
  job_title      TEXT,
  company        TEXT,
  hiring_manager TEXT,
  hook           TEXT,
  body_text      TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX career_renders_item_idx ON career_renders (item_id, created_at DESC);

CREATE TRIGGER career_blocks_updated_at BEFORE UPDATE ON career_blocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER career_items_updated_at BEFORE UPDATE ON career_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- RLS ----------
ALTER TABLE career_blocks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_item_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_renders     ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_blocks_owner ON career_blocks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY career_items_owner ON career_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY career_item_blocks_owner ON career_item_blocks
  FOR ALL USING (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  ));

CREATE POLICY career_renders_owner ON career_renders
  FOR ALL USING (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM career_items i WHERE i.id = item_id AND i.user_id = auth.uid()
  ));

-- ---------- Storage ----------
-- Private. Sharing is a 10-year signed URL, not a public object, so a CV
-- carrying a name, phone number and employment history never becomes
-- world-readable or crawlable.
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('career', 'career', FALSE, ARRAY['text/html', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Split per command to match 20260107000000_create_storage_bucket.sql.
CREATE POLICY "Users can view their own career files"
ON storage.objects FOR SELECT
USING (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own career files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own career files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own career files"
ON storage.objects FOR DELETE
USING (bucket_id = 'career' AND auth.uid()::text = (storage.foldername(name))[1]);
```

No `IF NOT EXISTS` anywhere: migrations run once, and `CREATE TYPE` / `CREATE POLICY` / `CREATE TRIGGER` have no idempotent form, so half-idempotency only hides a re-run failure until it is confusing.

- [ ] **Step 3: Apply and verify**

```bash
npx supabase db push
```
Verify: RLS is on for all four tables, the `career` bucket exists and is **not** public, and inserting a `career_item_blocks` row for someone else's item is rejected.

---

### Task 2: Shared domain layer

**Files:**
- Create: `packages/shared/src/modules/career/domain/types/index.ts`
- Create: `packages/shared/src/modules/career/domain/entities/{CareerBlock,CareerItem,CareerRender}.ts`, `entities/index.ts`
- Create: `packages/shared/src/modules/career/domain/usecases/{resolvePlaceholders,composeLetter,storagePaths}.ts`, `usecases/index.ts`
- Create: `packages/shared/src/modules/career/domain/templates/{letter,styles}.ts`, `templates/index.ts`
- Create: `packages/shared/src/modules/career/domain/index.ts`

**Interfaces:**
- Produces (consumed by Tasks 3, 5, 6, 7):
  - `resolvePlaceholders(text: string, ctx: PlaceholderCtx): { text: string; missing: string[] }`
  - `composeLetter(blocks: ItemBlock[], ctx: PlaceholderCtx, length: CareerLength): { text: string; missing: string[] }`
  - `buildStoragePath(userId: string, shareToken: string, file: 'letter.html' | 'cv.pdf'): string`
  - `buildDownloadFilename(fullName: string | undefined, kind: 'cover_letter' | 'cv'): string`
  - `renderLetterHtml(data: LetterHtmlData): string`
  - `PRINT_CSS: string`

**Rules:** pure TypeScript, no framework imports, no DOM. Templates return HTML **strings**, so the artifact a recruiter opens and the artifact the browser prints are the same bytes and cannot drift.

- [x] **Step 1: Types and entities** — `domain/types/index.ts` only; no separate `entities/` files. Repositories follow the invoice-generator convention (private `mapToEntity` returning the plain type) instead, so a wrapper class would have added no behavior.

Placeholder tokens: `{{job_title}}`, `{{company}}`, `{{hiring_manager}}` (fallback `Hiring Team`), `{{hook}}` (optional — when absent its whole sentence is dropped, not left blank).

`CareerLength = 'short' | 'long'`. An item-block's `length` is `CareerLength | null`, where `null` means "include in every variant". There is no `'any'` member: the previous design used one enum as both a variant and a filter, which made `career_renders.length = 'any'` representable and meaningless.

- [x] **Step 2: `resolvePlaceholders`**

Unresolved tokens must render **visibly** (`[[job_title]]`) rather than silently emptying, so a missing value is caught in preview instead of in a recruiter's inbox. Return every unresolved token in `missing`.

- [x] **Step 3: `composeLetter`**

Order by `position`; drop blocks whose `length` is non-null and not the requested variant; join with blank lines; propagate `missing`. The filter reads `career_item_blocks.length` only — `career_blocks` deliberately has no `length` column, so there is exactly one source of truth.

- [x] **Step 4: `storagePaths`**

```
career/{userId}/{shareToken}/letter.html
career/{userId}/{shareToken}/cv.pdf
```
The random `shareToken` is both the unguessable path segment and the revocation handle, and it leaks no role name. Filenames are identical across every item on purpose.

`buildDownloadFilename` derives from the caller-supplied full name (`kyle-santerna-cv.pdf`), falling back to `cv.pdf` when absent. Never hardcode a name in `packages/shared` — the schema is `user_id`-scoped throughout.

- [x] **Step 5: HTML template and print CSS**

`renderLetterHtml` returns a complete standalone document: `<!doctype html>`, the letter text as `<p>` per paragraph, sender name and contact line, and `PRINT_CSS` inlined in a `<style>` tag. Single column, no tables, no icons, no images, standard headings, real selectable text — decorative layouts break ATS parsers.

`PRINT_CSS` carries `@page { size: A4; margin: 20mm }` plus a `.no-print { display: none }` rule. Include exactly one interactive element, a `<button class="no-print" onclick="window.print()">Save as PDF</button>` — this is the only script in the document and it is what replaces a PDF renderer for the recipient.

Escape every interpolated value. The inputs are the user's own, but the output is a standalone HTML document served from your domain; unescaped `<` in a company name is a broken page at best.

- [x] **Step 6: Unit tests** — placed at `web/src/modules/career/__tests__/` (not `packages/shared/.../usecases/__tests__/`), matching the existing precedent for shared-domain tests (`web/src/modules/friends/__tests__/Friend.test.ts`, `web/src/modules/grocery/__tests__/`) so they're actually reachable by `web`'s Vitest root. Cover: missing placeholder surfaces in `missing` and renders as `[[token]]`; optional `{{hook}}` omission drops its sentence; `hiring_manager` falls back to `Hiring Team`; length filtering keeps `null` rows and drops the opposite variant; ordering follows `position`; path and filename construction; HTML escaping of an interpolated `<`.

```bash
cd web && npm run test:run
```

---

### Task 3: Shared infrastructure layer

**Files:**
- Create: `packages/shared/src/modules/career/infrastructure/repositories/{CareerBlockRepository,CareerItemRepository,CareerItemBlockRepository,CareerRenderRepository}.ts`, `repositories/index.ts`
- Create: `packages/shared/src/modules/career/infrastructure/services/CareerStorageService.ts`, `services/index.ts`
- Create: `packages/shared/src/modules/career/infrastructure/index.ts`

**Interfaces:**
- Consumes: `getSupabase()`, `getLogger()`, domain types from Task 2.
- Produces: CRUD for all four tables, plus
  - `CareerBlockRepository.findAllWithUsage(userId)` → blocks with an `itemCount`
  - `CareerStorageService.upload(path, bytes, contentType)`
  - `CareerStorageService.createShareUrl(path, downloadFilename?)`
  - `CareerStorageService.rotateShareToken(itemId, userId)`

- [x] **Step 1: Repositories**

Mirror `invoice-generator/infrastructure/repositories/` exactly — that is the house shape, down to the `PGRST116` → `null` handling on `.single()`.

- [x] **Step 2: `findAllWithUsage`**

`career_item_blocks.block_id` is `ON DELETE RESTRICT`, so a delete of a used block raises a raw Postgres FK error. Return the usage count alongside each block so Task 5 can disable the delete with a reason instead of surfacing `23503` to the user.

- [x] **Step 3: Storage service**

`upload` accepts `Uint8Array`, **not** `Blob` — `Blob` is a DOM type and `packages/shared` has no DOM lib, while `supabase-js` accepts `Uint8Array`. Pass `upsert: true`; regenerating a letter overwrites the shared object in place, which is the point (the live link updates).

`createShareUrl` calls `createSignedUrl(path, 315_360_000, downloadFilename ? { download: downloadFilename } : undefined)` — ten years. Export the expiry as a named constant with a comment: signed URLs are invalidated by a project-wide storage JWT secret rotation, which would break every outstanding link at once. That is the accepted ceiling; regenerating links is a per-item action that already exists.

Omit `download` for the letter so it renders inline; pass it for the CV so it saves under a real name.

- [x] **Step 4: Token rotation** — `rotateShareToken` writes a fresh token, **copies** every object from the old `{userId}/{oldToken}/` prefix to the new one (`storage.copy`), then deletes the old prefix and repoints `career_items.cv_file_path` at the new path if a CV was attached. Deleting the old objects is what actually revokes the old link — a signed URL cannot be individually revoked, but it 404s once its target is gone — while copying first means the letter and CV a recruiter already has stay intact and only the exposed old URL breaks. This differs from the plan's original "re-uploading is the caller's job": the caller (Task 7's UI) has no local copy of the CV bytes to re-upload, so the copy has to happen server-side inside the service.

---

### Task 4: Wire the module into the workspace

**Files:**
- Create: `packages/shared/src/modules/career/index.ts`
- Modify: `packages/shared/package.json` — add `"./career": "./src/modules/career/index.ts"`
- Modify: `web/vite.config.ts`, `web/tsconfig.app.json`, `web/vitest.config.ts` — add the `@career` alias
- Create: `web/src/modules/career/infrastructure/index.ts` — re-export from `@himan/shared/career`
- Modify: `web/src/router/index.tsx` — add the routes
- Modify: `web/src/layouts/components/Sidebar.tsx` and `web/src/layouts/components/MobileNav.tsx` — add the nav entry to **both** (each declares its own `navItems` array)

- [x] **Step 1: Export the module's public API** from its `index.ts`
- [x] **Step 2: Add the `./career` subpath export**
- [x] **Step 3: Add `@career` in all three web configs** — missing one causes a test-only or build-only failure that is annoying to trace
- [x] **Step 4: Register routes** in `web/src/router/index.tsx`, inside the `ProtectedRoute` → `DashboardLayout` group alongside `/grocery`: `/career` (items), `/career/blocks`, plus `/career/new` and `/career/:itemId` for the item editor (needed by Task 6, not explicit in this step but required to navigate to it). Added the matching nav entry to `Sidebar.tsx` **and** `MobileNav.tsx` — they hold independent `navItems` arrays, so adding one leaves the other silently missing the link.
- [x] **Step 5: Verify** — `cd web && npm run build && npm run test:run` — both pass (44 tests).

---

### Task 5: Web — blocks library

**Files:**
- Create: `web/src/modules/career/presentation/hooks/useCareerBlocks.ts`
- Create: `web/src/modules/career/presentation/components/{BlockEditor,BlockList}.tsx`
- Create: `web/src/modules/career/presentation/pages/BlocksPage.tsx`
- Create: `web/src/modules/career/presentation/constants/seedBlocks.ts`

- [x] **Step 1: React Query hooks** over `CareerBlockRepository`, passing `user.id` from `useAuth`
- [x] **Step 2: CRUD UI** grouped by `kind`, filterable by tag, with live placeholder preview per block. Delete is disabled with "used by N items" when `itemCount > 0` — see Task 3, Step 2.
- [x] **Step 3: Seeding** — a "Add starter blocks" action on the empty state, inserting from a `seedBlocks.ts` constant transcribed from `docs/superpowers/plans/assets/cover-letter-blocks.md` (10 experience lines, 13 proof paragraphs, fixed blocks — `cv_summary` kind has no seed content since v1 is upload-only CV mode).

---

### Task 6: Web — items and composition

**Files:**
- Create: `web/src/modules/career/presentation/hooks/{useCareerItems,useItemBlocks}.ts`
- Create: `web/src/modules/career/presentation/components/{ItemCard,ComposePane,LetterPreview,CvUploadPanel}.tsx`
- Create: `web/src/modules/career/presentation/pages/{ItemsPage,ItemEditorPage}.tsx`

- [x] **Step 1: Items list** — cards showing name and CV-attached status. Block count and share-link state are deferred (would need a per-card query each — an item's block selection and generation state are one click away in the editor, not worth an N+1 query per card).
- [x] **Step 2: Item editor** — two panes: left picks and reorders blocks (up/down buttons, no drag-and-drop dependency added) and sets each one's length constraint (always / short only / long only); right shows the live assembled letter with sample placeholder values
- [x] **Step 3: Reordering** persists `position` via the `replace_career_item_blocks` Postgres function added in the Task 1 migration (delete + re-insert in one round trip, `SECURITY INVOKER` so RLS still applies) — avoids the PK-collision problem a naive per-row update would hit.
- [x] **Step 4: CV upload** — file picker → `career/{userId}/{shareToken}/cv.pdf`, storing `cv_file_path`. One mode only; the item editor has no mode switch.

---

### Task 7: Web — generate, share, print

**Files:**
- Create: `web/src/modules/career/presentation/hooks/useGenerateLetter.ts`
- Create: `web/src/modules/career/presentation/components/GenerateDialog.tsx`

**Interfaces:**
- Consumes: `composeLetter`, `renderLetterHtml`, `buildStoragePath`, `buildDownloadFilename` (Task 2); `CareerStorageService`, `CareerRenderRepository` (Task 3).

There is no `CareerPDFService`. The browser's own print-to-PDF renders the shared HTML, which is why the module adds no dependency and why the output has real selectable text.

- [x] **Step 1: Generate dialog** — inputs for job title, company, hiring manager, hook, and short/long → live resolved preview → **Copy text** · **Print / Save PDF** · **Copy share link** (+ **Copy CV link** when a CV is attached)
- [x] **Step 2: Block generation** when `missing` is non-empty; never generate silently — `canGenerate` gates all four action buttons
- [x] **Step 3: Print** — write the HTML into a hidden same-origin `iframe` via `srcdoc`, wait for load, call `iframe.contentWindow.print()`. Do not use `window.print()` on the app document.
- [x] **Step 4: Publish** — `new TextEncoder().encode(html)` → `CareerStorageService.upload(path, bytes, 'text/html')`, then insert the `career_renders` row (`kind: 'cover_letter'`, the resolved `body_text`, and the job title / company / hiring manager / hook as typed).
- [x] **Step 5: Copy share link** — `createShareUrl(letterPath)` with no `download` argument. UI toast notes regenerating replaces what an already-sent link shows.
- [x] **Step 6: Rotate** — a "Revoke share link" action on the item calling `rotateShareToken`, which now copies the current letter and CV forward to the new token folder itself (see Task 3 Step 4) rather than requiring the UI to re-upload them.
- [ ] **Step 7: Verify** — open the share URL in a signed-out browser: it renders as a page with selectable text, "Save as PDF" produces a single A4 page, the CV link saves as `<name>-cv.pdf`, and selecting text in the printed PDF works. Then revoke and confirm the old URL 404s. **Not run** — requires a live Supabase project and a signed-out browser session; needs to be done manually before relying on this for real applications.

---

## Deferred

**Mobile.** Would need `expo-print`, `expo-sharing` and `expo-document-picker` — none currently installed — and this is a prebuild workflow, so a native rebuild, on a project that just resolved a static-linking pod conflict (`21c5128`). There is also nothing to alias: `mobile/metro.config.js` resolves `@/*` only and has no per-module aliases. Job applications are written at a desk. The shared domain and repositories are already platform-neutral, so this stays a presentation-layer task whenever it is wanted.

**CV `text` and `link` modes.** One `cv_file_path` column now. Adding a `cv_mode` enum plus `cv_text` / `cv_external_url` with a `CHECK` enforcing exactly one populated is a five-line migration; `renderCvHtml` reuses `PRINT_CSS` unchanged. Three modes before the first one is used is configuration for a value that never changes.

**Job-description parsing.** Tag the JD, score blocks by tag overlap, propose a selection the user confirms. Changes only *how* `career_item_blocks` is populated — schema, composition, template, and sharing are untouched. Storing blocks rather than flat documents in v1 is what keeps this from being a rewrite.

## Rejected approaches

**`react-to-pdf` for web PDF generation.** It is already a web dependency (`useInvoicePDF.ts:2`), which is why the first draft reached for it, but it is `html2canvas` + `jsPDF`: the output is a rasterized image with no text layer, which no ATS can parse — defeating the module's entire reason to exist. Its API also takes a `React.RefObject<HTMLDivElement>`, not an HTML string, so the planned `htmlToPdfBytes(html)` was not implementable as written. And because `expo-print` *does* emit real text, the two platforms would have produced materially different documents from the same template.

**A public `career-public` bucket.** Rejected on both privacy and cost-of-code grounds: it publishes a name, phone number and employment history to a permanently crawlable URL, and it needs a second bucket, four more storage policies, and a private→public copy step on every generate. The first draft ruled out signed URLs because "those expire" — they expire when you tell them to, and `expiresIn` is an arbitrary number of seconds.

**A public `/share/:token` app route.** More code than a signed URL and it makes the letter depend on the app being deployed and healthy. Held in reserve as the fallback if Task 1 Step 1 fails.
