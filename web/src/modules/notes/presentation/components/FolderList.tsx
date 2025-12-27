import { useState } from "react";
import { Plus, FolderOpen, ChevronLeft, ChevronRight, Folder as FolderIcon, Pin } from "lucide-react";
import { z } from "zod";
import type { FolderType as Folder } from "../../domain";
import { FolderItem } from "./FolderItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const FOLDER_NAME_MAX_LENGTH = 100;

const folderNameSchema = z.string()
  .min(1, "Folder name is required")
  .max(FOLDER_NAME_MAX_LENGTH, `Folder name must be ${FOLDER_NAME_MAX_LENGTH} characters or less`)
  .trim();

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreate = async () => {
    const validation = folderNameSchema.safeParse(folderName);

    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    await onCreateFolder(validation.data);
    setFolderName("");
    setValidationError(null);
    setIsCreateDialogOpen(false);
  };

  const handleEdit = async () => {
    if (!editingFolder) return;

    const validation = folderNameSchema.safeParse(folderName);

    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }

    await onUpdateFolder(editingFolder.id, validation.data);
    setFolderName("");
    setEditingFolder(null);
    setValidationError(null);
    setIsEditDialogOpen(false);
  };

  const handleFolderNameChange = (value: string) => {
    setFolderName(value);
    setValidationError(null);
  };

  const openEditDialog = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderName(folder.name);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div
        className={`hidden lg:flex bg-background border-r border-border flex-col transition-all duration-300 ${
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
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground")
                }
                onClick={() => onSelectFolder("all")}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">All Notes</span>
              </div>

              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors " +
                  (selectedFolderId === "pinned"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground")
                }
                onClick={() => onSelectFolder("pinned")}
              >
                <Pin className="w-4 h-4" />
                <span className="text-sm font-medium">Pinned</span>
              </div>

              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors " +
                  (selectedFolderId === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground")
                }
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
            <DialogDescription>
              Enter a name for your new folder (max {FOLDER_NAME_MAX_LENGTH} characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => handleFolderNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              maxLength={FOLDER_NAME_MAX_LENGTH}
              autoFocus
              className={validationError ? "border-destructive" : ""}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {folderName.length}/{FOLDER_NAME_MAX_LENGTH} characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setValidationError(null);
                setFolderName("");
              }}
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
            <DialogDescription>
              Enter a new name for this folder (max {FOLDER_NAME_MAX_LENGTH} characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => handleFolderNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              maxLength={FOLDER_NAME_MAX_LENGTH}
              autoFocus
              className={validationError ? "border-destructive" : ""}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {folderName.length}/{FOLDER_NAME_MAX_LENGTH} characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setValidationError(null);
                setFolderName("");
              }}
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
