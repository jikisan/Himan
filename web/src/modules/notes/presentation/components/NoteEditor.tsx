import { EditorContent } from '@tiptap/react';
import { MoreVertical, Pin, Trash2, FolderInput } from 'lucide-react';
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
}

export const NoteEditor = ({
  note,
  onTitleChange,
  onContentChange,
  onTogglePin,
  onDelete,
  onMoveToFolder,
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
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Input
          value={note.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0"
          placeholder="Untitled"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
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

      <div className="p-2 border-t border-border text-xs text-muted-foreground text-center">
        Last edited {note.getRelativeTime()}
      </div>
    </div>
  );
};
