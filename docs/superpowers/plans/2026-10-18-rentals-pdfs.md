---
type: plan
area: rentals
status: draft
created: 2026-10-18
spec: docs/superpowers/specs/2026-10-16-rentals-design.md
---

# Rentals Step B — PDFs (bill and payment receipt)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development for every deliverable. Single agent, sequential tasks.

**Goal:** From the landlord app, download a real-text PDF of a bill (Statement of Account, with payment accounts and QR images) and of a payment receipt (acknowledgment receipt, with the amount in words). The contract and deposit-settlement PDFs reuse the same PDF foundation in Steps C and D; downloads from the renter link arrive in Step C.

**Architecture:** `@react-pdf/renderer` in `web/` only, loaded lazily (dynamic `import()`) when a PDF button is pressed so it never enters the main bundle (the spike measured +441 KB gzip). Pure data shaping (what goes on each document) lives in the shared domain so it is unit-tested without rendering. A tiny font module registers a TTF that contains `₱` (the built-in Helvetica prints `±`).

**Spec:** `docs/superpowers/specs/2026-10-16-rentals-design.md` (parts A, B; Statement of Account layout in "Phase 2 part 1").

## Global Constraints

- Conventional commits, **no AI attribution, no `Co-Authored-By`**; description as sentences starting with verbs, one per line.
- Money = integer centavos; show whole pesos without `.00` via `formatBillPesos`; `₱` must render (verify with `pdftoppm -png -r 60` + look at the image, and `pdftotext` shows `₱`).
- `react-pdf` does not read WOFF2. Register a **TTF or WOFF** that includes U+20B1 (e.g. Noto Sans from `@fontsource/noto-sans` latin-ext, or a bundled TTF under `web/public/assets/fonts/` with its OFL text). Keep it small; load it with the PDF chunk only.
- New dependencies allowed: `@react-pdf/renderer` (web), `to-words` (packages/shared, for `en-PH` amount in words), plus the font source. Nothing else. Install from the repo root with `--workspace`.
- No DOM APIs in `packages/shared`; inside it, imports use `.js` extensions.
- PDF rendering code lives under `web/src/modules/rentals/presentation/pdf/` and must never be imported statically from non-PDF code (use `await import('…')`).
- Tests: `cd web && npx vitest run src/modules/rentals/`. PDF render tests use `// @vitest-environment node` and `renderToBuffer`. Build `cd web && npm run build`; lint `npx eslint src/modules/rentals`.
- Do not touch `supabase/` or any database.

## Review Focus

1. Peso sign and long property / tenant names (wrapping, 60-line bills) render correctly on A4 with page breaks that don't split a line.
2. Amount in words for edge amounts: ₱0.50, ₱1, ₱1,000,000.01, centavos rounding — never "NaN", never wrong grammar.
3. A bill with a missing logo/QR image (URL 404, offline) still downloads (QR skipped, text accounts kept).
4. Viewers can download bills but not payment proof images (receipts never embed proofs).
5. The PDF chunk is not in the main bundle (check the build output).

## Tasks

### B1 — Foundation: dependency, font, amount in words
**Files:** `packages/shared/src/modules/rentals/domain/words.ts` (+ export), `web/src/modules/rentals/presentation/pdf/{fonts.ts,styles.ts}`, tests `web/src/modules/rentals/__tests__/words.test.ts`, `pdf.foundation.test.tsx`.
- Contract: `pesosInWords(centavos: number): string` → e.g. `20000.5` → "Twenty Thousand Pesos And Fifty Centavos Only" (as verified with `to-words` `en-PH`, `currency: true`); throws on negative / non-integer.
- Fonts: `registerPdfFonts()` registers regular + bold from a TTF/WOFF with `₱`; idempotent.
- Tests first; then the render smoke test: a one-line document with `₱10,000` produces a PDF whose text (via `pdftotext` if available in the environment, else by checking the font was embedded) contains `₱`.
- Commit: `feat: add pdf foundation and peso amount in words`.

### B2 — Bill PDF
**Files:** `presentation/pdf/BillPdf.tsx`, shared `domain/documents.ts` (`billDocument(bill, ctx)` shaping), tests.
- Layout = the Statement of Account already on screen (`Statement.tsx`, `statementText`): header (owner name and address, tenant, room, month, bill date, number) · rent and charges · Water and Electricity with both reading dates and values, usage, rate, amount (and "1/3 share") · total · previous balance and paid · due date · **Pay to** accounts (kind, name, number) with the QR image next to each when it loads · footer (late-fee note, "Received by").
- `billDocument` is pure and tested for: line ordering, meter detail, previous balance, paid / remaining, accounts, late-fee footer present only when the property has a late fee.
- QR images are fetched with a short timeout; any failure skips only that image (Review Focus 3).
- Commit: `feat: add bill statement pdf`.

### B3 — Receipt PDF
**Files:** `presentation/pdf/ReceiptPdf.tsx`, shared `documents.ts` (`receiptDocument`), tests.
- "Acknowledgment Receipt": receipt no. = `R-` + first 8 characters of the payment id uppercased (comment `ponytail:` — real numbering later if needed) · date · "Received from <tenant>" · amount in figures and in words · method and reference · "applied to" the bill numbers and amounts from the payment's allocations · remaining balance and credit after this payment · "Received by <lessor name>" and signature line. Never include proof images.
- Void payments render a "VOID — <reason>" banner.
- Commit: `feat: add payment receipt pdf`.

### B4 — Wire downloads into the app
**Files:** `BillSheet.tsx`, `PaymentsList.tsx`, `presentation/pdf/download.ts`, tests.
- "Download PDF" on a bill; "Receipt PDF" on every active payment. Both `await import('./pdf/download')`, show a spinner/disabled state, and on failure show a plain message. File names: `Statement-<bill number>.pdf`, `Receipt-<R-id>.pdf`.
- Download uses a Blob + temporary anchor; viewers can download bills, not receipts' proofs (nothing to hide) — receipts available to managers and viewers alike.
- Tests (mock the dynamic import): button calls the generator with the right data; disabled while generating; error message on failure.
- Verify the build output: the PDF chunk is separate and not referenced by the entry chunk.
- Commit: `feat: download bill and receipt pdfs`.

### B5 — Lead: review, docs
Fresh reviewer on the whole step; fix Critical/Important with RED→GREEN; manual check: generate both PDFs from the dev app against the local stack and look at the PNG render; update `docs/modules/rentals.md`.
