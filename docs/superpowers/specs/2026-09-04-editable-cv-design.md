---
type: spec
area: himan
status: proposed
date: 2026-09-04
---

# Editable Structured CV — Design

## Summary

Add an editable, structured CV/résumé that reproduces the layout of the sample
(`docs/June_Kyle_Santerna_CV.pdf`): a centered identity header, professional
summary, work experience with bullets, education, category-grouped skills,
projects, and certificates. The user edits structured section entries, previews
a print-ready résumé, prints it to PDF (browser print, like the cover letter),
and can hand out a signed share link.

### How we got here

The request began as "an editable CV like the cover letter, using blocks." The
cover letter (`career` module) assembles freeform text **blocks** into flowing
paragraphs. Two clarifications changed the substrate:

- **CV look** → *structured résumé* (headings, bullets, skills grid — the PDF),
  not flowing prose.
- **Block granularity** → *rich, first-class* section types.

A structured résumé with first-class section types **is** structured data, not
freeform text blobs. Overloading `career_blocks.body TEXT` with company / title /
dates / bullets would fight that schema. The `profile` module — already migrated
(`20260903000000_create_profiles.sql`) and spec'd
(`2026-09-04-profile-module-design.md`) — is exactly the right substrate: one
structured table per résumé section. This CV is therefore **a structured
renderer over the profile module**, reusing the cover letter's proven
print/share/storage pipeline. "Blocks" become typed section entries.

The sample's sections map onto the migrated schema, with **one gap**: Education
has no table.

| CV section | Backing |
|---|---|
| Header (name, location, phone, email, links) | `profiles` |
| Professional Summary | `profiles.bio` |
| Work Experience | `profile_experiences` |
| Education | **new** `profile_education` |
| Skills (grouped by category) | `profile_skills` (`category`) |
| Projects | `profile_projects` |
| Certificates | `profile_certificates` |

## Scope (confirmed)

- **Education**: add a `profile_education` table + full layer.
- **Share link**: include a signed-URL CV share link (like the letter). Adds
  `cv_share_token` to `profiles`.
- **Seed**: an empty-state action pre-fills the user's profile with the actual
  content transcribed from the sample PDF (per-user rows via repositories, not a
  migration — mirrors `SEED_BLOCKS`).
- **Platform**: web only (mirrors `career` and the profile spec).
- **v1 = one canonical CV** rendered from the profile. Per-application tailored
  CVs (select/reorder a subset per job) are **deferred**.

This spec **supersedes the coexistence/`render_kind` idea** from earlier
discussion — the CV does not use `career_item_blocks` at all.

## Relationship to the profile-module spec

The base profile module (`2026-09-04-profile-module-design.md`) is a prerequisite
and is built as written — domain + infrastructure in `packages/shared/`,
presentation in `web/`, `@profile` alias, `/profile` route. This spec **extends**
it with four additions: (1) the `profile_education` section, (2) the CV renderer,
(3) the print + share actions, (4) the seed data. Everything the base spec
already covers (identity form, experience/skills/project/certificate sections,
hooks, `sortByPosition`, wiring) is assumed and not repeated here.

---

## 1. Migration — `profile_education` + CV share token

New migration `supabase/migrations/20260904000000_add_profile_education_and_cv_share.sql`
(timestamp adjusted at write time to sort after the profiles migration):

```sql
CREATE TABLE profile_education (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school        TEXT NOT NULL,
  degree        TEXT,                 -- 'Bachelor of Science'
  field         TEXT,                 -- 'Information Technology'
  location      TEXT,
  start_date    DATE,
  end_date      DATE,
  gpa           TEXT,                 -- free text: '1.7' (PH scale), '3.8/4.0'
  achievements  TEXT[] NOT NULL DEFAULT '{}',  -- ["Dean's Lister", ...]
  position      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX profile_education_user_idx ON profile_education (user_id, position);

CREATE TRIGGER profile_education_updated_at BEFORE UPDATE ON profile_education
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE profile_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY profile_education_owner ON profile_education
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CV share: a rotatable token naming the storage folder that holds the
-- rendered CV HTML. NULL until the user first creates a share link.
ALTER TABLE profiles ADD COLUMN cv_share_token TEXT UNIQUE;
```

`gpa` is TEXT because grading scales differ (the sample uses the Philippine 1.0–5.0
scale where 1.7 is high). `achievements TEXT[]` matches the sample's bulleted list.

The CV HTML is stored in the **existing `career` storage bucket** (already
private, already allows `text/html`, already has owner-only folder RLS keyed on
`(storage.foldername(name))[1] = auth.uid()`). No new bucket. Path:
`{userId}/{cv_share_token}/cv.html`.

