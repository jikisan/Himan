import { formatDistanceToNow } from 'date-fns';
import { Copy, FileCheck2, MoreVertical, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import type { CareerItemType } from '@himan/shared/career';

interface ItemCardProps {
  item: CareerItemType;
  onDelete: () => void;
  onDuplicate: () => void;
}

export const ItemCard = ({ item, onDelete, onDuplicate }: ItemCardProps) => {
  return (
    <Link
      to={`/career/${item.id}`}
      className="group block rounded-lg border border-border p-4 transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{item.name}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {item.cvFilePath ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">
                <FileCheck2 className="h-3 w-3" />
                CV attached
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">No CV yet</span>
            )}
            <span className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(item.updatedAt, { addSuffix: true })}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => e.preventDefault()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.preventDefault(); onDuplicate(); }}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.preventDefault(); onDelete(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
};
