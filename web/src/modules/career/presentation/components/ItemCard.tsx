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
      className="block rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{item.name}</p>
          {item.cvFilePath && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <FileCheck2 className="h-3 w-3" />
              CV attached
            </p>
          )}
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
