import { useState } from 'react';
import { Search, Plus, Pin, Trash2 } from 'lucide-react';
import { Note } from '../../domain/entities';
import { cn, formatRelativeTime } from '@core/presentation/utils';

interface NotesListProps {
  notes: Note[];
  selectedNoteId: string | null;
  onNoteSelect: (noteId: string) => void;
  onCreateNote: () => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onTogglePin: (noteId: string, isPinned: boolean) => Promise<void>;
  onSearch: (query: string) => void;
  loading?: boolean;
}

export const NotesList = ({
  notes,
  selectedNoteId,
  onNoteSelect,
  onCreateNote,
  onDeleteNote,
  onTogglePin,
  onSearch,
  loading,
}: NotesListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await onDeleteNote(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleTogglePin = async (noteId: string, isPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onTogglePin(noteId, !isPinned);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const extractExcerpt = (content: string): string => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.substring(0, 100) + (text.length > 100 ? '...' : '');
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          <button
            onClick={onCreateNote}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="New note"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {searchQuery ? 'No notes found' : 'No notes yet'}
          </div>
        ) : (
          <div>
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => onNoteSelect(note.id)}
                onMouseEnter={() => setHoveredNoteId(note.id)}
                onMouseLeave={() => setHoveredNoteId(null)}
                className={cn(
                  'group relative px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors',
                  selectedNoteId === note.id && 'bg-blue-50 hover:bg-blue-50'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="flex-1 text-sm font-medium text-gray-900 line-clamp-1">
                    {note.title || 'Untitled'}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleTogglePin(note.id, note.isPinned, e)}
                      className={cn(
                        'p-1 rounded hover:bg-gray-200 transition-all',
                        note.isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                      title={note.isPinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin
                        className={cn(
                          'w-4 h-4',
                          note.isPinned ? 'text-blue-600 fill-blue-600' : 'text-gray-500'
                        )}
                      />
                    </button>
                    {hoveredNoteId === note.id && (
                      <button
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                  {note.excerpt || extractExcerpt(note.content) || 'No content'}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(note.updatedAt)}
                  </span>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1">
                      {note.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="text-xs text-gray-400">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
