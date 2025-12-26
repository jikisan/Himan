import { useState, useRef, useEffect } from 'react';
import { Plus, Search, GripVertical } from 'lucide-react';
import { Note } from '../../domain/entities/Note';
import { NoteItem } from './NoteItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: () => Promise<void>;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const NotesList = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  loading,
  searchQuery,
  onSearchChange,
}: NotesListProps) => {
  const MIN_WIDTH = 150;
  const MAX_WIDTH = 600;
  const DEFAULT_WIDTH = 320;

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX - (resizeRef.current?.getBoundingClientRect().left || 0);
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <div
      ref={resizeRef}
      className="bg-card border-r border-border flex flex-col relative"
      style={{ width: `${width}px`, minWidth: `${MIN_WIDTH}px`, maxWidth: `${MAX_WIDTH}px` }}
    >
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">
            Notes
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCreateNote}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loading && notes.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>
        ) : notes.length === 0 && !loading ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            {searchQuery ? 'No notes found' : 'No notes yet. Create one to get started!'}
          </div>
        ) : (
          notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              isActive={selectedNoteId === note.id}
              onClick={() => onSelectNote(note)}
            />
          ))
        )}
      </ScrollArea>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};
