import { EditorContent } from '@tiptap/react';
import { MoreVertical, Pin, Trash2, FolderInput, Menu } from 'lucide-react';
import { Note as NoteEntity } from '../../domain/entities/Note';
import { EditorToolbar } from './EditorToolbar';
import { useEditor } from '../hooks/useEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NoteEditorProps {
  note: NoteEntity;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onMoveToFolder: () => void;
  onOpenMobileMenu?: () => void;
}

export const NoteEditor = ({
  note,
  onTitleChange,
  onContentChange,
  onTogglePin,
  onDelete,
  onMoveToFolder,
  onOpenMobileMenu,
}: NoteEditorProps) => {
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
  } = useEditor({
    content: note.content,
    onUpdate: onContentChange,
  });

  return (
    <div className="flex-1 bg-background flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-2">
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
        <Input
          value={note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-xl sm:text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 flex-1"
          placeholder="Untitled"
        />

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

      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>

      <div className="hidden sm:block p-2 border-t border-border text-xs text-muted-foreground text-center">
        Last edited {note.getRelativeTime()}
      </div>
    </div>
  );
};
