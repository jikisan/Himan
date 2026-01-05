import { useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { MoreVertical, Pin, Trash2, FolderInput, Menu, Cloud, CloudOff } from 'lucide-react';
import { z } from 'zod';
import { Note as NoteEntity } from '../../domain/entities/Note';
import type { SyncStatus } from '../../infrastructure/services/NoteSyncService';
import { EditorToolbar } from './EditorToolbar';
import { useEditor } from '../hooks/useEditor';
import { useSubscription } from '@subscriptions/presentation/hooks';
import { TIER_LIMITS } from '@subscriptions/domain';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const NOTE_TITLE_MAX_LENGTH = 255;

const noteTitleSchema = z.string()
  .max(NOTE_TITLE_MAX_LENGTH, `Title must be ${NOTE_TITLE_MAX_LENGTH} characters or less`);

interface NoteEditorProps {
  note: NoteEntity;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
  onOpenMobileMenu?: () => void;
  syncStatus: SyncStatus;
}

export const NoteEditor = ({
  note,
  onTitleChange,
  onContentChange,
  onTogglePin,
  onDelete,
  onMoveToFolder,
  onOpenMobileMenu,
  syncStatus,
}: NoteEditorProps) => {
  const [titleError, setTitleError] = useState<string | null>(null);
  const { tier } = useSubscription();

  // Get the character limit based on user's tier
  const characterLimit = TIER_LIMITS[tier].maxNoteSize;

  const {
    editor,
    toggleBold,
    toggleItalic,
    toggleStrikethrough,
    toggleHeading,
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,
    toggleHighlight,
    getCharacterCount,
    isLimitExceeded,
    maxLength,
  } = useEditor({
    content: note.content,
    onUpdate: onContentChange,
    maxLength: characterLimit, // Use tier-based limit
  });

  const handleTitleChange = (value: string) => {
    const validation = noteTitleSchema.safeParse(value);

    if (!validation.success) {
      setTitleError(validation.error.issues[0].message);
      // Still allow the change but show error
      onTitleChange(value.slice(0, NOTE_TITLE_MAX_LENGTH));
      return;
    }

    setTitleError(null);
    onTitleChange(value);
  };

  return (
    <div className="flex-1 bg-card flex flex-col overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile: Hamburger Menu */}
          {onOpenMobileMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenMobileMenu}
              className="h-8 w-8 lg:hidden flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Note Title */}
          <div className="flex-1 min-w-0">
            <Input
              value={note.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              maxLength={NOTE_TITLE_MAX_LENGTH}
              className={`text-lg sm:text-xl lg:text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 ${
                titleError ? 'text-destructive' : ''
              }`}
              placeholder="Untitled"
            />
          </div>

          {/* More Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onTogglePin}>
                <Pin className="h-4 w-4 mr-2" />
                {note.isPinned ? 'Unpin' : 'Pin'} Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMoveToFolder}>
                <FolderInput className="h-4 w-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Title Validation Feedback */}
        {titleError && (
          <p className="text-xs text-destructive mt-1 px-0">{titleError}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1 px-0">
          {note.title.length}/{NOTE_TITLE_MAX_LENGTH} characters
        </p>
      </div>

      <EditorToolbar
        editor={editor}
        onToggleBold={toggleBold}
        onToggleItalic={toggleItalic}
        onToggleStrikethrough={toggleStrikethrough}
        onToggleHeading={toggleHeading}
        onToggleBulletList={toggleBulletList}
        onToggleOrderedList={toggleOrderedList}
        onToggleTaskList={toggleTaskList}
        onToggleHighlight={toggleHighlight}
      />

      <div className="flex-1 overflow-y-auto editor-scroll">
        <EditorContent editor={editor} className="h-full" />
      </div>

      <div className="p-2 border-t border-border text-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden sm:inline">
            Last edited {note.getRelativeTime()}
          </span>
          {/* Sync Status Indicator */}
          <span className="flex items-center gap-1">
            {syncStatus.pending > 0 ? (
              <>
                <CloudOff className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Saved locally</span>
              </>
            ) : (
              <>
                <Cloud className="h-3 w-3 text-primary" />
                <span className="text-primary">Synced</span>
              </>
            )}
          </span>
        </div>
        <span className={`${isLimitExceeded() ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
          {getCharacterCount().toLocaleString()}/{maxLength.toLocaleString()} characters
        </span>
      </div>
    </div>
  );
};
