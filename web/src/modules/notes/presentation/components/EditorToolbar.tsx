import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Highlighter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Editor } from '@tiptap/react';
import { cn } from '@core/presentation/utils';

interface EditorToolbarProps {
  editor: Editor | null;
  onToggleBold: () => void;
  onToggleItalic: () => void;
  onToggleStrikethrough: () => void;
  onToggleHeading: (level: 1 | 2 | 3) => void;
  onToggleBulletList: () => void;
  onToggleOrderedList: () => void;
  onToggleTaskList: () => void;
  onToggleHighlight: () => void;
}

export const EditorToolbar = ({
  editor,
  onToggleBold,
  onToggleItalic,
  onToggleStrikethrough,
  onToggleHeading,
  onToggleBulletList,
  onToggleOrderedList,
  onToggleTaskList,
  onToggleHighlight,
}: EditorToolbarProps) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-background sticky top-0 z-10">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleBold}
        className={cn(editor.isActive('bold') && 'bg-accent')}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleItalic}
        className={cn(editor.isActive('italic') && 'bg-gray-100 dark:bg-gray-800')}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleStrikethrough}
        className={cn(editor.isActive('strike') && 'bg-gray-100 dark:bg-gray-800')}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onToggleHeading(1)}
        className={cn(
          editor.isActive('heading', { level: 1 }) && 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onToggleHeading(2)}
        className={cn(
          editor.isActive('heading', { level: 2 }) && 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onToggleHeading(3)}
        className={cn(
          editor.isActive('heading', { level: 3 }) && 'bg-gray-100 dark:bg-gray-800'
        )}
      >
        <Heading3 className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleBulletList}
        className={cn(editor.isActive('bulletList') && 'bg-gray-100 dark:bg-gray-800')}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleOrderedList}
        className={cn(editor.isActive('orderedList') && 'bg-gray-100 dark:bg-gray-800')}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleTaskList}
        className={cn(editor.isActive('taskList') && 'bg-gray-100 dark:bg-gray-800')}
      >
        <CheckSquare className="h-4 w-4" />
      </Button>
      <div className="w-px h-6 bg-border mx-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleHighlight}
        className={cn(editor.isActive('highlight') && 'bg-gray-100 dark:bg-gray-800')}
      >
        <Highlighter className="h-4 w-4" />
      </Button>
    </div>
  );
};
