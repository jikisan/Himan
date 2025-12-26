import { Folder as FolderIcon, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { FolderType as Folder } from '../../domain';
import { cn } from '@core/presentation/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderItemProps {
  folder: Folder;
  isActive: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const FolderItem = ({
  folder,
  isActive,
  onClick,
  onEdit,
  onDelete,
}: FolderItemProps) => {
  return (
    <div
      className={cn(
        'group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent hover:text-accent-foreground'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <FolderIcon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm font-medium truncate">{folder.name}</span>
        {folder.noteCount !== undefined && folder.noteCount > 0 && (
          <span className="text-xs opacity-60">{folder.noteCount}</span>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
              isActive && 'text-primary-foreground hover:text-primary-foreground'
            )}
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
