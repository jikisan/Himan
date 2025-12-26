import { useState, useEffect, useCallback, useMemo } from 'react';
import type { NoteType as Note, NoteFilters, CreateNoteDto, UpdateNoteDto } from '../../domain';
import { NoteRepository } from '../../infrastructure/repositories';
import { useAuth } from '@auth/presentation/hooks/useAuth';

export const useNotes = (filters?: NoteFilters) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true); // Start as loading
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const repository = useMemo(() => new NoteRepository(), []);

  // Stabilize filters to prevent unnecessary re-renders
  const stableFilters = useMemo(() => filters, [
    filters?.folderId,
    filters?.searchQuery,
    filters?.isPinned,
    JSON.stringify(filters?.tags),
  ]);

  const loadNotes = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await repository.findAll(stableFilters);
      setNotes(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notes';
      setError(errorMessage);
      console.error('Error loading notes:', err);
    } finally {
      setLoading(false);
    }
  }, [user, repository, stableFilters]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(
    async (dto: Omit<CreateNoteDto, 'userId'>): Promise<Note | null> => {
      if (!user) return null;

      try {
        const newNote = await repository.create({ ...dto, userId: user.id });
        setNotes((prev) => [newNote, ...prev]);
        return newNote;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create note';
        setError(errorMessage);
        console.error('Error creating note:', err);
        return null;
      }
    },
    [user, repository]
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
