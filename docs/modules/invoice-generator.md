---
type: module
area: invoice-generator
platforms: [shared, web]
status: active
---

# invoice-generator

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 49 source files · 193 graph nodes
**Import path:** `@himan/shared/invoice-generator`

## Where it lives

- **shared** — `packages/shared/src/modules/invoice-generator/` (14 files)
- **web** — `web/src/modules/invoice-generator/` (35 files)

## Key types & classes

`Invoice`, `InvoiceFolder`, `InvoiceSavedOption`, `CreateInvoiceDto`, `CurrencyCode`, `CurrencyConfig`, `InvoiceData`, `InvoiceFilters`, `InvoiceNumberConfig`, `InvoiceType`, `LineItem`, `UpdateInvoiceDto`, `CreateSavedOptionDto`, `InvoiceSavedOptionType`, `SavedOptionType`, `UpdateSavedOptionDto`, `CreateInvoiceFolderDto`, `InvoiceFolderType`, `UpdateInvoiceFolderDto`, `InvoiceFolderRepository`, `InvoiceRepository`, `SavedOptionRepository`, `InvoiceNumberService`, `InvoicePDFService`

## Blast radius

_Changing these breaks the most callers:_

- `web/src/modules/invoice-generator/domain/types/index.ts` — imported by **25**
- `packages/shared/src/modules/invoice-generator/domain/types/index.ts` — imported by **7**
- `web/src/modules/invoice-generator/domain/entities/InvoiceFolder.ts` — imported by **6**
- `web/src/modules/invoice-generator/presentation/utils/currency.ts` — imported by **6**
- `web/src/modules/invoice-generator/presentation/components/InvoiceSummary.tsx` — imported by **5**
- `web/src/modules/invoice-generator/domain/entities/Invoice.ts` — imported by **4**

## Migrations

- `20260221000000_create_invoice_tables.sql`

---
[[MAP|← back to MAP]]
