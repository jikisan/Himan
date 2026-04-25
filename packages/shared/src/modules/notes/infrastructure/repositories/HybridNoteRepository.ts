import type {
  Note,
  CreateNoteDto,
  UpdateNoteDto,
  NoteFilters,
  SyncStatus,
  SyncResult,
  LocalNotesStoragePort,
} from '../../domain/types/index.js';
import { NoteSyncService } from '../services/NoteSyncService.js';
import { NoteRepository } from './NoteRepository.js';
import { getLogger } from '../../../../services/index.js';

export class HybridNoteRepository {
  private localStorage: LocalNotesStoragePort;
  private syncService: NoteSyncService;
  private remoteRepository: NoteRepository;
  private hasInitialized = false;

  constructor(_userId: string, localStorage: LocalNotesStoragePort) {
    this.localStorage = localStorage;
    this.remoteRepository = new NoteRepository();
    this.syncService = new NoteSyncService(this.localStorage, this.remoteRepository);
  }

  async initialize(): Promise<void> {
    if (this.hasInitialized) return;

    try {
      const localNotes = this.localStorage.getAll();

      if (localNotes.length === 0) {
        await this.syncService.pullAllNotes();
      } else {
        this.syncService.sync().catch(err => {
          getLogger().error('Background sync failed', err);
        });
      }

      this.syncService.startAutoSync();

      this.hasInitialized = true;
    } catch (error) {
      getLogger().error('Failed to initialize hybrid repository', error);
      throw error;
    }
  }

  cleanup(): void {
    this.syncService.stopAutoSync();
  }

  async findAll(filters?: NoteFilters): Promise<Note[]> {
    let notes = this.localStorage.getAll();

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

    notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });

    return notes;
  }

  async findById(id: string): Promise<Note | null> {
    return this.localStorage.get(id);
  }

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

    this.localStorage.save(note);
    this.localStorage.markDirty(note.id);

    return note;
  }

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

    this.localStorage.save(updatedNote);
    this.localStorage.markDirty(id);

    return updatedNote;
  }

  async delete(id: string): Promise<void> {
    this.localStorage.markDeleted(id);
  }

  async sync(isUserInitiated = true): Promise<SyncResult> {
    return this.syncService.sync(isUserInitiated);
  }

  getSyncStatus(): SyncStatus {
    return this.syncService.getStatus();
  }

  isNoteDirty(noteId: string): boolean {
    const dirtyIds = this.localStorage.getDirtyNoteIds();
    return dirtyIds.includes(noteId);
  }

  getDirtyNoteIds(): string[] {
    return this.localStorage.getDirtyNoteIds();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
