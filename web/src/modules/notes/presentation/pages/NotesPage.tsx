import { useState, useCallback, useMemo, useRef } from 'react';
import { FolderList, NotesList, NoteEditor } from '../components';
import { MobileNotesMenu } from '../components/MobileNotesMenu';
import { useNotes, useFolders } from '../hooks';
import { Note as NoteEntity } from '../../domain/entities/Note';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui';

export const NotesPage = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'all' | 'pinned'>('all');
  const [selectedNote, setSelectedNote] = useState<NoteEntity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [isFolderCollapsed, setIsFolderCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const titleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const noteFilters = useMemo(() => ({
    folderId: selectedFolderId === 'all' || selectedFolderId === 'pinned' ? undefined : selectedFolderId,
    searchQuery: searchQuery || undefined,
    isPinned: selectedFolderId === 'pinned' ? true : undefined,
  }), [selectedFolderId, searchQuery]);

  const {
    notes,
    loading: notesLoading,
    syncStatus,
    createNote,
    updateNote,
    deleteNote,
    syncNotes,
    isNoteDirty,
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
    const folderId = selectedFolderId === 'all' ? null : selectedFolderId;

    const newNote = await createNote({
      title: 'Untitled',
      content: '',
      excerpt: '',
      folderId,
    });
    if (newNote) {
      setSelectedNote(new NoteEntity(newNote));
      // Refetch folders to update note counts
      refetchFolders();
    }
  }, [createNote, selectedFolderId, refetchFolders]);

  const handleUpdateNoteTitle = useCallback(
    (title: string) => {
      if (selectedNote) {
        // Update local state immediately for responsive UI
        setSelectedNote(new NoteEntity({ ...selectedNote, title }));

        // Debounce the API call
        if (titleTimeoutRef.current) {
          clearTimeout(titleTimeoutRef.current);
        }

        titleTimeoutRef.current = setTimeout(async () => {
          const updated = await updateNote(selectedNote.id, {
            title,
            excerpt: NoteEntity.generateExcerpt(selectedNote.content),
          });
          if (updated) {
            setSelectedNote(new NoteEntity(updated));
          }
        }, 1000); // 1 second debounce
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
      setDeleteNoteDialogOpen(true);
    }
  }, [selectedNote]);

  const confirmDeleteNote = useCallback(async () => {
    if (selectedNote) {
      const success = await deleteNote(selectedNote.id);
      if (success) {
        setSelectedNote(null);
        // Refetch folders to update note counts
        refetchFolders();
      }
    }
  }, [selectedNote, deleteNote, refetchFolders]);

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
      setFolderToDelete(id);
      setDeleteFolderDialogOpen(true);
    },
    []
  );

  const confirmDeleteFolder = useCallback(async () => {
    if (folderToDelete) {
      await deleteFolder(folderToDelete);
      refetchFolders();
      refetchNotes();
      if (selectedFolderId === folderToDelete) {
        setSelectedFolderId('all');
      }
      setFolderToDelete(null);
    }
  }, [folderToDelete, deleteFolder, selectedFolderId, refetchFolders, refetchNotes]);

  const handleToggleFolderCollapse = useCallback(() => {
    setIsFolderCollapsed(prev => !prev);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleSync = useCallback(async () => {
    const newNoteId = await syncNotes(selectedNote?.id);

    // If the current note's ID was changed (local ID -> UUID), update the selected note
    if (newNoteId && selectedNote) {
      const updatedNote = notesEntities.find(n => n.id === newNoteId);
      if (updatedNote) {
        setSelectedNote(updatedNote);
      }
    }
  }, [syncNotes, selectedNote, notesEntities]);

  return (
    <>
      <div className="flex h-full bg-secondary">
        {/* Desktop: Folder List - hide on mobile/tablet */}
        <FolderList
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          loading={foldersLoading}
          isCollapsed={isFolderCollapsed}
          onToggleCollapse={handleToggleFolderCollapse}
        />

        {/* Desktop: Notes List - hide on mobile/tablet */}
        <NotesList
          notes={notesEntities}
          selectedNoteId={selectedNote?.id || null}
          onSelectNote={setSelectedNote}
          onCreateNote={handleCreateNote}
          loading={notesLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFolderId={selectedFolderId}
          folders={folders}
          syncStatus={syncStatus}
          onSync={handleSync}
          isNoteDirty={isNoteDirty}
        />

        {/* Editor (both mobile and desktop) */}
        {selectedNote ? (
          <NoteEditor
            note={selectedNote}
            onTitleChange={handleUpdateNoteTitle}
            onContentChange={handleUpdateNoteContent}
            onTogglePin={handleTogglePin}
            onDelete={handleDeleteNote}
            onMoveToFolder={handleMoveToFolder}
            onOpenMobileMenu={handleToggleMobileMenu}
            syncStatus={syncStatus}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
            <div className="text-center space-y-4">
              <p>Select a note to start editing</p>
              <Button
                onClick={handleToggleMobileMenu}
                variant="outline"
                className="bg-primary lg:hidden"
              >
                Browse Notes
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Slide-in Menu */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-[85vw] max-w-md p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Notes Navigation</SheetTitle>
            <SheetDescription>Browse folders and notes</SheetDescription>
          </SheetHeader>
          <MobileNotesMenu
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={handleCreateFolder}
            onUpdateFolder={handleUpdateFolder}
            onDeleteFolder={handleDeleteFolder}
            foldersLoading={foldersLoading}
            notes={notesEntities}
            selectedNoteId={selectedNote?.id || null}
            onSelectNote={setSelectedNote}
            onCreateNote={handleCreateNote}
            notesLoading={notesLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            syncStatus={syncStatus}
            onSync={handleSync}
            isNoteDirty={isNoteDirty}
            onClose={() => setIsMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <Dialog open={isMoveDialogOpen} onOpenChange={setIsMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Folder</DialogTitle>
            <DialogDescription>
              Select a folder to move this note to.
            </DialogDescription>
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
            <Button onClick={handleConfirmMove}>Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation */}
      <ConfirmDialog
        open={deleteNoteDialogOpen}
        onOpenChange={setDeleteNoteDialogOpen}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteNote}
        variant="destructive"
      />

      {/* Delete Folder Confirmation */}
      <ConfirmDialog
        open={deleteFolderDialogOpen}
        onOpenChange={setDeleteFolderDialogOpen}
        title="Delete Folder"
        description={
          folders.find((f) => f.id === folderToDelete)?.noteCount
            ? 'This folder contains notes. All notes will be moved to "Unfiled". Continue?'
            : 'Are you sure you want to delete this folder?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteFolder}
        variant="destructive"
      />
    </>
  );
};
