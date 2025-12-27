import { useState } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Folder as FolderIcon, Plus, Search, Pin } from 'lucide-react';
import type { FolderType as Folder } from '../../domain';
import { Note } from '../../domain/entities/Note';
import { FolderItem } from './FolderItem';
import { NoteItem } from './NoteItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileNotesMenuProps {
  // Folders
  folders: Folder[];
  selectedFolderId: string | null | 'all' | 'pinned';
  onSelectFolder: (folderId: string | null | 'all' | 'pinned') => void;
  onCreateFolder: (name: string) => Promise<void>;
  onUpdateFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  foldersLoading: boolean;

  // Notes
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => Promise<void>;
  notesLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;

  // Mobile specific
  onClose: () => void;
}

export const MobileNotesMenu = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  foldersLoading,
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  notesLoading,
  searchQuery,
  onSearchChange,
  onClose,
}: MobileNotesMenuProps) => {
  const [isFoldersExpanded, setIsFoldersExpanded] = useState(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      await onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsCreatingFolder(false);
    }
  };

  const handleSelectNote = (note: Note) => {
    onSelectNote(note);
    onClose(); // Close the drawer when a note is selected
  };

  return (
    <div className="flex flex-col ">
      {/* Folders Section */}
      <div className="border-b border-border">
        <div className="p-4 pt-13">
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
              className="flex items-center gap-2 text-left"
            >
              {isFoldersExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <h3 className="text-sm font-semibold text-foreground">
                Folders
              </h3>
            </button>
            {isFoldersExpanded && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsCreatingFolder(true)}
                className="h-7 w-7"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {isFoldersExpanded && (
            <div className="mt-3 space-y-1">
              {/* Quick folder actions */}
              <div
                className={
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ' +
                  (selectedFolderId === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground')
                }
                onClick={() => {
                  onSelectFolder('all');
                }}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="font-medium">All Notes</span>
              </div>

              <div
                className={
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ' +
                  (selectedFolderId === 'pinned'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground')
                }
                onClick={() => {
                  onSelectFolder('pinned');
                }}
              >
                <Pin className="w-4 h-4" />
                <span className="font-medium">Pinned</span>
              </div>

              <div
                className={
                  'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ' +
                  (selectedFolderId === null
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground')
                }
                onClick={() => {
                  onSelectFolder(null);
                }}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="font-medium">Unfiled</span>
              </div>

              {/* User folders */}
              {foldersLoading && folders.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : (
                folders.map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    isActive={selectedFolderId === folder.id}
                    onClick={() => {
                      onSelectFolder(folder.id);
                    }}
                    onEdit={() => {
                      // Folder editing handled by FolderItem's internal dialog
                    }}
                    onDelete={() => onDeleteFolder(folder.id)}
                  />
                ))
              )}

              {/* Create folder inline */}
              {isCreatingFolder && (
                <div className="flex gap-2 px-3 py-2">
                  <Input
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder();
                      if (e.key === 'Escape') setIsCreatingFolder(false);
                    }}
                    autoFocus
                    className="h-8 text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={handleCreateFolder}
                    className="h-8 px-2"
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            <Button
              size="icon"
              variant="ghost"
              onClick={async () => {
                await onCreateNote();
                onClose(); // Close drawer after creating note
              }}
              className="h-7 w-7"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {notesLoading && notes.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Loading...
            </div>
          ) : notes.length === 0 && !notesLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              {searchQuery ? 'No notes found' : 'No notes yet. Create one to get started!'}
            </div>
          ) : (
            notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isActive={selectedNoteId === note.id}
                onClick={() => handleSelectNote(note)}
              />
            ))
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
