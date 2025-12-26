import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { NoteType as Note, NoteFilters, CreateNoteDto, UpdateNoteDto } from '../../domain';
import { NoteRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';

export const useNotes = (filters?: NoteFilters) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const repository = useMemo(() => new NoteRepository(), []);
  const userId = user?.id;

  // Stabilize filters to prevent unnecessary re-renders
  const stableFilters = useMemo(() => filters, [
    filters?.folderId,
    filters?.searchQuery,
    filters?.isPinned,
    JSON.stringify(filters?.tags),
  ]);

  const loadNotes = useCallback(async () => {
    if (!userId) {
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
      const data = await repository.findAll(stableFilters);
      setNotes(data);
      hasLoadedRef.current = true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      setError(errorMessage);
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId, repository, stableFilters]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(
    async (dto: Omit<CreateNoteDto, 'userId'>): Promise<Note | null> => {
      if (!userId) return null;

      try {
        const newNote = await repository.create({ ...dto, userId });
        setNotes((prev) => [newNote, ...prev]);
        return newNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
        setError(errorMessage);
        console.error('Error creating note:', err);
        return null;
      }
    },
    [userId, repository]
  );

  const updateNote = useCallback(
    async (id: string, dto: UpdateNoteDto): Promise<Note | null> => {
      try {
        const updatedNote = await repository.update(id, dto);
        setNotes((prev) =>
          prev.map((note) => (note.id === id ? updatedNote : note))
        );
        return updatedNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update note';
        setError(errorMessage);
        console.error('Error updating note:', err);
        return null;
      }
    },
    [repository]
  );

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    try {
      await repository.delete(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete note';
      setError(errorMessage);
      console.error('Error deleting note:', err);
      return false;
    }
  }, [repository]);

  return {
    notes,
    loading,
    error,
    refetch: loadNotes,
    createNote,
    updateNote,
    deleteNote,
  };
};
