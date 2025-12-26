import { useState } from 'react';
import { Plus, FolderOpen } from 'lucide-react';
import type { FolderType as Folder } from '../../domain';
import { FolderItem } from './FolderItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null | 'all';
  onSelectFolder: (folderId: string | null | 'all') => void;
  onCreateFolder: (name: string) => Promise<void>;
  onUpdateFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  loading: boolean;
}

export const FolderList = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  loading,
}: FolderListProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState('');

  const handleCreate = async () => {
    if (folderName.trim()) {
      await onCreateFolder(folderName.trim());
      setFolderName('');
      setIsCreateDialogOpen(false);
    }
  };

  const handleEdit = async () => {
    if (editingFolder && folderName.trim()) {
      await onUpdateFolder(editingFolder.id, folderName.trim());
      setFolderName('');
      setEditingFolder(null);
      setIsEditDialogOpen(false);
    }
  };

  const openEditDialog = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Folders
            </h2>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            <div
              className={'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ' +
                (selectedFolderId === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              onClick={() => onSelectFolder('all')}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="text-sm font-medium">All Notes</span>
            </div>

            {loading && folders.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : folders.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No folders yet
              </div>
            ) : (
              folders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  isActive={selectedFolderId === folder.id}
                  onClick={() => onSelectFolder(folder.id)}
                  onEdit={() => openEditDialog(folder)}
                  onDelete={() => onDeleteFolder(folder.id)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
