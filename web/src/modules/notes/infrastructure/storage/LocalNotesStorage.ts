import type { Note } from '../../domain/types';

interface SyncMetadata {
  dirtyNotes: Set<string>;
  deletedNotes: Set<string>;
  lastSyncTime: number;
}

export class LocalNotesStorage {
  private readonly NOTES_PREFIX = 'notes';
  private readonly META_KEY = 'notes:meta';
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Save a note to local storage
   */
  save(note: Note): void {
    const key = this.getNoteKey(note.id);
    localStorage.setItem(key, JSON.stringify(this.serializeNote(note)));
  }

  /**
   * Get a single note by ID
   */
  get(noteId: string): Note | null {
    const key = this.getNoteKey(noteId);
    const data = localStorage.getItem(key);
    if (!data) return null;

    try {
      return this.deserializeNote(JSON.parse(data));
    } catch {
      return null;
    }
  }

  /**
   * Get all notes for the current user
   */
  getAll(): Note[] {
    const notes: Note[] = [];
    const prefix = this.getUserPrefix();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && !key.includes(':meta')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            notes.push(this.deserializeNote(JSON.parse(data)));
          } catch {
            // Skip invalid entries
          }
        }
      }
    }

    return notes;
  }

  /**
   * Delete a note from local storage
   */
  delete(noteId: string): void {
    const key = this.getNoteKey(noteId);
    localStorage.removeItem(key);
  }

  /**
   * Mark a note as dirty (needs sync)
   */
  markDirty(noteId: string): void {
    const meta = this.getMeta();
    meta.dirtyNotes.add(noteId);
    this.saveMeta(meta);
  }

  /**
   * Mark a note as clean (synced)
   */
  markClean(noteId: string): void {
    const meta = this.getMeta();
    meta.dirtyNotes.delete(noteId);
    meta.deletedNotes.delete(noteId);
    this.saveMeta(meta);
  }

  /**
   * Mark a note as deleted (needs deletion sync)
   */
  markDeleted(noteId: string): void {
    const meta = this.getMeta();
    meta.deletedNotes.add(noteId);
    meta.dirtyNotes.delete(noteId);
    this.saveMeta(meta);
  }

  /**
   * Get all dirty note IDs
   */
  getDirtyNoteIds(): string[] {
    const meta = this.getMeta();
    return Array.from(meta.dirtyNotes);
  }

  /**
   * Get all deleted note IDs
   */
  getDeletedNoteIds(): string[] {
    const meta = this.getMeta();
    return Array.from(meta.deletedNotes);
  }

  /**
   * Get the last sync timestamp
   */
  getLastSyncTime(): number {
    const meta = this.getMeta();
    return meta.lastSyncTime;
  }

  /**
   * Update the last sync timestamp
   */
  updateLastSyncTime(): void {
    const meta = this.getMeta();
    meta.lastSyncTime = Date.now();
    this.saveMeta(meta);
  }

  /**
   * Clear all notes and metadata for the current user
   */
  clearAll(): void {
    const prefix = this.getUserPrefix();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  private getNoteKey(noteId: string): string {
    return `${this.getUserPrefix()}:${noteId}`;
  }

  private getUserPrefix(): string {
    return `${this.NOTES_PREFIX}:${this.userId}`;
  }

  private getMetaKey(): string {
    return `${this.META_KEY}:${this.userId}`;
  }

  private getMeta(): SyncMetadata {
    const data = localStorage.getItem(this.getMetaKey());
    if (!data) {
      return {
        dirtyNotes: new Set<string>(),
        deletedNotes: new Set<string>(),
        lastSyncTime: 0,
      };
    }

    try {
      const parsed = JSON.parse(data);
      return {
        dirtyNotes: new Set(parsed.dirtyNotes || []),
        deletedNotes: new Set(parsed.deletedNotes || []),
        lastSyncTime: parsed.lastSyncTime || 0,
      };
    } catch {
      return {
        dirtyNotes: new Set<string>(),
        deletedNotes: new Set<string>(),
        lastSyncTime: 0,
      };
    }
  }

  private saveMeta(meta: SyncMetadata): void {
    const data = {
      dirtyNotes: Array.from(meta.dirtyNotes),
      deletedNotes: Array.from(meta.deletedNotes),
      lastSyncTime: meta.lastSyncTime,
    };
    localStorage.setItem(this.getMetaKey(), JSON.stringify(data));
  }

  private serializeNote(note: Note): Record<string, unknown> {
    return {
      ...note,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  private deserializeNote(data: Record<string, unknown>): Note {
    return {
      id: data.id as string,
      title: data.title as string,
      content: data.content as string,
      excerpt: data.excerpt as string,
      folderId: data.folderId as string | null,
      userId: data.userId as string,
      isPinned: data.isPinned as boolean,
      tags: (data.tags as string[]) || [],
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }
}
