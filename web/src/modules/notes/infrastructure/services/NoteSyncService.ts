import type { Note } from '../../domain/types';
import { LocalNotesStorage } from '../storage/LocalNotesStorage';
import { NoteRepository } from '../repositories/NoteRepository';
import { Logger } from '@core/infrastructure/services';

export interface SyncStatus {
  pending: number;
  syncing: boolean;
  error: string | null;
  lastSyncTime: number;
}

export interface SyncResult {
  success: boolean;
  error?: string;
  idMappings?: Map<string, string>; // Map of old local IDs to new UUIDs
}

export class NoteSyncService {
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private isSyncing = false;
  private isUserInitiatedSync = false; // Track if sync is user-initiated
  private localStorage: LocalNotesStorage;
  private remoteRepository: NoteRepository;

  constructor(
    localStorage: LocalNotesStorage,
    remoteRepository: NoteRepository
  ) {
    this.localStorage = localStorage;
    this.remoteRepository = remoteRepository;
  }

  /**
   * Start the auto-sync timer
   */
  startAutoSync(): void {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      const pendingCount = this.getPendingCount();
      if (pendingCount > 0) {
        this.sync().catch(err => {
          Logger.error('Auto-sync failed', err);
        });
      }
    }, this.SYNC_INTERVAL);
  }

  /**
   * Stop the auto-sync timer
   */
  stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Get the current sync status
   */
  getStatus(): SyncStatus {
    return {
      pending: this.getPendingCount(),
      // Only show syncing spinner for user-initiated syncs
      syncing: this.isSyncing && this.isUserInitiatedSync,
      error: null,
      lastSyncTime: this.localStorage.getLastSyncTime(),
    };
  }

  /**
   * Perform a full sync: push local changes, pull remote changes, resolve conflicts
   * @param isUserInitiated - Whether this sync was triggered by the user (shows spinner)
   */
  async sync(isUserInitiated = false): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, error: 'Sync already in progress' };
    }

    this.isSyncing = true;
    this.isUserInitiatedSync = isUserInitiated;
    const idMappings = new Map<string, string>();

    try {
      // Step 1: Push deleted notes
      await this.syncDeletedNotes();

      // Step 2: Push dirty notes (and collect ID mappings)
      const mappings = await this.syncDirtyNotes();
      mappings.forEach((newId, oldId) => idMappings.set(oldId, newId));

      // Step 3: Pull remote notes and resolve conflicts
      await this.pullRemoteNotes();

      // Update last sync time
      this.localStorage.updateLastSyncTime();

      return { success: true, idMappings };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      Logger.error('Sync failed', error);
      return { success: false, error: errorMessage };
    } finally {
      this.isSyncing = false;
      this.isUserInitiatedSync = false;
    }
  }

  /**
   * Pull all notes from remote and save to local storage
   * Used for initial load or full refresh
   */
  async pullAllNotes(): Promise<Note[]> {
    try {
      const remoteNotes = await this.remoteRepository.findAll();

      // Save all remote notes to local storage
      remoteNotes.forEach(note => {
        this.localStorage.save(note);
        this.localStorage.markClean(note.id);
      });

      return remoteNotes;
    } catch (error) {
      Logger.error('Failed to pull all notes', error);
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
        Logger.error(`Failed to sync deletion for note ${noteId}`, error);
        // Continue with other deletions
      }
    }
  }

  private async syncDirtyNotes(): Promise<Map<string, string>> {
    const dirtyIds = this.localStorage.getDirtyNoteIds();
    const idMappings = new Map<string, string>();

    for (const noteId of dirtyIds) {
      const localNote = this.localStorage.get(noteId);
      if (!localNote) {
        // Note doesn't exist locally anymore, mark as clean
        this.localStorage.markClean(noteId);
        continue;
      }

      try {
        // Check if this is a local temporary ID (not a UUID)
        const isLocalId = this.isLocalId(noteId);

        if (isLocalId) {
          // This is a new note that was created locally, create it on Supabase
          const createdNote = await this.remoteRepository.create({
            title: localNote.title,
            content: localNote.content,
            excerpt: localNote.excerpt,
            folderId: localNote.folderId,
            userId: localNote.userId,
            isPinned: localNote.isPinned,
            tags: localNote.tags,
          });

          // Delete the old local ID and save with the new UUID from Supabase
          this.localStorage.delete(noteId);
          this.localStorage.save(createdNote);
          this.localStorage.markClean(createdNote.id);

          // Record the ID mapping
          idMappings.set(noteId, createdNote.id);
        } else {
          // This is an existing note with a UUID, check if it exists remotely
          const remoteNote = await this.remoteRepository.findById(noteId);

          if (!remoteNote) {
            // Note doesn't exist remotely anymore, remove from local
            this.localStorage.delete(noteId);
            this.localStorage.markClean(noteId);
          } else {
            // Note exists, check for conflicts
            const shouldUpdate = this.resolveConflict(localNote, remoteNote);

            if (shouldUpdate) {
              // Local version is newer, update remote
              await this.remoteRepository.update(noteId, {
                title: localNote.title,
                content: localNote.content,
                excerpt: localNote.excerpt,
                folderId: localNote.folderId,
                isPinned: localNote.isPinned,
                tags: localNote.tags,
              });
            } else {
              // Remote version is newer, update local
              this.localStorage.save(remoteNote);
            }

            this.localStorage.markClean(noteId);
          }
        }
      } catch (error) {
        Logger.error(`Failed to sync note ${noteId}`, error);
        // Continue with other notes
      }
    }

    return idMappings;
  }

  /**
   * Check if an ID is a local temporary ID (timestamp-based) vs a UUID
   */
  private isLocalId(id: string): boolean {
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    // Local ID format: timestamp-randomstring (e.g., 1767627438474-9hijnr42e)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return !uuidRegex.test(id);
  }

  private async pullRemoteNotes(): Promise<void> {
    try {
      const remoteNotes = await this.remoteRepository.findAll();
      const localNotes = this.localStorage.getAll();

      // Create a map of local notes for quick lookup
      const localNotesMap = new Map(localNotes.map(note => [note.id, note]));

      // Update local storage with remote notes
      remoteNotes.forEach(remoteNote => {
        const localNote = localNotesMap.get(remoteNote.id);

        if (!localNote) {
          // Note doesn't exist locally, save it
          this.localStorage.save(remoteNote);
          this.localStorage.markClean(remoteNote.id);
        } else {
          // Note exists locally, check if remote is newer
          const shouldUpdate = remoteNote.updatedAt > localNote.updatedAt;

          if (shouldUpdate) {
            // Check if local note is dirty
            const isDirty = this.localStorage.getDirtyNoteIds().includes(remoteNote.id);

            if (!isDirty) {
              // Local note is not dirty, safe to update
              this.localStorage.save(remoteNote);
              this.localStorage.markClean(remoteNote.id);
            }
            // If dirty, local changes take precedence (already handled in syncDirtyNotes)
          }
        }
      });

      // Remove local notes that don't exist remotely (unless they're dirty or deleted)
      localNotes.forEach(localNote => {
        const remoteExists = remoteNotes.some(r => r.id === localNote.id);
        const isDirty = this.localStorage.getDirtyNoteIds().includes(localNote.id);
        const isDeleted = this.localStorage.getDeletedNoteIds().includes(localNote.id);

        if (!remoteExists && !isDirty && !isDeleted) {
          // Note was deleted remotely, remove from local
          this.localStorage.delete(localNote.id);
        }
      });
    } catch (error) {
      Logger.error('Failed to pull remote notes', error);
      throw error;
    }
  }

  /**
   * Resolve conflict between local and remote versions using last-modified-wins strategy
   * Returns true if local should be used, false if remote should be used
   */
  private resolveConflict(localNote: Note, remoteNote: Note): boolean {
    // Compare timestamps - last modified wins
    return localNote.updatedAt >= remoteNote.updatedAt;
  }
}
