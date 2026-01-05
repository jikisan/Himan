import type {
  NoteType as Note,
  CreateNoteDto,
  UpdateNoteDto,
  NoteFilters,
} from '../../domain';
import { LocalNotesStorage } from '../storage/LocalNotesStorage';
import { NoteSyncService } from '../services/NoteSyncService';
import type { SyncStatus, SyncResult } from '../services/NoteSyncService';
import { NoteRepository } from './NoteRepository';
import { Logger } from '@core/infrastructure/services';

export class HybridNoteRepository {
  private localStorage: LocalNotesStorage;
  private syncService: NoteSyncService;
  private remoteRepository: NoteRepository;
  private hasInitialized = false;

  constructor(userId: string) {
    this.localStorage = new LocalNotesStorage(userId);
    this.remoteRepository = new NoteRepository();
    this.syncService = new NoteSyncService(this.localStorage, this.remoteRepository);
  }

  /**
   * Initialize the repository by pulling remote data and starting auto-sync
   */
  async initialize(): Promise<void> {
    if (this.hasInitialized) return;

    try {
      // Check if we have local data
      const localNotes = this.localStorage.getAll();

      if (localNotes.length === 0) {
        // First time load - pull all notes from remote
        await this.syncService.pullAllNotes();
      } else {
        // We have local data, sync in the background
        this.syncService.sync().catch(err => {
          Logger.error('Background sync failed', err);
        });
      }

      // Start auto-sync timer
      this.syncService.startAutoSync();

      this.hasInitialized = true;
    } catch (error) {
      Logger.error('Failed to initialize hybrid repository', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.syncService.stopAutoSync();
  }

  /**
   * Find all notes matching the filters
   */
  async findAll(filters?: NoteFilters): Promise<Note[]> {
    // Get notes from local storage (instant)
    let notes = this.localStorage.getAll();

    // Apply filters
    if (filters?.folderId !== undefined) {
      notes = notes.filter(note => note.folderId === filters.folderId);
    }

    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      notes = notes.filter(
        note =>
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    if (filters?.isPinned !== undefined) {
      notes = notes.filter(note => note.isPinned === filters.isPinned);
    }

    if (filters?.tags && filters.tags.length > 0) {
      notes = notes.filter(note =>
        filters.tags!.every(tag => note.tags.includes(tag))
      );
    }

    // Sort: pinned first, then by updated date
    notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return notes;
  }

  /**
   * Find a note by ID
   */
  async findById(id: string): Promise<Note | null> {
    return this.localStorage.get(id);
  }

  /**
   * Create a new note (saves locally and marks as dirty)
   */
  async create(dto: CreateNoteDto): Promise<Note> {
    const now = new Date();
    const note: Note = {
      id: this.generateId(),
      title: dto.title,
      content: dto.content,
      excerpt: dto.excerpt,
      folderId: dto.folderId,
      userId: dto.userId,
      isPinned: dto.isPinned ?? false,
      tags: dto.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    // Save to local storage
    this.localStorage.save(note);

    // Mark as dirty (needs sync)
    this.localStorage.markDirty(note.id);

    return note;
  }

  /**
   * Update an existing note (saves locally and marks as dirty)
   */
  async update(id: string, dto: UpdateNoteDto): Promise<Note> {
    const existingNote = this.localStorage.get(id);
    if (!existingNote) {
      throw new Error(`Note with id ${id} not found`);
    }

    const updatedNote: Note = {
      ...existingNote,
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
      ...(dto.folderId !== undefined && { folderId: dto.folderId }),
      ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
      ...(dto.tags !== undefined && { tags: dto.tags }),
      updatedAt: new Date(),
    };

    // Save to local storage
    this.localStorage.save(updatedNote);

    // Mark as dirty (needs sync)
    this.localStorage.markDirty(id);

    return updatedNote;
  }

  /**
   * Delete a note (marks as deleted locally)
   */
  async delete(id: string): Promise<void> {
    // Mark as deleted (will be synced later)
    this.localStorage.markDeleted(id);
  }

  /**
   * Manually trigger a sync
   */
  async sync(): Promise<SyncResult> {
    return this.syncService.sync();
  }

  /**
   * Get the current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncService.getStatus();
  }

  /**
   * Generate a unique ID for a new note
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
