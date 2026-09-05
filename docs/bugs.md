---
type: bug-list
area: grocery
status: open
---

# Bugs

Open items, all in mobile grocery **session/errand mode** — see [[grocery]].

- [x] **Purchase edit dialog is price-only.** Moving an item to purchased should also allow
      editing name, qty, and unit. Price stays focused on initial open.
      → `mobile/src/modules/grocery/presentation/components/errand/ErrandItemEditModal.tsx`
- [x] **No purchased total.** Session mode should show a running total price for purchased items.
- [x] **Collapse the two-tab session view.** Session mode currently splits "all items" and
      "purchased" into two tabs. Offer a single combined list, keeping the two-tab version as
      an option.
      → note [[grocery-redesign-plan]]'s newer `DESIGN.md` direction explicitly removes
      `GroceryListTabSwitcher`, so this may already be partly resolved — verify before building.
- [x] **Generating CV pdf included the Save as PDF button in pdf** — removed the
      embedded `<button>` from `renderCvHtml`; it only hid under `@media print`,
      which html2canvas ignores, so it rasterized into the PDF.
- [x] CV Preview does not match saved/generated pdf — preview now renders in
      `CvPreviewFrame` at the same fixed 794px (A4 @96dpi) the PDF is rasterized
      at, scaled to fit, so it wraps line-for-line like the output (invoice pattern).
- [x] generated pdf does not match reference cv — `cvStyles` reformatted to the
      portfolio résumé: Helvetica, 15mm margins, centered header, uppercase
      section headings with a full-width rule, bold title + right-aligned dates.
- [x] remove print/save cv button
- [x] auto renaming of cv ex: June_Kyle_Santern_CV_Android.pdf {name}_"CV"_{career_item}.pdf
      — download names the file `{fullName}_CV_{item}.pdf` (`handleDownloadCv`).
- [x] CV blocks dont have kind, label, and tags same as cover letter blocks, add them. and keep title and body
      — added a CV-specific `CvBlockKind` (summary/experience/skills/project/education/certification/custom)
      plus `label`/`tags` columns on `career_cv_blocks` (migration `20260908000000`); editor + list show them.
- [x] add other links for profile like github, linkedin, etc. — `ProfileHeaderForm` now edits
      the `links` map: named GitHub/LinkedIn/Twitter fields plus add-your-own label/URL rows.
- [x] add main social links in cv blocks body like in cv letter ex: {{github}}, {{linkedin}}
      — `renderCvHtml` resolves `{{token}}` in custom-block bodies against `profileTokens(profile)`
      (contact fields + every link key); unset tokens drop out.
- [x] add a section that shows all hooks can be used in cv blocks like {{github}}, {{linkedin}}, etc.
      — CV block editor lists available hooks as click-to-insert chips (`STANDARD_CV_TOKENS` + link keys).
- [x] in cv blocks, show also the blocks generated from profile, and maybe add a button to go to profile to edit them
      — Block Library CV tab lists profile-sourced blocks (dashed) with an "Edit in profile" button.
- [x] make the cv url shorter — "Copy CV link" now copies `{origin}/cv/{shareToken}`;
      a Cloudflare Pages Function (`web/functions/cv/[token].ts`) looks the token up
      with the service-role key and 302s to a fresh 1h signed URL. Rotating the token
      404s the old link (revocation). **Deploy: set `SUPABASE_URL` +
      `SUPABASE_SERVICE_ROLE_KEY` env vars on the Cloudflare Pages project.**
- [x] fix the edit in profile button in cv blocks, the icon is on top of text
      — root cause: `Button` ignored `asChild`, so the `<Link>` nested inside a
      `<button>` and never got the button's `inline-flex`. `Button` now renders a
      Radix `Slot` when `asChild` (standard shadcn pattern); fixes every `asChild` button.
## Related

[[grocery]] · [[grocery-redesign-plan]] · [[MAP]]
