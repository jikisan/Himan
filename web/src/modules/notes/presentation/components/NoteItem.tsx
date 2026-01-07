import { Pin, CloudOff } from 'lucide-react';
import { Note as NoteEntity } from '../../domain/entities/Note';
import { cn } from '@core/presentation/utils';

interface NoteItemProps {
  note: NoteEntity;
  isActive: boolean;
  onClick: () => void;
  isDirty?: boolean;
}

export const NoteItem = ({ note, isActive, onClick, isDirty = false }: NoteItemProps) => {
  return (
    <div
      className={cn(
        'p-4 cursor-pointer border-b border-border transition-colors',
        isActive
          ? 'bg-accent border-l-4 border-l-primary'
          : 'hover:bg-accent/50 border-l-4 border-l-transparent'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2 mb-1">
        {note.isPinned && (
          <Pin className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
        )}
        <h3 className="text-sm font-semibold text-foreground truncate flex-1">
          {note.title || 'Untitled'}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
        {note.excerpt || 'No content'}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {note.getRelativeTime()}
          </span>
          {isDirty && (
            <span title="Unsaved changes">
              <CloudOff className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </span>
          )}
        </div>
        {note.tags.length > 0 && (
          <div className="flex gap-1">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
