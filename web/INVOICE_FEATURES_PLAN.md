# Invoice Generator: PDF Storage, Folders, Saved Options & Auto-Numbering

## Context

The invoice generator module currently generates PDFs locally with no persistence. The sidebar categories are placeholder with no backend. All form data is local React state that's lost on refresh. This plan adds 4 features:

1. **Save PDF to Supabase** - Upload generated PDFs to Supabase Storage, store invoice metadata in database
2. **Folder management** - Sidebar categories become real folders backed by Supabase, with CRUD and invoice organization
3. **Saved option lists** - Separate reusable saved options for Company Details, Bill To, Notes, Bank Details (select from dropdown or type manually)
4. **Auto-generate invoice/PO numbers** - Configurable format per folder (e.g., `INV-{YYYY}-{NNN}`, `ACME-{NNN}`), auto-increments on save

## Key Technical Discovery

`react-to-pdf`'s `generatePDF` (default export) returns `Promise<jsPDF>` when called with `method: 'build'`. This lets us call `pdfInstance.output('blob')` to get a `Blob` for Supabase upload, then optionally `pdfInstance.save(filename)` for local download. The current `usePDF().toPDF()` returns `void` and must be replaced.

---

## Step 1: Database Migration

**Create** `web/supabase/migrations/20260221000000_create_invoice_tables.sql`

### Table: `invoice_folders`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| user_id | UUID NOT NULL | FK → auth.users, ON DELETE CASCADE |
| name | TEXT NOT NULL | max 100 chars |
| invoice_number_prefix | TEXT | optional prefix for `{PREFIX}` token |
| invoice_number_format | TEXT | default `'INV-{YYYY}-{NNN}'` |
| next_sequence_number | INTEGER | default 1, incremented after each save |
| invoices_count | INTEGER | default 0, maintained by trigger |
| created_at, updated_at | TIMESTAMPTZ | defaults + trigger |

### Table: `invoices`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | FK → auth.users |
| folder_id | UUID | FK → invoice_folders, ON DELETE SET NULL |
| invoice_number | TEXT NOT NULL | |
| po_number | TEXT | |
| company_details, bill_to | TEXT | |
| invoice_date, due_date | DATE | |
| currency | TEXT | default 'PHP' |
| line_items | JSONB | `[{description, unitCost, quantity}]` |
| tax_rate, discount, shipping_fee | NUMERIC | |
| subtotal, tax_amount, total | NUMERIC | pre-computed for display/sorting |
| notes, bank_details | TEXT | |
| storage_path | TEXT | path in Supabase Storage |
| file_size | BIGINT | |
| is_favorite | BOOLEAN | default false |
| created_at, updated_at | TIMESTAMPTZ | |

### Table: `invoice_saved_options`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | FK → auth.users |
| option_type | TEXT NOT NULL | CHECK IN ('company_details', 'bill_to', 'notes', 'bank_details') |
| label | TEXT NOT NULL | display name, max 100 chars |
| value | TEXT NOT NULL | the actual content, max 2000 chars |
| is_default | BOOLEAN | default false |
| sort_order | INTEGER | default 0 |
| created_at, updated_at | TIMESTAMPTZ | |

### Additional SQL
- Indexes on user_id, folder_id, invoice_number, is_favorite, option_type
- RLS policies (SELECT/INSERT/UPDATE/DELETE) for all 3 tables, pattern: `auth.uid() = user_id`
- `updated_at` triggers using existing `update_updated_at_column()` function
- `invoices_count` trigger on invoices table (insert/update/delete adjust folder count)

### Supabase Storage Bucket
- Bucket: `invoices`, private, 10MB limit, allowed: `['application/pdf']`
- Storage RLS policies for user-scoped access (`auth.uid()::text = (storage.foldername(name))[1]`)

---

## Step 2: Domain Layer

**Modify** `web/src/modules/invoice-generator/domain/types/index.ts`
- Add types: `InvoiceFolderType`, `InvoiceType`, `InvoiceSavedOptionType`
- Add DTOs: `CreateInvoiceFolderDto`, `UpdateInvoiceFolderDto`, `CreateInvoiceDto`, `UpdateInvoiceDto`, `CreateSavedOptionDto`, `UpdateSavedOptionDto`
- Add: `SavedOptionType = 'company_details' | 'bill_to' | 'notes' | 'bank_details'`
- Add: `InvoiceFilters`, `InvoiceNumberConfig`

**Create** `web/src/modules/invoice-generator/domain/entities/InvoiceFolder.ts`
- Properties: id, userId, name, invoiceNumberPrefix, invoiceNumberFormat, nextSequenceNumber, invoicesCount, timestamps
- Method: `generateNextInvoiceNumber()` - replaces `{YYYY}`, `{MM}`, `{PREFIX}`, `{NNN}` tokens
- Pattern reference: `web/src/modules/storage/domain/entities/StorageFolder.ts`

