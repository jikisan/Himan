import { useState } from "react";
import { Plus, FolderOpen, PanelLeftClose, PanelLeftOpen, Folder as FolderIcon, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { z } from "zod";
import { SidebarListItem } from "./SidebarListItem";
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

const ITEM_NAME_MAX_LENGTH = 100;

const itemNameSchema = z.string()
  .min(1, "Name is required")
  .max(ITEM_NAME_MAX_LENGTH, `Name must be ${ITEM_NAME_MAX_LENGTH} characters or less`)
  .trim();

interface SidebarListItem {
  id: string;
  name: string;
  count?: number;
}

type SpecialViewType = "favorites" | "pinned";

interface SidebarListProps<T extends SidebarListItem> {
  moduleName?: string;
  title: string;
  items: T[];
  selectedItemId: string | null | "all" | SpecialViewType;
  onSelectItem: (itemId: string | null | "all" | SpecialViewType) => void;
  onCreate: (name: string) => Promise<void>;
  onUpdate: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  allItemsLabel?: string;
  specialViewType?: SpecialViewType;
  specialViewLabel?: string;
  showSpecialView?: boolean;
  unfiledLabel?: string;
  createDialogTitle?: string;
  createDialogDescription?: string;
  editDialogTitle?: string;
  editDialogDescription?: string;
  itemIcon?: LucideIcon;
  hideOnMobile?: boolean;
  onItemSettings?: (id: string) => void;
}

export const SidebarList = <T extends SidebarListItem>({
  moduleName,
  title,
  items,
  selectedItemId,
  onSelectItem,
  onCreate,
  onUpdate,
  onDelete,
  loading,
  isCollapsed,
  onToggleCollapse,
  allItemsLabel = "All Items",
  specialViewType = "favorites",
  specialViewLabel = "Favorites",
  showSpecialView = true,
  unfiledLabel = "Unfiled",
  createDialogTitle = `Create ${title.slice(0, -1)}`,
  createDialogDescription = `Enter a name for your new ${title.toLowerCase().slice(0, -1)} (max ${ITEM_NAME_MAX_LENGTH} characters).`,
  editDialogTitle = `Rename ${title.slice(0, -1)}`,
  editDialogDescription = `Enter a new name for this ${title.toLowerCase().slice(0, -1)} (max ${ITEM_NAME_MAX_LENGTH} characters).`,
  itemIcon,
  hideOnMobile = false,
  onItemSettings,
}: SidebarListProps<T>) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [itemName, setItemName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCreate = async () => {
    const validation = itemNameSchema.safeParse(itemName);

    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
      return;
    }

    await onCreate(validation.data);
    setItemName("");
    setValidationError(null);
    setIsCreateDialogOpen(false);
  };

  const handleEdit = async () => {
    if (!editingItem) return;

    const validation = itemNameSchema.safeParse(itemName);

    if (!validation.success) {
      setValidationError(validation.error.issues[0].message);
      return;
    }

    await onUpdate(editingItem.id, validation.data);
    setItemName("");
    setEditingItem(null);
    setValidationError(null);
    setIsEditDialogOpen(false);
  };

  const handleItemNameChange = (value: string) => {
    setItemName(value);
    setValidationError(null);
  };

  const openEditDialog = (item: T) => {
    setEditingItem(item);
    setItemName(item.name);
    setIsEditDialogOpen(true);
  };

  return (
    <>
      <div
        className={`bg-background border-r border-border flex flex-col transition-all duration-300 ${
          isCollapsed ? "w-12" : "w-64"
        } ${hideOnMobile ? "hidden lg:flex" : ""}`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex flex-col gap-2">
            {!isCollapsed && moduleName && (
              <h2 className="text-lg font-semibold text-foreground">
                {moduleName}
              </h2>
            )}
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {title}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="h-6 w-6"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onToggleCollapse}
                      className="h-6 w-6"
                      title="Collapse sidebar"
                    >
                      <PanelLeftClose className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
              {isCollapsed && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onToggleCollapse}
                  className="h-6 w-6 mx-auto"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {!isCollapsed && (
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors " +
                  (selectedItemId === "all"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground")
                }
                onClick={() => onSelectItem("all")}
              >
                <FolderOpen className="w-4 h-4" />
                <span className="text-sm font-medium">{allItemsLabel}</span>
              </div>

              {showSpecialView && (
                <div
                  className={
                    "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors " +
                    (selectedItemId === specialViewType
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground")
                  }
                  onClick={() => onSelectItem(specialViewType)}
                >
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">{specialViewLabel}</span>
                </div>
              )}

              <div
                className={
                  "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors " +
                  (selectedItemId === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground")
                }
                onClick={() => onSelectItem(null)}
              >
                <FolderIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{unfiledLabel}</span>
              </div>

              <div className="my-2 border-t border-border" />

              {loading && items.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : items.length === 0 && !loading ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No {title.toLowerCase()} yet
                </div>
              ) : (
                items.map((item) => (
                  <SidebarListItem
                    key={item.id}
                    id={item.id}
                    name={item.name}
                    icon={itemIcon}
                    count={item.count}
                    isActive={selectedItemId === item.id}
                    onClick={() => onSelectItem(item.id)}
                    onSettings={onItemSettings ? () => onItemSettings(item.id) : undefined}
                    onEdit={() => openEditDialog(item)}
                    onDelete={() => onDelete(item.id)}
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
            <DialogTitle>{createDialogTitle}</DialogTitle>
            <DialogDescription>
              {createDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder={`${title.slice(0, -1)} name`}
              value={itemName}
              onChange={(e) => handleItemNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              maxLength={ITEM_NAME_MAX_LENGTH}
              autoFocus
              className={validationError ? "border-destructive" : ""}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {itemName.length}/{ITEM_NAME_MAX_LENGTH} characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setValidationError(null);
                setItemName("");
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
            <DialogTitle>{editDialogTitle}</DialogTitle>
            <DialogDescription>
              {editDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder={`${title.slice(0, -1)} name`}
              value={itemName}
              onChange={(e) => handleItemNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              maxLength={ITEM_NAME_MAX_LENGTH}
              autoFocus
              className={validationError ? "border-destructive" : ""}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {itemName.length}/{ITEM_NAME_MAX_LENGTH} characters
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setValidationError(null);
                setItemName("");
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
