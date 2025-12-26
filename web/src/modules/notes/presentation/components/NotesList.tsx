import { Plus, Search } from 'lucide-react';
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
  return (
    <div className="w-80 bg-card border-r border-border flex flex-col">
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
    </div>
  );
};
