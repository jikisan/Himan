import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { NoteType as Note, NoteFilters, CreateNoteDto, UpdateNoteDto } from '../../domain';
import { HybridNoteRepository } from '../../infrastructure/repositories';
import { LocalNotesStorage } from '../../infrastructure/storage/LocalNotesStorage';
import type { SyncStatus } from '@himan/shared/notes';
import { useAuth } from '@auth/presentation/hooks/useAuth';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { Logger } from '@core/infrastructure/services';

export const useNotes = (filters?: NoteFilters) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    syncing: false,
    error: null,
    lastSyncTime: 0,
  });
  const { user } = useAuth();
  const { canCreateNote, canSaveNoteContent, refreshUsage } = useSubscription();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const userId = user?.id;
  const repository = useMemo(() => {
    if (!userId) return null;
    return new HybridNoteRepository(userId, new LocalNotesStorage(userId));
  }, [userId]);

  // Stabilize filters to prevent unnecessary re-renders
  const tagsKey = JSON.stringify(filters?.tags);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on primitives, not `filters` itself
  const stableFilters = useMemo(() => filters, [
    filters?.folderId,
    filters?.searchQuery,
    filters?.isPinned,
    tagsKey,
  ]);

  const loadNotes = useCallback(async () => {
    if (!userId || !repository) {
      setLoading(false);
      return;
    }

    // Prevent duplicate requests
    if (isLoadingRef.current) {
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // Initialize repository (pulls remote data if first time)
      await repository.initialize();

      // Load notes from local storage
      const data = await repository.findAll(stableFilters);
      setNotes(data);

      // Update sync status
      setSyncStatus(repository.getSyncStatus());

      hasLoadedRef.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      setError(errorMessage);
      Logger.error('Error loading notes', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, repository, stableFilters]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch-on-mount
    loadNotes();
  }, [loadNotes]);

  // Cleanup repository on unmount
  useEffect(() => {
    return () => {
      if (repository) {
        repository.cleanup();
      }
    };
  }, [repository]);

  // Sync notes manually
  const syncNotes = useCallback(async (currentNoteId?: string | null): Promise<string | null> => {
    if (!repository) return null;

    setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));

    const result = await repository.sync();

    if (result.success) {
      // Refresh notes after sync
      const data = await repository.findAll(stableFilters);
      setNotes(data);
      setSyncStatus(repository.getSyncStatus());
      // Refresh usage counts after sync
      await refreshUsage();

      // If there were ID mappings and we have a current note ID, check if it was remapped
      if (result.idMappings && currentNoteId && result.idMappings.has(currentNoteId)) {
        return result.idMappings.get(currentNoteId) || null;
      }

      return null;
    } else {
      setSyncStatus(prev => ({
        ...prev,
        syncing: false,
        error: result.error || 'Sync failed',
      }));
      return null;
    }
  }, [repository, stableFilters, refreshUsage]);

  const createNote = useCallback(
    async (dto: Omit<CreateNoteDto, 'userId'>): Promise<Note | null> => {
      if (!userId || !repository) return null;

      // Check if user can create a note
      const accessCheck = canCreateNote();
      if (!accessCheck.allowed) {
        const errorMessage = accessCheck.reason || 'Cannot create note';
        setError(errorMessage);
        return null;
      }

      try {
        const newNote = await repository.create({ ...dto, userId });
        setNotes((prev) => [newNote, ...prev]);
        // Update sync status
        setSyncStatus(repository.getSyncStatus());
        // Refresh usage counts after creating
        await refreshUsage();
        return newNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
        setError(errorMessage);
        Logger.error('Error creating note', err);
        return null;
      }
    },
    [userId, repository, canCreateNote, refreshUsage]
  );

  const updateNote = useCallback(
    async (id: string, dto: UpdateNoteDto): Promise<Note | null> => {
      if (!repository) return null;

      // Check content length if content is being updated
      if (dto.content !== undefined) {
        const accessCheck = canSaveNoteContent(dto.content.length);
        if (!accessCheck.allowed) {
          const errorMessage = accessCheck.reason || 'Content exceeds tier limit';
          setError(errorMessage);
          return null;
        }
      }

      try {
        const updatedNote = await repository.update(id, dto);
        setNotes((prev) =>
          prev.map((note) => (note.id === id ? updatedNote : note))
        );
        // Update sync status
        setSyncStatus(repository.getSyncStatus());
        return updatedNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
        setError(errorMessage);
        Logger.error('Error updating note', err);
        return null;
      }
    },
    [repository, canSaveNoteContent]
  );

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    if (!repository) return false;

    try {
      await repository.delete(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
      // Update sync status
      setSyncStatus(repository.getSyncStatus());
      // Refresh usage counts after deleting
      await refreshUsage();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      Logger.error('Error deleting note', err);
      return false;
    }
  }, [repository, refreshUsage]);

  const isNoteDirty = useCallback((noteId: string): boolean => {
    if (!repository) return false;
    return repository.isNoteDirty(noteId);
  }, [repository]);

  return {
    notes,
    loading,
    error,
    syncStatus,
    refetch: loadNotes,
    createNote,
    updateNote,
    deleteNote,
    syncNotes,
    isNoteDirty,
  };
};
