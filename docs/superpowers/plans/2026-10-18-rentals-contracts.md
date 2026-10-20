---
type: plan
area: rentals
status: draft
created: 2026-10-18
spec: docs/superpowers/specs/2026-10-16-rentals-design.md
---

# Rentals Step C — Contracts, Invite Link, E-sign, Renewals

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development for every deliverable. Tasks C1 and C2 may run in parallel (disjoint files); C3 then C4 run in order.

**Goal:** A landlord creates a contract from an editable per-property template, sends the tenant ONE private link, and the tenant (a) fills in their details if they are new, (b) reads and signs the contract with a drawn signature, and (c) sees their bills and payment accounts and downloads PDFs. The landlord reviews submitted details, countersigns in one tap, and downloads the signed contract PDF. Renewals start a new contract on the same tenant.

**Architecture:** Tables + token-keyed `SECURITY DEFINER` RPCs (the only anonymous access; no table grants to `anon`). Signatures are small PNG data URLs stored in text columns (no storage for signatures). ID photos from an invited tenant go to a separate private bucket `rental-link-uploads` that `anon` can insert into only under an open link's token folder; on **Accept** the landlord's client copies them into `rental-files` as the tenant's ID. Contract text is rendered from clauses with placeholders in the shared domain and **frozen with a SHA-256 hash at signing**. The public page is a lazy route outside every auth guard (copy how `/p/:token` portfolio is routed).

**Spec:** `docs/superpowers/specs/2026-10-16-rentals-design.md` — part C and the earlier decisions Q9, Q18–Q20 (sign modes, witnesses, 90-day expiry, no ID on the link). Prior art for token RPCs: `supabase/migrations/20260927174630_career_portfolio.sql` (`get_career_portfolio`) and `20261003160000_portfolio_slugs.sql`.

## Global Constraints

