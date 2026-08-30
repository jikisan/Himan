---
type: module
area: notes
platforms: [shared, web]
status: active
---

# notes

> Generated from the code graph. Regenerate with `/graphify` then the vault script.

**Scale:** 39 source files · 169 graph nodes
**Import path:** `@himan/shared/notes`

## Where it lives

- **shared** — `packages/shared/src/modules/notes/` (14 files)
- **web** — `web/src/modules/notes/` (25 files)

## Key types & classes

`Folder`, `Note`, `CreateFolderDto`, `CreateNoteDto`, `LocalNotesStoragePort`, `NoteFilters`, `SyncResult`, `SyncStatus`, `UpdateFolderDto`, `UpdateNoteDto`, `FolderRepository`, `HybridNoteRepository`, `NoteRepository`, `NoteSyncService`, `LocalNotesStorage`, `SyncMetadata`, `EditorToolbarProps`, `FolderItemProps`, `FolderListProps`, `MobileNotesMenuProps`, `NoteEditorProps`, `NoteItemProps`, `NotesListProps`, `RichTextEditorProps`

## Blast radius

_Changing these breaks the most callers:_

- `packages/shared/src/modules/notes/domain/types/index.ts` — imported by **15**
- `web/src/modules/notes/domain/types/index.ts` — imported by **12**
- `web/src/modules/notes/domain/entities/Note.ts` — imported by **8**
- `packages/shared/src/modules/notes/index.ts` — imported by **6**
- `web/src/modules/notes/domain/index.ts` — imported by **6**
- `packages/shared/src/modules/notes/infrastructure/repositories/NoteRepository.ts` — imported by **4**

## Migrations

- `20251226144707_create_notes_tables.sql`

---
[[MAP|← back to MAP]]
