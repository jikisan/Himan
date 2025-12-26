import { useState, useCallback, useMemo } from 'react';
import { FolderList, NotesList, NoteEditor } from '../components';
import { useNotes, useFolders } from '../hooks';
import { Note as NoteEntity } from '../../domain/entities/Note';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const NotesPage = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'all'>('all');
  const [selectedNote, setSelectedNote] = useState<NoteEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  const noteFilters = useMemo(() => ({
    folderId: selectedFolderId === 'all' ? undefined : selectedFolderId,
    searchQuery: searchQuery || undefined,
  }), [selectedFolderId, searchQuery]);

  const {
    notes,
    loading: notesLoading,
    createNote,
    updateNote,
    deleteNote,
    refetch: refetchNotes,
  } = useNotes(noteFilters);

  const {
    folders,
    loading: foldersLoading,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: refetchFolders,
  } = useFolders();

  const notesEntities = useMemo(
    () => notes.map((note) => new NoteEntity(note)),
    [notes]
  );

  const handleCreateNote = useCallback(async () => {
    const newNote = await createNote({
      title: 'Untitled',
      content: '',
      excerpt: '',
      folderId: selectedFolderId === 'all' ? null : selectedFolderId,
    });
    if (newNote) {
      setSelectedNote(new NoteEntity(newNote));
    }
  }, [createNote, selectedFolderId]);

  const handleUpdateNoteTitle = useCallback(
    async (title: string) => {
      if (selectedNote) {
        const updated = await updateNote(selectedNote.id, {
          title,
          excerpt: NoteEntity.generateExcerpt(selectedNote.content),
        });
        if (updated) {
          setSelectedNote(new NoteEntity(updated));
        }
      }
    },
    [selectedNote, updateNote]
  );

  const handleUpdateNoteContent = useCallback(
    async (content: string) => {
      if (selectedNote) {
        const excerpt = NoteEntity.generateExcerpt(content);
        const updated = await updateNote(selectedNote.id, {
          content,
          excerpt,
        });
        if (updated) {
          setSelectedNote(new NoteEntity(updated));
        }
      }
    },
    [selectedNote, updateNote]
  );

  const handleTogglePin = useCallback(async () => {
    if (selectedNote) {
      const updated = await updateNote(selectedNote.id, {
        isPinned: !selectedNote.isPinned,
      });
      if (updated) {
        setSelectedNote(new NoteEntity(updated));
      }
    }
  }, [selectedNote, updateNote]);

  const handleDeleteNote = useCallback(async () => {
    if (selectedNote) {
      const confirmed = window.confirm('Are you sure you want to delete this note?');
      if (confirmed) {
        const success = await deleteNote(selectedNote.id);
        if (success) {
          setSelectedNote(null);
        }
      }
    }
  }, [selectedNote, deleteNote]);

  const handleMoveToFolder = useCallback(() => {
    if (selectedNote) {
      setTargetFolderId(selectedNote.folderId);
      setIsMoveDialogOpen(true);
    }
  }, [selectedNote]);

  const handleConfirmMove = useCallback(async () => {
    if (selectedNote) {
      const updated = await updateNote(selectedNote.id, {
        folderId: targetFolderId,
      });
      if (updated) {
        setSelectedNote(new NoteEntity(updated));
        setIsMoveDialogOpen(false);
        refetchNotes();
        refetchFolders();
      }
    }
  }, [selectedNote, targetFolderId, updateNote, refetchNotes, refetchFolders]);

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder({ name });
      refetchFolders();
    },
    [createFolder, refetchFolders]
  );

  const handleUpdateFolder = useCallback(
    async (id: string, name: string) => {
      await updateFolder(id, { name });
      refetchFolders();
    },
    [updateFolder, refetchFolders]
  );

  const handleDeleteFolder = useCallback(
    async (id: string) => {
      const folder = folders.find((f) => f.id === id);
      if (folder && folder.noteCount && folder.noteCount > 0) {
        const confirmed = window.confirm(
          'This folder contains notes. All notes will be moved to "Unfiled". Continue?'
        );
        if (!confirmed) return;
      }
      await deleteFolder(id);
      refetchFolders();
      refetchNotes();
      if (selectedFolderId === id) {
        setSelectedFolderId('all');
      }
    },
    [folders, deleteFolder, selectedFolderId, refetchFolders, refetchNotes]
  );

  return (
    <>
      <div className="flex h-screen bg-secondary">
        <FolderList
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          loading={foldersLoading}
        />

        <NotesList
          notes={notesEntities}
          selectedNoteId={selectedNote?.id || null}
          onSelectNote={setSelectedNote}
          onCreateNote={handleCreateNote}
          loading={notesLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onTitleChange={handleUpdateNoteTitle}
            onContentChange={handleUpdateNoteContent}
            onTogglePin={handleTogglePin}
            onDelete={handleDeleteNote}
            onMoveToFolder={handleMoveToFolder}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
            Select a note to start editing
          </div>
        )}
      </div>

      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
          </DialogHeader>
          <Select
            value={targetFolderId || 'none'}
            onValueChange={(value) => setTargetFolderId(value === 'none' ? null : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unfiled</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