## 2. Shared package — `packages/shared/src/modules/profile/`

On top of the base profile module:

### domain/types — add education

- `EducationType`: `id, userId, school, degree, field, location, startDate,
  endDate, gpa, achievements, position, createdAt, updatedAt`.
- `CreateEducationDto` (`userId` + editable fields, `position` optional),
  `UpdateEducationDto` (partial editable fields).
- Add `cvShareToken: string | null` to `ProfileType`; it is **not** part of
  `ProfileUpsertDto` (managed by the share action, not the identity form).

### domain/usecases — the CV renderer (the core new logic)

`renderCvHtml.ts` — a pure function, the structured counterpart to the letter's
`renderLetterHtml`:

```ts
interface CvData {
  profile: ProfileType;
  experiences: ExperienceType[];
  education: EducationType[];
  skills: SkillType[];
  projects: ProjectType[];
  certificates: CertificateType[];
}
export function renderCvHtml(data: CvData): string
```

Produces a standalone `<!doctype html>` document — same "what you print is what
you share" guarantee as the letter. Layout rules (from the sample):

- **Header** — centered name, then a line of `location`, contact, and links
  (`links` JSONB + `website` + `email` + `phone`) joined by ` | `. Empty fields
  are dropped, never rendered as blank separators.
- **Section** — an uppercase heading with a bottom rule, followed by entries.
  A section with no rows is omitted entirely.
- **Experience / Education** — a row with left-aligned title/company (or
  school/degree) and **right-aligned dates**; `is_current` or null `endDate`
  renders "Present". Bullets / achievements as a `<ul>`.
- **Skills** — grouped by `category`; each group is `Category: a, b, c`
  (`sortByPosition` within a group; groups ordered by first appearance).
  Uncategorized skills fall under a trailing "Other" group.
- **Projects** — name + optional platform/url line, description, and `tech`
  joined inline.
- **Certificates** — name, issuer, issue date, and `credential_id` when present.

All user text goes through the existing `escapeHtml` helper (lift it out of
`letter.ts` into a shared `escapeHtml.ts` so both renderers use one copy).
Dates format via `date-fns` (`format(d, 'MMM yyyy')`) — already a shared dep.

### domain/templates — CV print CSS

`cvStyles.ts` exports `CV_PRINT_CSS`: `@page A4`, print-friendly serif, section
headings with rules, right-aligned date columns (flex row, `justify-content:
space-between`), tight `<ul>` bullets, a `.no-print` "Save as PDF" button.
Single-column and real selectable text — the same ATS-safe discipline noted in
the existing `styles.ts`, extended with headings/bullets/rows the résumé needs.

### infrastructure/repositories — add `EducationRepository`

Same shape as the other child repositories in the base spec (`findAll`,
`create`, `update`, `delete`, `reorder`; append-to-end default position;
try/catch + `getLogger` + `mapToEntity`).

`ProfileRepository` gains:
- `setCvShareToken(userId, token): Promise<void>` — writes `cv_share_token`.
- token generation reuses the career approach: `crypto.randomUUID()` with
  dashes stripped (no new dependency).

`mapToEntity` for `ProfileType` maps `cv_share_token` → `cvShareToken`.

### infrastructure/services — CV storage + share

Rather than duplicate `CareerStorageService`, **reuse it** — its `upload`,
`createShareUrl`, and bucket are already generic over path. The profile CV share
flow (in the web hook, §3) is:

1. Ensure `profile.cvShareToken` (generate + `setCvShareToken` if null).
2. `renderCvHtml(data)` → bytes.
3. `CareerStorageService.upload('{userId}/{token}/cv.html', bytes, 'text/html')`.
4. `CareerStorageService.createShareUrl(path)` → signed URL (inline render).

Rotation (revoke): generate a new token, `setCvShareToken`, re-upload under the
new folder, delete the old folder object. This is simpler than
`rotateShareToken` (single known file `cv.html`, no `cv_file_path` to repoint),
so add a small `rotateCvShareToken(userId, oldToken)` helper in the profile web
infrastructure rather than overloading the career one.

### index.ts / package.json

Export `renderCvHtml`, `EducationType`, education DTOs, `EducationRepository`
from the profile barrels. The `"./profile"` export entry is already added by the
base spec.

## 3. Web — `web/src/modules/profile/`

On top of the base profile presentation:

### Education section

`useEducation.ts` hook + `EducationSection` / `EducationCard` / `EducationEditor`
components, identical in shape to the Experience section (list + add, read/edit
toggle, up/down reorder, delete). Editor fields: school, degree, field, location,
start/end date, `is_current`-style "present" via empty end date, gpa,
achievements (one-per-line textarea → `string[]`).

