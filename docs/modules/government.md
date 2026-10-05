---
type: module
area: government
platforms: [shared, web, mobile]
status: implemented
---

# government

Private government records and documents for each signed-in user. Standard types:
PhilHealth, Pag-IBIG, SSS, TIN, National ID, passport, driver's license; custom types
and multiple records per type are supported. Forms contain type, registered name,
and an optional number. New records use their type as the label. Each list card
copies the full number directly while keeping the displayed number masked.
An eye button beside the preview number reveals or hides it without opening
the record. Only one preview number is revealed at a time; account changes reset it.
Dates and notes are no longer shown; edits preserve any previously saved values.

The compact cards show the agency logo and name in one header row, an optional attachment preview,
and one number row with eye/copy icons. Clicking the heading/logo or attachment
opens details; there is no separate Details button. Registered names appear in
the detail header, where the number also uses one row with eye/copy icons.
Cards use
bundled agency/program marks (Pag-IBIG, PhilHealth, BIR, SSS, National ID, and UMID)
with preserved colors and proportions; custom types keep a generic ID mark.
Asset sources are recorded in `web/public/assets/government/README.md`.
Cards show the first ready attachment. Details show all attachments with image
previews and browser PDF embeds where supported on web, with an Open fallback;
native mobile previews images and
opens PDFs in the system viewer. Documents without attachments start collapsed.
Preview URLs last 60 seconds, refresh while mounted, use account-scoped sensitive
queries, and are excluded from mobile query persistence. Failed previews keep an
Open action. Detail body scrolls while edit/delete actions remain available.

- Shared domain and repository: `packages/shared/src/modules/government/`, exported as `@himan/shared/government`.
- Web: `/government`, available from the dashboard and sidebar.
- Mobile: `mobile/app/(app)/government.tsx`, available from the dashboard.
- Backend: `government_records`, `government_documents`, private `government-documents` bucket.
- Migration: `20261004015209_create_government_module.sql`; applied to the linked database on 2026-10-05.

Both table RLS and file policies scope access to `auth.uid()`. Composite document
foreign keys prevent cross-account attachment links. PDFs, JPEGs, PNGs only, 10 MB
per file. Viewing/downloading uses 60-second signed URLs. Account privacy permits
backend operators to access data; this module is not a passphrase vault.

Government queries/mutations are marked sensitive and excluded from mobile SQLite
query persistence. Screens hide records offline. Picker cache copies are removed
after upload attempts; user-requested downloads are managed by the system browser.

Uploads reserve metadata before writing objects. Incomplete uploads remain removable
if cleanup fails. Record deletion marks the record as deleting, preventing new uploads,
then deletes each file and its metadata before deleting the record. Failed deletion
can be retried; database triggers reject metadata deletion while its file exists.

Verification: web Vitest tests in `web/src/modules/government/__tests__/`; database
isolation and lifecycle assertions in `supabase/tests/government.sql`.

Verified on 2026-10-05: 15 government tests, web build and module lint, mobile
typecheck, iOS export, and native iOS release build pass. Migration and SQL
assertions pass in an isolated PostgreSQL 17 database with Supabase auth/storage
schemas; test fixtures roll back. Account changes reset all record dialog state.
Simulator UI interaction remains unverified because Computer Use access was denied.
The Government migration was applied alone through a prepared Supabase CLI directory
with matching remote history. Live rollback-only assertions verify authenticated
create/read/update, date persistence, cross-account isolation, and document lifecycle.
Both tables have RLS enabled, the bucket is private, and no test users remain.
The linked database's migration history has unrelated differences, so a blanket
database push requires separate review.

Web date-picker fix: removed a global invisible calendar-button overlay that
intercepted the form's Save button. Government forms now omit dates and notes.
`web/e2e/government.e2e.ts` verifies saving an ID through the simplified form and
copying its full number directly from the list on desktop and mobile browser
viewports using isolated API fixtures, including preview reveal/hide. Both browser checks, all 16 Government
unit tests, web build and module lint, and mobile typecheck pass after simplification.

UI refresh verification: desktop/mobile browser checks cover saving, reveal/hide,
clipboard copying, agency images, signed image previews, PDF embed/fallback controls, document disclosure,
Escape dismissal, 375px portrait, landscape sizing, and reduced motion. Light/dark
screenshots use synthetic records only. Web build/lint, 16 Government tests, mobile
typecheck, and iOS bundle export pass. Native Simulator UI remains unverified.

Mobile parity verification: the refreshed iOS Release build passes and is installed
on the iPhone 17 Simulator. The installed app includes its release JavaScript bundle
and all six bundled agency/program marks. Mobile typecheck passes; native visual
interaction remains unverified because Simulator Computer Use access was denied.

Compact layout verification: 16 Government unit tests, both browser checks, web
build/lint, and mobile typecheck pass. Browser checks cover opening details through
the agency header or attachment preview and copying through icon-only controls.
The updated iOS Release build passes and is installed on the iPhone 17 Simulator.

[[MAP|← back to MAP]]