**Create** `web/src/modules/invoice-generator/domain/entities/Invoice.ts`
- All InvoiceType fields + computed: `formattedTotal`, `hasStoredPDF`

**Create** `web/src/modules/invoice-generator/domain/entities/InvoiceSavedOption.ts`

**Create** `web/src/modules/invoice-generator/domain/entities/index.ts`

---

## Step 3: Infrastructure Layer (new directory)

### Repositories

**Create** `web/src/modules/invoice-generator/infrastructure/repositories/InvoiceFolderRepository.ts`
- `findAll(userId)`, `findById(id, userId)`, `create(dto)`, `update(id, userId, dto)`, `delete(id, userId)`
- `incrementSequence(id, userId)` - atomic UPDATE ... SET next_sequence_number = next_sequence_number + 1 RETURNING
- Pattern reference: `web/src/modules/storage/infrastructure/repositories/StorageFolderRepository.ts`

**Create** `web/src/modules/invoice-generator/infrastructure/repositories/InvoiceRepository.ts`
- CRUD with filters (folderId, searchQuery, isFavorite)
- `mapToEntity()` parses JSONB line_items
- Pattern reference: `web/src/modules/storage/infrastructure/repositories/FileRepository.ts`

**Create** `web/src/modules/invoice-generator/infrastructure/repositories/SavedOptionRepository.ts`
- `findAllByType(userId, optionType)`, `findAll(userId)`, CRUD

### Services

**Create** `web/src/modules/invoice-generator/infrastructure/services/InvoicePDFService.ts`
- Static methods: `upload(userId, invoiceId, pdfBlob)`, `delete(storagePath)`, `getSignedUrl(storagePath)`, `download(storagePath)`
- Bucket: `'invoices'`, path pattern: `{userId}/{invoiceId}.pdf`
- Pattern reference: `web/src/modules/storage/infrastructure/services/StorageService.ts`

**Create** `web/src/modules/invoice-generator/infrastructure/services/InvoiceNumberService.ts`
- `static generate(format, sequence, prefix?)` - replaces tokens: `{YYYY}`, `{YY}`, `{MM}`, `{PREFIX}`, `{NNN}` (variable N width)
- Example: `generate('INV-{YYYY}-{NNN}', 1)` → `'INV-2026-001'`
- Example: `generate('{PREFIX}-{NNN}', 42, 'ACME')` → `'ACME-042'`

**Create** barrel exports: `repositories/index.ts`, `services/index.ts`, `infrastructure/index.ts`

---

## Step 4: Presentation Hooks

**Create** `web/src/modules/invoice-generator/presentation/hooks/useInvoiceFolders.ts`
- React Query with key factory `['invoice-folders', 'list', userId]`
- CRUD mutations with cache invalidation
- Pattern reference: `web/src/modules/storage/presentation/hooks/useStorageFolders.ts`

**Create** `web/src/modules/invoice-generator/presentation/hooks/useInvoices.ts`
- React Query with filters (folderId, search, isFavorite)
- Create mutation also increments folder sequence + invalidates folder queries
- Pattern reference: `web/src/modules/storage/presentation/hooks/useFiles.ts`

**Create** `web/src/modules/invoice-generator/presentation/hooks/useSavedOptions.ts`
- Fetches all options (grouped by type on client side) or by specific type
- CRUD mutations

**Create** `web/src/modules/invoice-generator/presentation/hooks/useInvoicePDF.ts`
- `generateAndSave(targetRef, invoiceData, folderId, { alsoDownload? })`:
  1. Call `generatePDF(targetRef, { method: 'build', ... })` → jsPDF instance
  2. `pdfInstance.output('blob')` → Blob
  3. Upload via `InvoicePDFService.upload(userId, invoiceId, blob)`
  4. If `alsoDownload`, call `pdfInstance.save(filename)`
  5. Return `{ invoiceId, storagePath, fileSize }`

**Create** `web/src/modules/invoice-generator/presentation/hooks/useInvoiceNumber.ts`
- `getNextInvoiceNumber(folder)` → calls `InvoiceNumberService.generate()`

**Create** `web/src/modules/invoice-generator/presentation/hooks/index.ts`

---

## Step 5: New UI Components

**Create** `web/src/modules/invoice-generator/presentation/components/SavedOptionSelect.tsx`
- Small dropdown button next to textarea labels (Company Details, Bill To, Notes, Bank Details)
- Shows list of saved options → clicking one fills the field
- "Save Current" button saves textarea content as new option
- "Manage..." opens the management dialog

