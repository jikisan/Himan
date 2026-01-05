import { useState } from 'react';
import { Folder, FolderOpen, HardDrive, ChevronLeft, ChevronRight } from 'lucide-react';
import type { StorageFolder } from '../../domain/entities';
import { SidebarList } from '@core/presentation/components';
import { useSubscription } from '@subscriptions/presentation/hooks';

interface FolderListProps {
  folders: StorageFolder[];
  selectedFolderId: string | null | 'all';
  onSelectFolder: (folderId: string | null | 'all') => void;
  onCreateFolder: (name: string) => Promise<void>;
  onUpdateFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string) => Promise<void>;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const FolderList = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  loading,
  isCollapsed,
  onToggleCollapse,
}: FolderListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const { usageStats, canCreateStorageFolder } = useSubscription();

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;

    // Check if user can create a folder
    const accessCheck = canCreateStorageFolder();
    if (!accessCheck.allowed) {
      alert(accessCheck.reason);
      return;
    }

    await onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreating(false);
  };

  // Calculate storage usage
  const storageUsed = usageStats?.storage.current || 0;
  const storageLimit = usageStats?.storage.limit || 0;
  const storagePercentage = usageStats?.storage.percentage || 0;

  const formatBytes = (bytes: number, decimals = 2): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStorageColor = () => {
    if (storagePercentage >= 90) return 'bg-destructive';
    if (storagePercentage >= 70) return 'bg-yellow-500';
    return 'bg-primary';
  };

  const defaultItems = [
    {
      id: 'all',
      label: 'All Files',
      icon: FolderOpen,
      count: folders.reduce((sum, f) => sum + f.filesCount, 0),
    },
    {
      id: null,
      label: 'Unfiled',
      icon: Folder,
      count: 0, // This would need to be calculated from files without folder
    },
  ];

  const folderItems = folders.map((folder) => ({
    id: folder.id,
    label: folder.name,
    icon: Folder,
    count: folder.filesCount,
    onEdit: async (name: string) => {
      await onUpdateFolder(folder.id, name);
    },
    onDelete: async () => {
      await onDeleteFolder(folder.id);
    },
  }));

  return (
    <div className="relative">
      <SidebarList
        title="Folders"
        items={[...defaultItems, ...folderItems]}
        selectedId={selectedFolderId}
        onSelectItem={(id) => onSelectFolder(id as string | null | 'all')}
        onCreateItem={() => setIsCreating(true)}
        loading={loading}
        isCollapsed={isCollapsed}
        createItemState={
          isCreating
            ? {
                value: newFolderName,
                onChange: setNewFolderName,
                onConfirm: handleCreate,
                onCancel: () => {
                  setIsCreating(false);
                  setNewFolderName('');
                },
                placeholder: 'Folder name',
                maxLength: 100,
              }
            : undefined
        }
      />

      {/* Storage Usage Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Storage</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatBytes(storageUsed)}</span>
              <span>{formatBytes(storageLimit)}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${getStorageColor()}`}
                style={{ width: `${Math.min(storagePercentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {storagePercentage}% used
            </div>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-4 bg-background border border-border rounded-full p-1 hover:bg-accent transition-colors hidden lg:block"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </div>
  );
};
