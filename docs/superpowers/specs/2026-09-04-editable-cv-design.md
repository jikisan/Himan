---
type: spec
area: himan
status: proposed
date: 2026-09-04
---

# Editable Structured CV — Design

## Summary

Add a structured CV/résumé that reproduces the layout of the sample
(`docs/June_Kyle_Santerna_CV.pdf`): a centered identity header, professional
summary, work experience with bullets, education, category-grouped skills,
projects, and certificates. The user edits the structured data on `/profile`,
then in the **CV section** of the `career` module clicks **Generate from profile**
to render a print-ready résumé and upload it as the item's CV. From
there the existing career CV pipeline takes over: preview, download, copy a
signed share link, revoke. The generated CV *replaces* the manual PDF-file
upload the CV panel does today — same panel, same storage/share plumbing, new
source.

### How we got here

The request began as "an editable CV like the cover letter, using blocks." The
cover letter (`career` module) assembles freeform text **blocks** into flowing
paragraphs. Two clarifications changed the substrate:

- **CV look** → *structured résumé* (headings, bullets, skills grid — the PDF),
  not flowing prose.
- **Block granularity** → *rich, first-class* section types.

A structured résumé with first-class section types **is** structured data, not
freeform text blobs. Overloading `career_blocks.body TEXT` with company / title /
dates / bullets would fight that schema. The `profile` module — already built
(`20260903000000_create_profiles.sql`, domain + infrastructure + web
presentation, `/profile` page, seed) — is exactly the right substrate: one
structured table per résumé section. This CV is therefore a **structured
renderer** over the profile module, surfaced inside the `career` module's CV
section. The renderer (`renderCvHtml`) reads profile data; the upload,
preview, signed-URL share and revoke reuse the **career item's existing
pipeline** (`shareToken`, `cvFilePath`, `CareerStorageService`) unchanged. The
CV panel's manual "pick a PDF from disk" is swapped for "Generate from
profile".

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

- **Placement**: the CV editor/generator lives in the **`career` module's CV
  section** (the existing `CvUploadPanel` on `ItemEditorPage`), not on
  `/profile`. `/profile` remains where the structured data is *edited*.
- **Education**: add a `profile_education` table + full layer.
- **Generate → upload → share**: a **Generate from profile** action renders the
  résumé HTML (`renderCvHtml`) and uploads it as the career item's CV. Preview,
  download, copy signed link and revoke all reuse the **career item's existing**
  `shareToken` / `cvFilePath` / `CareerStorageService` flow — **no new share
  token, no `cv_share_token` column**.
