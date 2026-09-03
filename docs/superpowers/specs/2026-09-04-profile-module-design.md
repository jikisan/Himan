---
type: spec
area: himan
status: proposed
date: 2026-09-04
---

# Profile Module — Design

## Summary

Add a `profile` module: the user's personal/career profile — an identity header
plus four structured "work" sections (experience, skills, projects, certificates).

The database layer already exists. Migration `20260903000000_create_profiles.sql`
created `profiles` and its four child tables with owner-only RLS, `updated_at`
triggers, and `(user_id, position)` indexes. **No new migration is needed.**
No code currently reads or writes these tables — this spec covers the domain,
infrastructure, and web presentation layers that sit on top of them.

Scope decisions (confirmed):

- **Name/scope**: one `profile` module covering the whole migration — identity
  header + all four work sections.
- **Platforms**: web only (mirrors the `career` module).
- **No public sharing**: the `profiles` table has no share token; access is
  owner-only via RLS, unlike `career`.

The module follows the exact three-layer pattern already used by `career`:
domain + infrastructure in `packages/shared/`, presentation in `web/`.

## Data model (already migrated — reference only)

`profiles` (one row per user, `user_id` UNIQUE):
`full_name, headline, bio, location, email, phone, website, links JSONB,
created_at, updated_at`.

Child tables, each carrying `user_id` directly (flat `auth.uid() = user_id` RLS),
ordered by `(position, created_at)`:

- `profile_experiences`: `company, title, location, start_date, end_date,
  is_current, summary, bullets TEXT[], position`
- `profile_skills`: `name, category, level, position` — `UNIQUE (user_id, name)`
- `profile_projects`: `name, description, url, tech TEXT[], start_date,
  end_date, position`
- `profile_certificates`: `name, issuer, issue_date, expiry_date,
  credential_id, credential_url, position`

## Shared package — `packages/shared/src/modules/profile/`

```
profile/
├── index.ts                         # export * from domain + infrastructure
├── domain/
│   ├── index.ts
│   ├── types/index.ts               # entities + Create/Update DTOs
│   └── usecases/
│       ├── index.ts
│       └── sortByPosition.ts        # (position, created_at) comparator
└── infrastructure/
    ├── index.ts
    └── repositories/
        ├── index.ts
        ├── ProfileRepository.ts
        ├── ExperienceRepository.ts
        ├── SkillRepository.ts
        ├── ProjectRepository.ts
        └── CertificateRepository.ts
```

### domain/types

One entity interface per table plus `Create*Dto` / `Update*Dto` per child. Mapping
rules applied in each repository's `mapToEntity`:

- `DATE`/`TIMESTAMPTZ` columns → `Date` (or `null` where nullable)
- `TEXT[]` (`bullets`, `tech`) → `string[]`
- `links JSONB` → `Record<string, string>`
- snake_case columns → camelCase fields

Entities:

- `ProfileType`: `id, userId, fullName, headline, bio, location, email, phone,
  website, links, createdAt, updatedAt` (all identity fields nullable except ids/dates)
- `ExperienceType`: `id, userId, company, title, location, startDate, endDate,
  isCurrent, summary, bullets, position, createdAt, updatedAt`
- `SkillType`: `id, userId, name, category, level, position, createdAt, updatedAt`
- `ProjectType`: `id, userId, name, description, url, tech, startDate, endDate,
  position, createdAt, updatedAt`
- `CertificateType`: `id, userId, name, issuer, issueDate, expiryDate,
  credentialId, credentialUrl, position, createdAt, updatedAt`

DTOs: `ProfileUpsertDto` (identity fields, keyed by `userId`); for each child a
`Create*Dto` (`userId` + user-editable fields, `position` optional) and an
`Update*Dto` (partial user-editable fields). Ids and timestamps are never in DTOs.

### domain/usecases/sortByPosition

Pure comparator: sort by `position` ascending, tie-break by `createdAt`
ascending. Used client-side; repositories also `.order('position').order('created_at')`
but the helper guarantees stable ordering after optimistic local edits.

### infrastructure/repositories

Style is copied from `CareerItemRepository`: import `getSupabase` / `getLogger`,
every method wrapped in try/catch that logs and rethrows a friendly `Error`,
private `mapToEntity`. All queries filter `.eq('user_id', …)` (RLS is the real
guard; the filter keeps queries scoped and cheap).

- **`ProfileRepository`**
  - `get(userId): Promise<ProfileType | null>` — `.select('*').eq('user_id').maybeSingle()`
  - `upsert(dto: ProfileUpsertDto): Promise<ProfileType>` — `.upsert(..., { onConflict: 'user_id' })`
    (one row per user, enforced by the UNIQUE constraint)

