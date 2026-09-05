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

## Related

[[grocery]] · [[grocery-redesign-plan]] · [[MAP]]
