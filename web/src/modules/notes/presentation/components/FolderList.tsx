import { Folder as FolderIcon } from "lucide-react";
import type { FolderType as Folder } from "../../domain";
import { SidebarList } from "@core/presentation/components/common";

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null | "all" | "pinned";
  onSelectFolder: (folderId: string | null | "all" | "pinned") => void;
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
  // Map folders to include count property for SidebarList
  const foldersWithCount = folders.map(folder => ({
    ...folder,
    count: folder.noteCount,
  }));

  return (
    <SidebarList
      moduleName="Notes"
      title="Folders"
      items={foldersWithCount}
      selectedItemId={selectedFolderId}
      onSelectItem={onSelectFolder}
      onCreate={onCreateFolder}
      onUpdate={onUpdateFolder}
      onDelete={onDeleteFolder}
      loading={loading}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      allItemsLabel="All Notes"
      specialViewType="pinned"
      specialViewLabel="Pinned"
      unfiledLabel="Unfiled"
      createDialogTitle="Create Folder"
      createDialogDescription="Enter a name for your new folder (max 100 characters)."
      editDialogTitle="Rename Folder"
      editDialogDescription="Enter a new name for this folder (max 100 characters)."
      itemIcon={FolderIcon}
      hideOnMobile={true}
    />
  );
};