- **`ExperienceRepository` / `SkillRepository` / `ProjectRepository` / `CertificateRepository`**, each:
  - `findAll(userId): Promise<T[]>` — ordered by `position, created_at`
  - `create(dto: CreateTDto): Promise<T>` — if `position` omitted, default to
    current row count (append to end)
  - `update(id, userId, dto: UpdateTDto): Promise<T>`
  - `delete(id, userId): Promise<void>`
  - `reorder(userId, orderedIds: string[]): Promise<void>` — write each id's new
    array index to `position` (batch upsert of `{id, position}`, scoped by `user_id`)

`SkillRepository.create` surfaces the `UNIQUE (user_id, name)` violation as a
friendly "skill already exists" error.

### package.json

Add to the `exports` map:

```json
"./profile": "./src/modules/profile/index.ts"
```

## Web — `web/src/modules/profile/`

```
profile/
├── infrastructure/index.ts          # re-export from @himan/shared/profile
└── presentation/
    ├── hooks/
    │   ├── index.ts
    │   ├── useProfile.ts
    │   ├── useExperiences.ts
    │   ├── useSkills.ts
    │   ├── useProjects.ts
    │   └── useCertificates.ts
    ├── components/
    │   ├── index.ts
    │   ├── ProfileHeaderForm.tsx
    │   ├── ExperienceSection.tsx     # list + add; renders ExperienceCard rows
    │   ├── ExperienceCard.tsx        # view row + edit toggle + up/down/delete
    │   ├── ExperienceEditor.tsx      # form fields for one experience
    │   ├── SkillSection.tsx
    │   ├── ProjectSection.tsx
    │   ├── ProjectCard.tsx / ProjectEditor.tsx
    │   ├── CertificateSection.tsx
    │   └── CertificateCard.tsx / CertificateEditor.tsx
    └── pages/
        ├── index.ts
        └── ProfilePage.tsx           # stacked sections
```

(Skills are simple enough to render inline in `SkillSection` — name/category/level
chips with add + delete — no separate card/editor files.)

### Hooks

Each hook instantiates its repository, reads `userId` from `useAuth()`, fetches on
mount into `useState`, exposes `{ data, loading, error, create, update, remove,
reorder }`. Mutations call the repo then refetch (no optimistic cache — matches the
simplicity of the existing modules). `useProfile` exposes `{ profile, loading, save }`
where `save` calls `upsert`.

### Components / Page

- `ProfileHeaderForm` — editable identity fields (full name, headline, bio,
  location, contact, links), single Save.
- Each `*Section` — a titled card with an "Add" button and the ordered list of
  rows; each row toggles between a read view and its `*Editor`. Reorder via
  up/down buttons calling `reorder`. *ponytail: no drag-drop library; if manual
  reorder becomes painful, add `@dnd-kit` later.*
- `ProfilePage` — stacks `ProfileHeaderForm` + the four sections. Route `/profile`.

Reuse existing shared UI primitives (`@/components/ui`: Card, inputs, buttons) as
`ProfilePage`/settings already do.

## Wiring

- **Aliases** — add `@profile` → `src/modules/profile` in `web/vite.config.ts`,
  `web/tsconfig.app.json`, `web/vitest.config.ts` (mirror the `@career` lines).
- **Router** — add `<Route path="/profile" element={<ProfilePage />} />` in
  `web/src/router/index.tsx`, importing from `@profile/presentation/pages`.
- **Navigation** — add a "Profile" link in `Navbar`, `Sidebar`, `MobileNav`.

## Error handling

Repositories log via `getLogger()` and rethrow friendly `Error`s (career pattern).
Hooks catch and expose `error` for the UI to show inline. RLS guarantees a user can
only ever read/write their own rows; the `user_id` query filter is defense-in-depth
and query scoping, not the security boundary.

## Testing

CRUD repositories get no unit tests (consistent with `career`, whose repos are
untested — only its pure use-cases are). The one piece of real logic is
`sortByPosition`; add `web/src/modules/profile/__tests__/sortByPosition.test.ts`
asserting position-then-createdAt ordering, including the tie-break.

## Out of scope / deferred

- Mobile presentation (web only for now).
- Public/shared profile view (no share token in the schema).
- Drag-and-drop reordering (up/down buttons suffice initially).
- Renaming the existing settings account page (`settings/.../ProfilePage.tsx`,
  which shows email/id) to "Account" to avoid conceptual overlap — a later tidy,
  not required here.
- Any PDF/document generation (that lives in `career`).