- **Seed** (already implemented, `20260904000000_seed_profile_data.sql` +
  `feat: seed profile data`): profile content sourced from the live portfolio
  (<https://jikisan.github.io/portfolio/>); education and phone backfilled from
  the PDF.
- **Platform**: web only.
- **v1 = one canonical CV** rendered from the profile, attached per career item.
  Per-application tailored CVs (select/reorder a subset per job) are **deferred**.

This spec **supersedes the coexistence/`render_kind` idea** from earlier
discussion — the CV does not use `career_item_blocks` at all.

## Relationship to the profile-module spec

The base profile module is already built — domain + infrastructure in
`packages/shared/`, presentation in `web/`, `@profile` alias, `/profile` route,
identity form, experience/skills/project/certificate sections, hooks,
`sortByPosition`, seed. This spec **extends** it with: (1) the `profile_education`
section, (2) the CV renderer (`renderCvHtml`), and wires them into the
**`career` module's CV section** for generate → upload → preview/download/share.
The share plumbing itself already exists in `career` (`CvUploadPanel`,
`CareerStorageService`, per-item `shareToken`/`cvFilePath`, `rotateShareLink`)
and is reused, not rebuilt.

---

## 1. Migration — `profile_education`

New migration `supabase/migrations/20260905000000_create_profile_education.sql`
(timestamp sorts after the existing profiles + seed migrations):

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
```

`gpa` is TEXT because grading scales differ (the sample uses the Philippine 1.0–5.0
scale where 1.7 is high). `achievements TEXT[]` matches the sample's bulleted list.

**No `cv_share_token` column, no `profiles` change.** The generated CV is stored
and shared through the **career item that owns it**: the CV HTML lands in the
existing `career` bucket under the item's folder `{userId}/{item.shareToken}/`,
and `career_items.cv_file_path` points at it — exactly where a manually-uploaded
`cv.pdf` goes today. The only file-name change is `cv.pdf` → `cv.html` (the
career bucket already allows `text/html` and owner-only folder RLS keyed on
`(storage.foldername(name))[1] = auth.uid()`).

## 2. Shared package — `packages/shared/src/modules/profile/`

On top of the base profile module:

### domain/types — add education

- `EducationType`: `id, userId, school, degree, field, location, startDate,
  endDate, gpa, achievements, position, createdAt, updatedAt`.
- `CreateEducationDto` (`userId` + editable fields, `position` optional),
  `UpdateEducationDto` (partial editable fields).
- No change to `ProfileType` — the CV share token lives on the career item, not
  the profile.

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

No `ProfileRepository` change — no token to write.

### infrastructure/services — reuse career storage as-is

There is **no new service**. The career item already owns the share token,
storage folder and rotation:

- Upload: `CareerStorageService.upload('{userId}/{item.shareToken}/cv.html',
  bytes, 'text/html')`, then `CareerItemRepository.update(itemId, { cvFilePath:
  path })`.
- Preview / download / copy-link: the existing `createShareUrl(cvFilePath)`.
- Revoke: the existing `rotateShareLink` — it already regenerates the token,
  moves the folder, and repoints `cvFilePath`.

**One small career-side change:** `buildStoragePath` and `CareerStorageService`
rotation currently hard-code `cv.pdf`. Widen the file name to
`'cv.pdf' | 'cv.html'`, and make rotation repoint whatever basename the current
`cvFilePath` uses (preserve the extension) instead of assuming `cv.pdf`. This is
the only edit inside `packages/shared/career`.

### index.ts / package.json

Export `renderCvHtml`, `EducationType`, education DTOs, `EducationRepository`
from the profile barrels. The `"./profile"` export entry already exists.

## 3. Web

Two web surfaces change: `/profile` gains the Education section (data editing);
the `career` CV panel gains generate-from-profile (the CV itself).

### 3a. Profile — Education section (`web/src/modules/profile/`)

`useEducation.ts` hook + `EducationSection` / `EducationCard` / `EducationEditor`
components, identical in shape to the Experience section (list + add, read/edit
toggle, up/down reorder, delete). Editor fields: school, degree, field, location,
start/end date, "present" via empty end date, gpa, achievements (one-per-line
textarea → `string[]`). Rendered on the existing `ProfilePage`. This is the only
`/profile` change — no CV bar, no `useCv`, no share UI on `/profile`.

The seed (already shipped) and all other profile sections are unchanged.

### 3b. Career — Generate CV from profile (`web/src/modules/career/`)

The CV lives where it already does: `CvUploadPanel` on `ItemEditorPage`. Today
the panel's primary action picks a PDF from disk (`handleUploadCv`). Replace that
source with **Generate from profile**; everything else on the panel (preview
iframe, copy link, download, revoke) stays.

**Data.** `ItemEditorPage` reads the six profile datasets via the profile hooks
it doesn't own yet — `useProfile`, `useExperiences`, `useEducation`, `useSkills`,
`useProjects`, `useCertificates` (all already exist except `useEducation` from
§3a). A small `useCvData()` wrapper in career presentation aggregates them into
the `CvData` shape and exposes `hasContent` (identity name + ≥1 section row).
*ponytail: cross-module hook import, not a new store — the hooks already
own the fetching.*

**Generate handler** (replaces `handleUploadCv`), reusing the existing storage
plumbing verbatim:

```ts
const html = renderCvHtml(cvData);            // profile usecase, pure
const bytes = new TextEncoder().encode(html);
const path = buildStoragePath(user.id, item.shareToken, 'cv.html');
await storage.upload(path, bytes, 'text/html');
await updateItem(item.id, { cvFilePath: path });
```

After that, `item.cvFilePath` is set and the existing `useEffect` that calls
`createShareUrl(cvFilePath)` populates the preview iframe (HTML renders inline).
`handleCopyCvLink`, `handleDownloadCv`, and `handleRevoke` are unchanged — they
already operate on `cvFilePath` / `shareToken`.

**Panel UI** — in `CvUploadPanel`, swap the "Upload"/click-to-upload affordance
for a **Generate from profile** button. When the profile has no content, the
button is disabled with a hint linking to `/profile` ("Add your profile details
first"). Regenerating overwrites `cv.html` in place (same path), so the existing
share link keeps working and simply serves the refreshed CV. Download filename
becomes `cv.html` (was `cv.pdf`).

**Optional Print/Save PDF.** For a true PDF the user can still use the browser's
print-to-PDF via the same hidden-iframe pattern the cover letter already uses
(`iframe.srcdoc = renderCvHtml(cvData)` → `contentWindow.print()`). Reuses
`iframeRef`; add a Printer button to the CV panel. *ponytail: no PDF library —
browser print is the existing, dependency-free path; skip until a self-serve PDF
download is actually asked for.*

### Wiring

`@profile` alias + `/profile` route + nav link already exist. Career already
routes `/career/:itemId`. The only new cross-module dependency is career
presentation importing profile hooks + `renderCvHtml` through the profile
barrels — no new alias, no new route.

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
- Self-serve PDF download of the generated CV (browser print-to-PDF covers it;
  the shared/downloaded file is `cv.html`).
- Keeping the manual "upload a PDF from disk" path — replaced by generate.
