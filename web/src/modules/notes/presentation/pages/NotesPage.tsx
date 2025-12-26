import { useState, useCallback } from 'react';
import { FolderList, NotesList, NoteEditor } from '../components';
import { useFolders, useNotes } from '../hooks';

// TODO: Replace with actual user ID from auth context
const MOCK_USER_ID = 'user-123';

export const NotesPage = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'all'>('all');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Determine which folder ID to pass to useNotes
  const notesFilterFolderId =
    selectedFolderId === 'all' ? undefined : selectedFolderId;

  const {
    folders,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useFolders(MOCK_USER_ID);

  const {
    notes,
    loading: notesLoading,
    createNote,
    updateNote,
    deleteNote,
    searchNotes,
  } = useNotes(MOCK_USER_ID, notesFilterFolderId);

  const selectedNote = notes.find((note) => note.id === selectedNoteId) || null;

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder({ name });
    },
    [createFolder]
  );

  const handleUpdateFolder = useCallback(
    async (id: string, name: string) => {
      await updateFolder(id, { name });
    },
    [updateFolder]
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      await deleteFolder(id);
      if (selectedFolderId === id) {
        setSelectedFolderId('all');
      }
    },
    [deleteFolder, selectedFolderId]
  );

  const handleCreateNote = useCallback(async () => {
    const folderId = selectedFolderId === 'all' ? null : selectedFolderId;
    const newNote = await createNote({
      title: 'Untitled',
      content: '',
      excerpt: '',
      folderId,
    });
    setSelectedNoteId(newNote.id);
  }, [createNote, selectedFolderId]);

  const handleUpdateNote = useCallback(
    async (noteId: string, title: string, content: string) => {
      const excerpt = content.replace(/<[^>]*>/g, '').trim().substring(0, 150);
      await updateNote(noteId, { title, content, excerpt });
    },
    [updateNote]
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      await deleteNote(noteId);
      if (selectedNoteId === noteId) {
        setSelectedNoteId(null);
      }
    },
    [deleteNote, selectedNoteId]
  );

  const handleTogglePin = useCallback(
    async (noteId: string, isPinned: boolean) => {
      await updateNote(noteId, { isPinned });
    },
    [updateNote]
  );

  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        searchNotes(query);
      } else {
        // Reload notes when search is cleared
        window.location.reload(); // Simple approach, can be improved
      }
    },
    [searchNotes]
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Folder List */}
      <FolderList
        folders={folders}
        selectedFolderId={selectedFolderId}
        onFolderSelect={setSelectedFolderId}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
      />

      {/* Notes List */}
      <NotesList
        notes={notes}
        selectedNoteId={selectedNoteId}
        onNoteSelect={setSelectedNoteId}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onTogglePin={handleTogglePin}
        onSearch={handleSearch}
        loading={notesLoading}
      />

      {/* Note Editor */}
      <NoteEditor note={selectedNote} onUpdateNote={handleUpdateNote} />
    </div>
  );
};
