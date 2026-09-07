---
type: module
area: storage
platforms: [shared, web]
status: active
---

# storage

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 36 source files · 124 graph nodes
**Import path:** `@himan/shared/storage`

## Where it lives

- **shared** — `packages/shared/src/modules/storage/` (12 files)
- **web** — `web/src/modules/storage/` (24 files)

## Key types & classes

`File`, `StorageFolder`, `CreateStorageFolderDto`, `FileUploadProgress`, `StorageFolderType`, `UpdateStorageFolderDto`, `CreateFileDto`, `FileFilters`, `FileType`, `UpdateFileDto`, `FileRepository`, `StorageFolderRepository`, `StorageService`, `CompressionService`, `ThumbnailService`, `FileCardProps`, `FileDialogProps`, `FileGridProps`, `FilePreviewDialogProps`, `FileUploadButtonProps`, `FolderListProps`

## Blast radius

_Changing these breaks the most callers:_

- `web/src/modules/storage/domain/entities/index.ts` — imported by **10**
- `web/src/modules/storage/domain/types/index.ts` — imported by **6**
- `packages/shared/src/modules/storage/domain/types/index.ts` — imported by **5**
- `web/src/modules/storage/infrastructure/services/index.ts` — imported by **5**
- `web/src/modules/storage/infrastructure/services/CompressionService.ts` — imported by **4**
- `web/src/modules/storage/infrastructure/services/ThumbnailService.ts` — imported by **4**

## Migrations

- `20260106000000_create_storage_tables.sql`
- `20260107000000_create_storage_bucket.sql`

---
[[MAP|← back to MAP]]
