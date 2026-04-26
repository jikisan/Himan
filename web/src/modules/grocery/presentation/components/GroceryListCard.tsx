import { MoreVertical, Edit2, Trash2, Archive, LogOut, Users } from 'lucide-react';
import { GroceryList } from '../../domain';
import type { GroceryListType } from '../../domain';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@core/presentation/utils';

interface GroceryListCardProps {
  list: GroceryListType;
  isSelected: boolean;
  isOwner: boolean;
  onSelect: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onLeave: () => void;
}

export const GroceryListCard = ({
  list,
  isSelected,
  isOwner,
  onSelect,
  onRename,
  onArchive,
  onDelete,
  onLeave,
}: GroceryListCardProps) => {
  const entity = new GroceryList(list);
  const progress = entity.itemCount > 0 ? entity.progress * 100 : 0;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-colors border',
        isSelected
          ? 'bg-accent border-primary/30'
          : 'border-transparent hover:bg-accent/50'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{list.name}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{entity.progressLabel}</span>
            {entity.isShared && (
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                {list.memberCount}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                <Archive className="h-4 w-4 mr-2" />
                {list.isArchived ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {isOwner ? (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onLeave(); }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {entity.itemCount > 0 && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary rounded-full h-1.5 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {entity.getRelativeTime()}
      </p>
    </div>
  );
};