- Conventional commits, **no AI attribution, no `Co-Authored-By`**; description as sentences starting with verbs, one per line.
- All anonymous reads/writes go through RPCs keyed by the link token; `anon` gets EXECUTE on those RPCs only. Tokens: 32 random bytes, base64url, generated in Postgres. Revoke/regenerate invalidates the old token. A link is valid until `move_out + 90 days` (no move-out = no expiry) and not revoked.
- The link never returns ID files, proof images, other tenants, or anything of other properties. Tenant-submitted data never overwrites the renter record until a manager accepts it.
- Safeguards: link locks after one details submission (a manager can reopen); max 3 ID files, 10 MB each, PDF/JPEG/PNG, only while the link is open; signature PNG data URL ≤ 150 KB and must start `data:image/png;base64,`; a signed contract text cannot change; one tenant signature per contract text.
- Privacy notice with a required checkbox before the tenant can submit details (the owner is to have wording checked by a lawyer; mark the string `// TODO owner: legal review` in code).
- Money = integer centavos; amounts in words via `pesosInWords` (Step B). Dates `YYYY-MM-DD`, Manila today.
- Roles: owner edits the template and the saved signature; managers create/send contracts, review details, countersign, upload notarized scans; viewers read only.
- Existing patterns apply (see the Step A plan's Global Constraints); inside `packages/shared` imports use `.js`; no DOM APIs there. PDFs use the lazy `@react-pdf/renderer` setup from Step B (`presentation/pdf/`).
- New dependency: `signature_pad` (web only; MIT). Nothing else.
- Local DB recipe and "never touch the hosted database" as in the Step A plan; the lead applies migrations.

## Review Focus

1. An anonymous caller with a guessed/old/revoked/expired token gets nothing and learns nothing (same error for all three); a valid token for tenancy X cannot read or sign anything of tenancy Y.
2. Double-submit and replay: submitting details twice, signing twice, signing after the text changed, signing a draft that was never sent — all refused with readable messages.
3. The tenant-submitted details cannot reach the renter record, other tenants, or the ID bucket of `rental-files` without a manager's Accept; storage policy lets `anon` insert only into an open link's folder, never read or list.
4. A contract's frozen text and hash cannot be edited after the tenant signs (even by managers through the API); countersign requires the tenant signature first.
5. Existing-tenant link shows the contract only and cannot edit details; new-tenant link cannot sign before details are submitted.
6. Template placeholders that have no value (no lessor civil status, no owner address) render a visible blank line, never the literal `{{field}}` or `undefined`.

## Shared contract

### Database (migration `supabase/migrations/20261018200000_add_rental_contracts.sql`)

- `rental_properties`: add `lessor_signature text NULL` (PNG data URL ≤ 150 KB), UPDATE grant for the owner column only; `max_occupants` is a literal in template text, not a column.
- `rental_contract_templates(property_id uuid PK FK, clauses jsonb NOT NULL, updated_at)`; `clauses` = array of `{ "id": text, "text": text }` (1..80 items, text ≤ 4000). Select viewer; insert/update owner. No row = use the domain default.
- `rental_contract_texts(id, property_id, contract_id uuid UNIQUE FK rental_contracts, body jsonb NOT NULL, special_terms text ≤ 4000 DEFAULT '', status text IN ('draft','sent','signed','countersigned') DEFAULT 'draft', sign_mode text NULL IN ('esign','notarize'), content_hash text NULL, tenant_name text NULL, tenant_signature text NULL, tenant_signed_at timestamptz NULL, tenant_user_agent text NULL, lessor_signed_by uuid NULL, lessor_signed_at timestamptz NULL, lessor_signature text NULL, notarized_scan_path text NULL, created_at, updated_at)`. `body` = array of rendered strings (placeholders already resolved). Managers insert (status 'draft') and may update `body`/`special_terms` only while status is 'draft' or 'sent'; a trigger freezes everything once `tenant_signed_at` is set except `notarized_scan_path` and the lessor fields.
- `rental_tenancy_links(tenancy_id uuid PK FK, property_id, token text UNIQUE, kind text IN ('new','existing'), status text IN ('open','submitted','accepted') DEFAULT 'open', submitted_details jsonb NULL, submitted_at timestamptz NULL, accepted_at timestamptz NULL, revoked_at timestamptz NULL, created_at)`. Select/insert/update manager (column-scoped). `submitted_details` = `{ fullName, phone, address, emergencyName, emergencyPhone, facebook, email, occupants, idPaths: text[] }`.
- Bucket `rental-link-uploads` (private, ≤ 10 MB, pdf/jpeg/png). Object path `{token}/{uuid}.{ext}`. Policies: `anon` + `authenticated` INSERT when the first folder is an open link token whose upload count < 3; managers SELECT/DELETE for their property's link tokens; nobody else.

### RPCs

Anonymous (GRANT EXECUTE to `anon, authenticated`; never leak which of invalid/expired/revoked occurred — one message `This link isn't valid anymore`):
- `rental_link_get(p_token text) RETURNS jsonb` — `{ kind, status, tenantName, property: { name, address, lessorName, lessorCapacity, signingCity, invoicePrefix }, contract: { id, status, body, specialTerms, signMode, tenantSignedAt, lessorSigned: boolean, contentHash } | null, bills: [...issued bills with lines, due_on, number, paid, balance], payments: [{ paidOn, amount, method, reference, billNumbers }], accounts: [{ kind, label, accountName, accountNumber, qrPath }] }` — read-only; **no** IDs, proofs, other tenants, landlord signature image only when countersigned.
- `rental_link_submit_details(p_token text, p_details jsonb) RETURNS void` — only when kind 'new' and status 'open'; validates required fields (full name, mobile, address, emergency name + number, ≥ 1 id path that exists under `{token}/` in `rental-link-uploads`); sets status 'submitted'.
- `rental_link_sign(p_token text, p_name text, p_sign_mode text, p_signature text, p_user_agent text) RETURNS void` — requires a contract text with status 'sent'; for kind 'new' requires status ≠ 'open'; computes `content_hash` = hex SHA-256 of `body` joined with `\n` plus `\nSPECIAL:` + `special_terms`; stores tenant fields; sets status 'signed'.
Managers (authenticated; each checks role itself):
- `rental_create_link(p_tenancy_id uuid, p_kind text) RETURNS text` (token; replaces an existing link = regenerate), `rental_revoke_link(p_tenancy_id uuid)`, `rental_reopen_link(p_tenancy_id uuid)` (status back to 'open', clears submitted_at).
- `rental_accept_details(p_tenancy_id uuid) RETURNS jsonb` — copies submitted details into the tenancy's renter row, returns `{ idPaths: text[] }` for the client to copy into `rental-files` as `rental_renter_files` rows; sets status 'accepted'.
- `rental_send_contract(p_contract_text_id uuid)` (draft → sent), `rental_countersign(p_contract_text_id uuid, p_signature text DEFAULT NULL)` (needs tenant signature; uses the property's saved signature when null), `rental_set_notarized_scan(p_contract_text_id uuid, p_path text)`.

### Shared domain (`packages/shared/src/modules/rentals/domain/contracts.ts`, exported)

```ts
export interface Clause { id: string; text: string }
export const DEFAULT_CLAUSES: Clause[]          // from the owner's sample, personal details replaced by fields
export const CONTRACT_FIELDS: { key: string; label: string }[]   // for the "Insert field" menu
export function renderClauses(clauses: Clause[], values: ContractValues): string[]   // missing value → "__________"
export function contractValues(input: { property; renter?; contract; unit? }): ContractValues
export function canonicalText(body: string[], specialTerms: string): string          // exactly what rental_link_sign hashes
export async function sha256Hex(text: string): Promise<string>                        // uses globalThis.crypto.subtle (no DOM types)
export function ordinal(n: number): string       // "30th"
export function contractStatusLabel(status, signMode): string  // plain words for the UI
export function linkMessage(url: string, tenantName: string, kind: 'new' | 'existing'): string
```
Placeholders: `{{lessor_name}} {{lessor_civil_status}} {{lessor_address}} {{lessor_capacity}} {{lessee_name}} {{lessee_address}} {{property_address}} {{term_start}} {{term_end}} {{monthly_rent}} {{monthly_rent_words}} {{due_day_ordinal}} {{advance}} {{advance_words}} {{deposit}} {{deposit_words}} {{signing_city}} {{signing_date}}`. Amounts in words via `pesosInWords`.

### Repositories (`infrastructure/`)

- `ContractRepository`: `findTexts()`, `getTemplate(propertyId)`, `saveTemplate(propertyId, clauses)`, `createText(contractId, propertyId, body, specialTerms)`, `updateText(id, { body?, specialTerms? })`, `send(id)`, `countersign(id, signature?)`, `setNotarizedScan(id, file)` (upload to `rental-files` under `{property}/contracts/{id}/…` then RPC), `saveLessorSignature(propertyId, png)`.
- `LinkRepository`: manager side `createLink / revoke / reopen / findAll / acceptDetails(tenancyId)` (+ copy ID files from `rental-link-uploads` to `rental-files` and insert `rental_renter_files` rows via the reserve-then-upload path); public side `getPublic(token)`, `uploadId(token, file)`, `submitDetails(token, details)`, `sign(token, input)`.

## Tasks

### C1 — Database (parallel with C2)
Migration + SQL tests first (all Review Focus items 1–5: invalid/revoked/expired token; double submit; frozen text; anon storage insert only into an open link folder; wrong tenancy). The existing `supabase/tests/rentals.sql` must stay green. Commit: `feat: add rental contracts, signing links and invite uploads`.

### C2 — Shared domain + repositories + template text (parallel with C1)
Tests first. `DEFAULT_CLAUSES`: read the owner's sample at `/Users/jk/Downloads/Contract-of-Lease short.pdf` (the 27 clauses, preamble and closing); convert to the placeholders above; **remove every personal detail** (the owner's name and address, the property address, the storage-room exclusion — that becomes "special terms") and keep amounts and periods as fields. Tests: every placeholder resolves; missing values give blanks; `canonicalText` and `sha256Hex` match a fixed vector; `contractValues` formats the due-day ordinal and amounts in words; no literal `{{` survives rendering of the default template with full values. Repository tests with mocked Supabase. Commit: `feat: add rentals contract domain and repositories`.

### C3 — Landlord UI (after C1 and C2)
- Tenant sheet **Contract** section: Create contract (draft from template + Special terms box + live preview) → Send link (Copy link for Messenger, `linkMessage`) → status in plain words → Countersign (one tap using the saved signature) → upload notarized scan (only when the tenant chose "notarize") → Download PDF. A `ContractPdf` in `presentation/pdf/` (lazy; text from `body`; signature images; witness lines blank; notary acknowledgment page only when `sign_mode = 'notarize'`; signed contract text frozen).
- Add tenant: **"Send details link"** choice — name stays required, everything else optional; creates the link (kind 'new'); tenant shows "Waiting for details". "Already a tenant?" also lists tenants from the owner's other properties (copy contact details only; ID re-uploaded). Existing tenants get a link of kind 'existing' when a contract is sent.
- Home to-dos: "Review details from <name>" (Accept → copies ID files) and "Countersign contract for <name>", "Contract ends in 30 days"; Tenants list shows "Waiting for details".
- Edit property: **Contract template** editor (edit / add / remove / reorder clauses, "Insert field" menu, "Reset to default") and **My signature** (draw once with `signature_pad`, save, replace).
- Renewals: "New rent from [month]" / renewal creates the new contract as today; "Create contract" for it is optional.
- Tests first for each behaviour; viewers see statuses read-only. Commit in logical pieces.

### C4 — Public renter page (after C3)
- Route `/r/:token` (lazy, outside every guard, no app shell, phone-first). States: invalid/expired/revoked → one friendly message; **new** tenant → short details form (required: full name, mobile, home address, emergency name + number, valid-ID photo(s) up to 3; optional: Facebook/Messenger, email, people living there) + privacy notice checkbox → "Thanks, your landlord will review" → then the contract; **existing** tenant → contract directly, no editing ("Something wrong? Tell your landlord").
- Contract page: read the frozen text, choose "Sign online only" or "Sign online, then notarize", draw signature (`signature_pad`), type full name, Sign; after signing: signed view + Download PDF; the Bills tab shows bills, balance, payments, payment accounts with QR, and Download PDF for each bill and receipt (reuse Step B documents, generated in the browser from the RPC data — no ID or proof).
- Tests first (mock `LinkRepository`): invalid token message; required fields block submit; checkbox required; submit locks the form; cannot sign twice; viewers n/a. Commit: `feat: add renter link page for details and contract signing`.

### C5 — Lead: review, host migration, docs
Fresh reviewer on the step (Review Focus 1–6, security first); fix Critical/Important RED→GREEN; apply the migration to the hosted project (one transaction + `migration repair`), verify RLS, buckets and that `anon` can execute only the three `rental_link_*` RPCs; manual pass in the browser (create contract → copy link → open `/r/:token` in a second tab as an anonymous user → sign → countersign → PDF); update `docs/modules/rentals.md`.
