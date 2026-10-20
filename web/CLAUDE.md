# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Context

This is the `@himan/web` workspace in an npm workspaces monorepo. See the root `CLAUDE.md` for overall architecture and shared package details.

**Important**: Run `npm install` from the repo root (not from `web/`) to set up workspace symlinks.

### Shared Package Integration

- Supabase client: initialized in `src/modules/shared/infrastructure/config/supabase.ts` via `initSupabase()` from `@himan/shared`
- Logger: initialized in `src/modules/shared/infrastructure/services/Logger.ts` via `initLogger()` from `@himan/shared`
- Module infrastructure `index.ts` files re-export repositories/services from `@himan/shared/<module>`
- Browser-specific services (ThumbnailService, CompressionService, InvoicePDFService, LocalNotesStorage) stay in web

## Commands

```bash
npm run dev          # Start dev server
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npm test             # Vitest in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Tests with coverage
npm run deploy       # Build + deploy to Cloudflare Pages (production)
npm run deploy:preview # Build + deploy to Cloudflare Pages (preview)
```
## Architecture

See root `CLAUDE.md` for the three-layer architecture pattern. Feature modules live under `src/modules/`.

## Path Aliases

All aliases configured in `tsconfig.app.json`, `vite.config.ts`, and `vitest.config.ts`:

- `@/*` → `src/*`
- `@core/*` → `src/modules/shared/*` (note: directory is "shared" but alias is "@core")
- `@auth/*`, `@dashboard/*`, `@notes/*`, `@passwords/*`, `@cards/*`, `@storage/*`, `@settings/*`, `@subscriptions/*`, `@invoice-generator/*` → `src/modules/<name>/*`
- `@app/*` → `src/app/*`, `@modules/*` → `src/modules/*`

When adding a new module, add its alias to all three config files.

## Technology Stack

- **Build**: rolldown-vite (Rolldown-based Vite fork) + SWC via @vitejs/plugin-react-swc
- **Framework**: React 19 + TypeScript (strict mode, `verbatimModuleSyntax: true`)
- **Routing**: React Router v7 — routes in `src/router/index.tsx`, with `ProtectedRoute` and `PublicRoute` guards
- **Styling**: Tailwind CSS v4 with `@theme inline` CSS variables for light/dark theming
- **UI**: Radix UI primitives + shadcn/ui patterns + class-variance-authority. Base components in `src/components/ui/`
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: TanStack React Query v5 (requires `dedupe: ['react', 'react-dom']` in Vite for React 19)
- **Rich Text**: Tiptap with extensions (Typography, Highlight, Task Lists, Placeholder, CharacterCount)
- **Testing**: Vitest + React Testing Library + happy-dom. Co-locate tests in `__tests__` directories.
- **Icons**: Lucide React

## Buttons are labelled

Older and non-technical people use this app (rentals co-managers, tenants on their own phones). Every action button shows
a text label (an icon may sit beside it). No icon-only action buttons, and never make "tap the row" the only way to act.
Dialogs and sheets show "Close" beside the X (from `components/ui`); month arrows read "Previous" and "Next".

## Form errors

Rule for every form: a failed submit never shows its message below the buttons. It scrolls to the
first invalid field (DOM order), focuses it, outlines it red and shows the message right under it.
Errors not tied to a field (server refusals) go in a `FormErrorBanner` at the top of the form.
Mandatory fields get `*` in their label (`<Label required>` / rentals `<Field required>`); the input
itself must still carry `required` or `aria-required`.

```tsx
import { useFieldErrors, zodFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';

const fe = useFieldErrors();
const submit = (e: FormEvent) => { e.preventDefault(); fe.clear();
  const r = schema.safeParse(values);
  if (!r.success) return fe.failMany(zodFieldErrors(r.error, (p) => `rent-${String(p[0])}`));
  save(r.data).catch((err) => fe.setFormError(err.message)); };
<form onSubmit={submit} noValidate><FormErrorBanner message={fe.formError} />
  <Label htmlFor="rent-name" required>Name</Label>
  <Input id="rent-name" required {...fe.invalid('rent-name')} onChange={(e) => { setName(e.target.value); fe.clear('rent-name'); }} />
  <FieldError id="rent-name" message={fe.errors['rent-name']} /></form>
```

- `invalid(id)` sets `aria-invalid` + `aria-describedby="${id}-error"`; `Input`, `Textarea`, `SelectTrigger`
  and rentals `inputClass` draw the red border/ring from `aria-invalid` (Tailwind `aria-invalid:` variant).
- Rentals: `<Field id error={fe.errors[id]} required>` renders `FieldError` for you.
- `setFormError` scrolls the one rendered `[data-form-error]` banner; render it only once per screen.
- Use `noValidate` on the form when the hook validates, so the browser's own bubbles don't preempt it.

## Module Details

Feature modules live under `src/modules/`. Each follows the three-layer architecture (domain → infrastructure → presentation) described in the root CLAUDE.md.

- **`shared/`** (alias `@core`): Reusable UI components, global hooks/utils, base API config, shared entities/types
- **`auth/`**: Supabase Auth — login, register, session management
- **`dashboard/`**: Charts, widgets, statistics
- **`notes/`**: Three-panel Mac Notes-like interface, Tiptap rich text editor, offline-first hybrid storage with `HybridNoteRepository` + `NoteSyncService`, auto-save with debounce
- **`passwords/`**: Client-side AES-GCM encryption via Web Crypto API (PBKDF2 key derivation from user ID), three-panel layout
- **`storage/`**: File upload/management with Supabase Storage, folder organization, preview support
- **`cards/`**: Credit card storage with expiration tracking
- **`invoice-generator/`**: PDF generation via react-to-pdf, multi-currency, saved options for reusable details
- **`subscriptions/`**: Tier management (free/beta/pro/enterprise), role-based access, usage limits
- **`settings/`**: Theme management (light/dark/system), user preferences

## Data Fetching Strategies

**React Query** (Storage, Cards modules): Default staleTime 5min, gcTime 10min. Config in `src/modules/shared/presentation/contexts/QueryProvider.tsx`.

**Hybrid Local/Remote** (Notes module): Offline-first via `LocalNotesStorage` + background sync via `NoteSyncService`. Dirty state tracking and conflict resolution.

## Environment Variables

Required (see `.env.example`):
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Must be prefixed with `VITE_` to be exposed to client code. Validated at runtime in `src/modules/shared/infrastructure/config/supabase.ts`.
