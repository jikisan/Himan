import { useState, useEffect, useCallback } from 'react';
import { Note } from '../../domain/entities';
import { SupabaseNoteRepository } from '../../infrastructure/api';
import { CreateNoteDto, UpdateNoteDto } from '../../domain/types';

export const useNotes = (userId: string | null, folderId?: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository = new SupabaseNoteRepository();

  const loadNotes = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const data =
        folderId !== undefined
          ? await repository.findByFolder(folderId, userId)
          : await repository.findAll(userId);
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [userId, folderId]);

  const createNote = useCallback(
    async (dto: Omit<CreateNoteDto, 'userId'>) => {
      if (!userId) throw new Error('User ID is required');

      try {
        const newNote = await repository.create({ ...dto, userId });
        setNotes((prev) => [newNote, ...prev]);
        return newNote;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create note';
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  const updateNote = useCallback(async (id: string, dto: UpdateNoteDto) => {
    try {
      const updatedNote = await repository.update(id, dto);
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? updatedNote : note))
      );
      return updatedNote;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update note';
      setError(message);
      throw err;
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await repository.delete(id);
      setNotes((prev) => prev.filter((note) => note.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete note';
      setError(message);
      throw err;
    }
  }, []);

  const searchNotes = useCallback(
    async (query: string) => {
      if (!userId) return;

      setLoading(true);
      setError(null);
      try {
        const data = await repository.search(query, userId, folderId);
        setNotes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search notes');
      } finally {
        setLoading(false);
      }
    },
    [userId, folderId]
  );

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
    refetch: loadNotes,
  };
};
