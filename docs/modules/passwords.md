---
type: module
area: passwords
platforms: [mobile, shared, web]
status: active
---

# passwords

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 52 source files · 152 graph nodes
**Import path:** `@himan/shared/passwords`

## Where it lives

- **shared** — `packages/shared/src/modules/passwords/` (12 files)
- **web** — `web/src/modules/passwords/` (25 files)
- **mobile** — `mobile/src/modules/passwords/` (15 files)

## Key types & classes

`Category`, `Password`, `PasswordType`, `CategoryType`, `CreateCategoryDto`, `UpdateCategoryDto`, `CreatePasswordDto`, `PasswordFilters`, `UpdatePasswordDto`, `CategoryRepository`, `PasswordRepository`, `EncryptionService`, `CategoryItemProps`, `CategoryListProps`, `PasswordCardProps`, `PasswordDetailsProps`, `PasswordDialogProps`, `PasswordGridProps`, `PasswordItemProps`, `PasswordListProps`, `PasswordTableProps`, `SortDirection`, `SortField`, `CategoryChipsProps`

## Blast radius

_Changing these breaks the most callers:_

- `packages/shared/src/modules/passwords/index.ts` — imported by **15**
- `web/src/modules/passwords/domain/index.ts` — imported by **12**
- `web/src/modules/passwords/domain/entities/Password.ts` — imported by **7**
- `mobile/src/modules/passwords/presentation/hooks/queryKeys.ts` — imported by **4**
- `packages/shared/src/modules/passwords/domain/index.ts` — imported by **3**
- `packages/shared/src/modules/passwords/domain/types/index.ts` — imported by **3**

## Mobile routes

- `mobile/app/(app)/passwords/[passwordId].tsx`
- `mobile/app/(app)/passwords/add.tsx`
- `mobile/app/(app)/passwords.tsx`

## Migrations

- `20251226184934_create_passwords_tables.sql`

---
[[MAP|← back to MAP]]
