export interface Note {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  folderId: string | null;
  userId: string;
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  userId: string;
  noteCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteDto {
  title: string;
  content: string;
  excerpt: string;
  folderId: string | null;
  userId: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  excerpt?: string;
  folderId?: string | null;
  isPinned?: boolean;
  tags?: string[];
}

export interface CreateFolderDto {
  name: string;
  color?: string | null;
  icon?: string | null;
  userId: string;
}

export interface UpdateFolderDto {
  name?: string;
  color?: string | null;
  icon?: string | null;
}

export interface NoteFilters {
  folderId?: string | null;
  searchQuery?: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface SyncStatus {
  pending: number;
  syncing: boolean;
  error: string | null;
  lastSyncTime: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  idMappings?: Map<string, string>;
}

export interface LocalNotesStoragePort {
  save(note: Note): void;
  get(noteId: string): Note | null;
  getAll(): Note[];
  delete(noteId: string): void;
  markDirty(noteId: string): void;
  markClean(noteId: string): void;
  markDeleted(noteId: string): void;
  getDirtyNoteIds(): string[];
  getDeletedNoteIds(): string[];
  getLastSyncTime(): number;
  updateLastSyncTime(): void;
}
