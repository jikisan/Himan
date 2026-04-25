import type { Note, SyncStatus, SyncResult, LocalNotesStoragePort } from '../../domain/types/index.js';
import { NoteRepository } from '../repositories/NoteRepository.js';
import { getLogger } from '../../../../services/index.js';

export class NoteSyncService {
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private isSyncing = false;
  private isUserInitiatedSync = false;
  private localStorage: LocalNotesStoragePort;
  private remoteRepository: NoteRepository;

  constructor(
    localStorage: LocalNotesStoragePort,
    remoteRepository: NoteRepository
  ) {
    this.localStorage = localStorage;
    this.remoteRepository = remoteRepository;
  }

  startAutoSync(): void {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      const pendingCount = this.getPendingCount();
      if (pendingCount > 0) {
        this.sync().catch(err => {
          getLogger().error('Auto-sync failed', err);
        });
      }
    }, this.SYNC_INTERVAL);
  }

  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  getStatus(): SyncStatus {
    return {
      pending: this.getPendingCount(),
      syncing: this.isSyncing && this.isUserInitiatedSync,
      error: null,
      lastSyncTime: this.localStorage.getLastSyncTime(),
    };
  }

  async sync(isUserInitiated = false): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.isUserInitiatedSync = isUserInitiated;
    const idMappings = new Map<string, string>();

    try {
      await this.syncDeletedNotes();

      const mappings = await this.syncDirtyNotes();
      mappings.forEach((newId, oldId) => idMappings.set(oldId, newId));

      await this.pullRemoteNotes();

      this.localStorage.updateLastSyncTime();

      return { success: true, idMappings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      getLogger().error('Sync failed', error);
      return { success: false, error: errorMessage };
    } finally {
      this.isSyncing = false;
      this.isUserInitiatedSync = false;
    }
  }

  async pullAllNotes(): Promise<Note[]> {
    try {
      const remoteNotes = await this.remoteRepository.findAll();

      remoteNotes.forEach(note => {
        this.localStorage.save(note);
        this.localStorage.markClean(note.id);
      });

      return remoteNotes;
    } catch (error) {
      getLogger().error('Failed to pull all notes', error);
      throw error;
    }
  }

  private getPendingCount(): number {
    const dirtyCount = this.localStorage.getDirtyNoteIds().length;
    const deletedCount = this.localStorage.getDeletedNoteIds().length;
    return dirtyCount + deletedCount;
  }

  private async syncDeletedNotes(): Promise<void> {
    const deletedIds = this.localStorage.getDeletedNoteIds();

    for (const noteId of deletedIds) {
      try {
        await this.remoteRepository.delete(noteId);
        this.localStorage.delete(noteId);
        this.localStorage.markClean(noteId);
      } catch (error) {
        getLogger().error(`Failed to sync deletion for note ${noteId}`, error);
      }
    }
  }

  private async syncDirtyNotes(): Promise<Map<string, string>> {
    const dirtyIds = this.localStorage.getDirtyNoteIds();
    const idMappings = new Map<string, string>();

    for (const noteId of dirtyIds) {
      const localNote = this.localStorage.get(noteId);
      if (!localNote) {
        this.localStorage.markClean(noteId);
        continue;
      }

      try {
        const isLocalId = this.isLocalId(noteId);

        if (isLocalId) {
          const createdNote = await this.remoteRepository.create({
            title: localNote.title,
            content: localNote.content,
            excerpt: localNote.excerpt,
            folderId: localNote.folderId,
            userId: localNote.userId,
            isPinned: localNote.isPinned,
            tags: localNote.tags,
          });

          this.localStorage.delete(noteId);
          this.localStorage.save(createdNote);
          this.localStorage.markClean(createdNote.id);

          idMappings.set(noteId, createdNote.id);
        } else {
          const remoteNote = await this.remoteRepository.findById(noteId);

          if (!remoteNote) {
            this.localStorage.delete(noteId);
            this.localStorage.markClean(noteId);
          } else {
            const shouldUpdate = this.resolveConflict(localNote, remoteNote);

            if (shouldUpdate) {
              await this.remoteRepository.update(noteId, {
                title: localNote.title,
                content: localNote.content,
                excerpt: localNote.excerpt,
                folderId: localNote.folderId,
                isPinned: localNote.isPinned,
                tags: localNote.tags,
              });
            } else {
              this.localStorage.save(remoteNote);
            }

            this.localStorage.markClean(noteId);
          }
        }
      } catch (error) {
        getLogger().error(`Failed to sync note ${noteId}`, error);
      }
    }

    return idMappings;
  }

  private isLocalId(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return !uuidRegex.test(id);
  }

  private async pullRemoteNotes(): Promise<void> {
    try {
      const remoteNotes = await this.remoteRepository.findAll();
      const localNotes = this.localStorage.getAll();

      const localNotesMap = new Map(localNotes.map(note => [note.id, note]));

      remoteNotes.forEach(remoteNote => {
        const localNote = localNotesMap.get(remoteNote.id);

        if (!localNote) {
          this.localStorage.save(remoteNote);
          this.localStorage.markClean(remoteNote.id);
        } else {
          const shouldUpdate = remoteNote.updatedAt > localNote.updatedAt;

          if (shouldUpdate) {
            const isDirty = this.localStorage.getDirtyNoteIds().includes(remoteNote.id);

            if (!isDirty) {
              this.localStorage.save(remoteNote);
              this.localStorage.markClean(remoteNote.id);
            }
          }
        }
      });

      localNotes.forEach(localNote => {
        const remoteExists = remoteNotes.some(r => r.id === localNote.id);
        const isDirty = this.localStorage.getDirtyNoteIds().includes(localNote.id);
        const isDeleted = this.localStorage.getDeletedNoteIds().includes(localNote.id);

        if (!remoteExists && !isDirty && !isDeleted) {
          this.localStorage.delete(localNote.id);
        }
      });
    } catch (error) {
      getLogger().error('Failed to pull remote notes', error);
      throw error;
    }
  }

  private resolveConflict(localNote: Note, remoteNote: Note): boolean {
    return localNote.updatedAt >= remoteNote.updatedAt;
  }
}
