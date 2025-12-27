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
    <div className="overflow-x-auto border-b border-border bg-background sticky top-0 z-10 toolbar-scroll">
      <div className="flex items-center gap-0.5 sm:gap-1 p-2 min-w-max">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleBold}
          className={cn('h-8 w-8 p-0', editor.isActive('bold') && 'bg-accent')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleItalic}
          className={cn('h-8 w-8 p-0', editor.isActive('italic') && 'bg-accent')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleStrikethrough}
          className={cn('h-8 w-8 p-0', editor.isActive('strike') && 'bg-accent')}
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
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 1 }) && 'bg-accent'
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
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 2 }) && 'bg-accent'
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
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 3 }) && 'bg-accent'
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
          className={cn('h-8 w-8 p-0', editor.isActive('bulletList') && 'bg-accent')}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleOrderedList}
          className={cn('h-8 w-8 p-0', editor.isActive('orderedList') && 'bg-accent')}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleTaskList}
          className={cn('h-8 w-8 p-0', editor.isActive('taskList') && 'bg-accent')}
        >
          <CheckSquare className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleHighlight}
          className={cn('h-8 w-8 p-0', editor.isActive('highlight') && 'bg-accent')}
        >
          <Highlighter className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