**Create** `web/src/modules/invoice-generator/presentation/components/SavedOptionDialog.tsx`
- Dialog for managing saved options of a specific type
- List existing options with edit/delete buttons
- Form to add new option (label + value textarea)
- Uses Dialog, Input, Textarea, Button from `@/components/ui`

**Create** `web/src/modules/invoice-generator/presentation/components/FolderSettingsDialog.tsx`
- Configure folder's invoice number format
- Fields: prefix (input), format pattern (input with token help text), preview of next number
- Reset sequence button

**Create** `web/src/modules/invoice-generator/presentation/components/InvoiceList.tsx`
- Displays saved invoices in the main area (shown via "Saved" tab)
- Table/grid with: invoice number, date, bill_to, total, currency
- Actions: View PDF (signed URL), Download, Move to Folder, Delete, Toggle Favorite

---

## Step 6: Modify Existing Components

**Modify** `web/src/modules/invoice-generator/presentation/utils/pdf.ts`
- Add `getPDFBuildOptions()` returning options with `method: 'build'` (no filename)

**Modify** `web/src/modules/invoice-generator/presentation/components/InvoiceHeader.tsx`
- Add `SavedOptionSelect` next to Company Details and Bill To textareas
- Accept new props: `savedCompanyOptions`, `savedBillToOptions`, `onManageSavedOptions`
- Invoice Number field: show auto-generated value when folder selected, with edit override icon

**Modify** `web/src/modules/invoice-generator/presentation/components/InvoiceFooter.tsx`
- Add `SavedOptionSelect` next to Notes and Bank Details textareas
- Accept new props: `savedNotesOptions`, `savedBankOptions`, `onManageSavedOptions`

**Modify** `web/src/modules/invoice-generator/presentation/components/CategoryList.tsx`
- Pass real folder data from `useInvoiceFolders` (count from `folder.invoicesCount`)
- Labels stay: "All Invoices", "Favorites", "Uncategorized"

**Modify** `web/src/modules/invoice-generator/presentation/components/InvoiceGenerator.tsx` (major changes)
- Replace `usePDF` with `useRef` for targetRef + `useInvoicePDF` for generation
- Wire `useInvoiceFolders` → pass to CategoryList, replace placeholder categories
- Wire `useInvoices` with folder filter → pass to InvoiceList
- Wire `useSavedOptions` → group by type, pass to InvoiceHeader/InvoiceFooter
- Wire `useInvoiceNumber` → `useEffect` auto-fills invoiceNumber when folder changes
- Add "Saved" tab alongside "Form" and "Preview"
- Add `uploadToSupabase` checkbox state (default: false), placed next to the Generate PDF button
  - When unchecked: button says "Generate PDF", only downloads locally via `pdfInstance.save()`
  - When checked: button says "Generate & Upload", generates PDF + uploads to Supabase Storage + saves invoice metadata to database + increments folder sequence
  - Checkbox remembers its state via localStorage for convenience
- `handleGeneratePDF`: check `uploadToSupabase` flag → if true, call `generateAndSave()` + `createInvoice()` + increment sequence; if false, just call `generatePDF()` with `method: 'save'` for local download only
- Add state/handlers for `SavedOptionDialog` and `FolderSettingsDialog`

**Update** `web/src/modules/invoice-generator/index.ts` - export new types

---

## Implementation Order

1. **Database migration** (foundation)
2. **Domain types + entities** (types everything depends on)
3. **Infrastructure repositories + services** (data access)
4. **Presentation hooks** (bridges infra to UI)
5. **Folder management** (simplest UI change, validates backend)
6. **PDF save to Supabase** (core workflow)
7. **Auto invoice numbering** (depends on folders + invoices)
8. **Saved option lists** (independent, can parallelize with 7)

---

## Verification Plan

1. **Folders**: Create/rename/delete folders in sidebar. Verify they persist across refresh.
2. **PDF Save**: Generate a PDF, check Supabase Storage dashboard for the file, check `invoices` table for metadata row.
3. **Saved Invoices Tab**: Switch to "Saved" tab, verify invoice appears with correct data. Click to view/download PDF.
4. **Move Invoice**: Move an invoice to a different folder. Verify folder counts update.
5. **Saved Options**: Save a company details option. Create new invoice, select saved option from dropdown. Verify field fills.
6. **Auto Numbering**: Select a folder with format `INV-{YYYY}-{NNN}`. Verify invoice number auto-fills as `INV-2026-001`. Generate and save. Verify next invoice shows `INV-2026-002`.
7. **Custom Format**: Edit folder settings to `ACME-{NNN}` with prefix. Verify numbering changes.
8. **Run `npm run lint`** and **`npm run build`** to verify no type errors.
