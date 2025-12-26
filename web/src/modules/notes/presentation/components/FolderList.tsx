import { useState } from 'react';
import { Folder as FolderIcon, Plus, MoreVertical, Trash2, Edit2, Folder } from 'lucide-react';
import { cn } from '@core/presentation/utils';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null | 'all';
  onFolderSelect: (folderId: string | null | 'all') => void;
  onCreateFolder: (name: string) => Promise<void>;
  onUpdateFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
}

export const FolderList = ({
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
}: FolderListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await onCreateFolder(newFolderName);
      setNewFolderName('');
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleUpdateFolder = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      await onUpdateFolder(id, editingName);
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this folder? Notes in this folder will not be deleted.')) {
      return;
    }

    try {
      await onDeleteFolder(id);
      setMenuOpen(null);
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  };

  return (
    <div className="w-64 bg-muted border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Folders</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 hover:bg-accent rounded transition-colors"
          title="New folder"
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* All Notes */}
        <button
          onClick={() => onFolderSelect('all')}
          className={cn(
            'w-full px-4 py-2 flex items-center gap-3 hover:bg-accent transition-colors text-left',
            selectedFolderId === 'all' && 'bg-primary/10 hover:bg-primary/20'
          )}
        >
          <FolderIcon className="w-5 h-5 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium text-foreground">All Notes</span>
        </button>

        {/* Folder List */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={cn(
              'group relative px-4 py-2 flex items-center gap-3 hover:bg-accent transition-colors',
              selectedFolderId === folder.id && 'bg-primary/10 hover:bg-primary/20'
            )}
          >
            {editingId === folder.id ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateFolder(folder.id);
                    if (e.key === 'Escape') {
                      setEditingId(null);
                      setEditingName('');
                    }
                  }}
                  onBlur={() => handleUpdateFolder(folder.id)}
                  className="flex-1 px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  autoFocus
                />
              </div>
            ) : (
              <>
                <button
                  onClick={() => onFolderSelect(folder.id)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  <FolderIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-sm text-foreground">{folder.name}</span>
                  {folder.noteCount !== undefined && folder.noteCount > 0 && (
                    <span className="text-xs text-muted-foreground">{folder.noteCount}</span>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === folder.id ? null : folder.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent/50 rounded transition-all"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {menuOpen === folder.id && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setMenuOpen(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-32 bg-card rounded shadow-lg border border-border py-1 z-20">
                        <button
                          onClick={() => {
                            setEditingId(folder.id);
                            setEditingName(folder.name);
                            setMenuOpen(null);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Create Folder Input */}
        {isCreating && (
          <div className="px-4 py-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') {
                  setIsCreating(false);
                  setNewFolderName('');
                }
              }}
              onBlur={handleCreateFolder}
              placeholder="Folder name"
              className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        )}
      </div>
    </div>
  );
};