### CV preview + actions hook — `useCv.ts`

Aggregates the six datasets (profile + five sections) already loaded by their
hooks, and exposes:

- `printHtml()` → `renderCvHtml(data)` (for the print iframe).
- `share()` → runs the upload+sign flow (§2), returns the signed URL, copies it
  to the clipboard, toasts.
- `revokeShare()` → rotation flow; toasts.
- `hasContent` — at least an identity name + one section row, to gate the actions.

### CV bar on `ProfilePage`

`ProfilePage` (from the base spec) gains a sticky action bar:

- **Print / Save PDF** — the hidden same-origin iframe pattern copied verbatim
  from `ItemEditorPage.handlePrint` (`iframe.srcdoc = printHtml()` then
  `contentWindow.print()`). The app document itself is never printed.
- **Copy CV link** — calls `share()`.
- **Revoke link** — `ConfirmDialog` → `revokeShare()` (destructive variant),
  same copy pattern as the career revoke dialog.
- A live structured **preview** (render `renderCvHtml` into an iframe or a styled
  container) so the user sees the résumé as they edit.

No new route — this lives on the existing `/profile` page. No navbar change
beyond the "Profile" link the base spec already adds.

### Seed action — `seedProfile.ts`

An empty-state "Import starter CV" button (shown when the profile has no name and
no section rows) writes the transcribed sample content via the repositories:
`ProfileRepository.upsert` for identity+summary, then `create` per row for each
section. Not a migration (per-user data; mirrors `SEED_BLOCKS`). The transcribed
constant lives at
`web/src/modules/profile/presentation/constants/seedProfile.ts`, populated from
`docs/June_Kyle_Santerna_CV.pdf`:

- **Identity**: June Kyle Santerna · Cebu City, Cebu, Philippines 6000 ·
  (+63) 915-427-8296 · santernakyle@gmail.com · links: linkedin.com/in/jkyle,
  github.com/jikisan · website jikisan.github.io/portfolio/.
- **Summary**: the Professional Summary paragraph.
- **Experience** (4): OnlineJobs.PH, TVStartup Inc, Timex Group,
  Fiverr/Freelance — each with title, location, dates, bullets.
- **Education** (1): University of Cebu – Banilad, BSIT, Jun 2018–Jun 2022,
  GPA 1.7, achievements ["Dean's Lister"].
- **Skills**: grouped — Mobile, Architecture, Web, Backend & Cloud, Testing &
  Automation, Tools, Project Management, Publishing (each entry a `profile_skills`
  row with its `category`).
- **Projects** (3): Flohmarkt, MemberZone, Taily — description + tech.
- **Certificates** (4): ISTQB Certified Tester, State of the Art Android App
  Development in Kotlin, Android Mobile Application Development, Jira Fundamentals
  Badge — issuer, issue date, credential id.

Because `profile_skills` has `UNIQUE (user_id, name)`, the seed inserts skills
once; re-running the seed is guarded by the "no rows" empty-state condition.

### Wiring

`@profile` alias + `/profile` route + nav link are all in the base spec. This
spec adds no further wiring.

## Error handling

Repositories log via `getLogger()` and rethrow friendly `Error`s (career/profile
pattern). Hooks expose `error` for inline UI. RLS (owner-only on every profile
table, folder-owner on storage) is the security boundary; `user_id` filters are
scoping/defense-in-depth. The share link is a 10-year signed URL — the same model
and the same "rotate-the-token-to-revoke" caveat documented in
`CareerStorageService`.

## Testing

Consistent with `career` (CRUD repos untested; only pure logic is tested):

- `web/src/modules/profile/__tests__/sortByPosition.test.ts` — from the base spec.
- `web/src/modules/profile/__tests__/renderCvHtml.test.ts` — the real new logic.
  Assert: empty sections are omitted; a current role and a null `endDate` both
  render "Present"; skills group by `category` with uncategorized under "Other";
  user text with `<`, `&`, `"` is escaped; a fully-populated `CvData` (the seed)
  renders every section heading exactly once.

## Out of scope / deferred

- Per-application tailored CVs (selecting/reordering a subset per job) — v1 is one
  canonical CV. *ponytail: add a selection layer over profile rows if tailoring is
  wanted, rather than resurrecting career text-blocks.*
- Drag-and-drop reordering (up/down buttons suffice).
- Mobile presentation.
- PDF generated server-side / templated designs beyond the single ATS-safe layout.
- Editing `cv_share_token` from the identity form (managed by the share action).
