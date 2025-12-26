import { useState } from "react";
import { Plus, FolderOpen, ChevronLeft, ChevronRight, Folder as FolderIcon } from "lucide-react";
import type { FolderType as Folder } from "../../domain";
import { FolderItem } from "./FolderItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FolderListProps {
  folders: Folder[];
  selectedFolderId: string | null | "all";
  onSelectFolder: (folderId: string | null | "all") => void;
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState("");

  const handleCreate = async () => {
    if (folderName.trim()) {
      await onCreateFolder(folderName.trim());
      setFolderName("");
      setIsCreateDialogOpen(false);
    }
  };

  const handleEdit = async () => {
    if (editingFolder && folderName.trim()) {
      await onUpdateFolder(editingFolder.id, folderName.trim());
      setFolderName("");
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
      <div
        className={`bg-muted border-r border-border flex flex-col transition-all duration-300 ${
          isCollapsed ? "w-12" : "w-64"
        }`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center mb-4">
            <div className="flex w-full items-center justify-between ">
              {!isCollapsed && (
                <>
                  <h2 className="text-lg font-semibold text-foreground">
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
                </>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleCollapse}
              className="h-4 w-4 mx-auto block"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {!isCollapsed && (
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors " +
                  (selectedFolderId === "all"
                    ? "bg-accent"
                    : "hover:bg-accent/50")
                }
                style={{
                  borderLeft: selectedFolderId === "all" ? '4px solid hsl(var(--primary))' : '4px solid transparent',
                }}
                onClick={() => onSelectFolder("all")}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">All Notes</span>
              </div>

              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors " +
                  (selectedFolderId === null
                    ? "bg-accent"
                    : "hover:bg-accent/50")
                }
                style={{
                  borderLeft: selectedFolderId === null ? '4px solid hsl(var(--primary))' : '4px solid transparent',
                }}
                onClick={() => onSelectFolder(null)}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Unfiled</span>
              </div>

              {loading && folders.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : folders.length === 0 && !loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
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
        )}
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
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
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
            onKeyDown={(e) => e.key === "Enter" && handleEdit()}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
