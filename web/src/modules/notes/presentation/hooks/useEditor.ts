import { useEditor as useTiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import { useCallback, useEffect, useRef } from 'react';

export const NOTE_CONTENT_MAX_LENGTH = 50000; // 50k characters

interface UseEditorOptions {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
  autosaveDelay?: number;
  maxLength?: number;
}

export const useEditor = ({
  content,
  onUpdate,
  placeholder = 'Start typing...',
  autosaveDelay = 1000,
  maxLength = NOTE_CONTENT_MAX_LENGTH,
}: UseEditorOptions) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useTiptapEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Typography,
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CharacterCount.configure({
        limit: maxLength,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const html = editor.getHTML();
        onUpdate(html);
      }, autosaveDelay);
    },
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-full p-6',
      },
    },
  });

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Save cursor position
      const { from, to } = editor.state.selection;

      // Update content without emitting an update event
      editor.commands.setContent(content, { emitUpdate: false });

      // Restore cursor position (with bounds checking)
      try {
        const docSize = editor.state.doc.content.size;

        // Ensure cursor positions are within the new document bounds
        const safeFrom = Math.min(from, docSize);
        const safeTo = Math.min(to, docSize);

        // Only restore if positions are valid
        if (safeFrom >= 0 && safeTo >= 0 && safeFrom <= docSize && safeTo <= docSize) {
          editor.commands.setTextSelection({ from: safeFrom, to: safeTo });
        }
      } catch {
        // If cursor restoration fails, just move cursor to end
        editor.commands.focus('end');
      }
    }
  }, [content, editor]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const toggleStrikethrough = useCallback(() => {
    editor?.chain().focus().toggleStrike().run();
  }, [editor]);

  const toggleHeading = useCallback(
    (level: 1 | 2 | 3) => {
      editor?.chain().focus().toggleHeading({ level }).run();
    },
    [editor]
  );

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleTaskList = useCallback(() => {
    editor?.chain().focus().toggleTaskList().run();
  }, [editor]);

  const toggleHighlight = useCallback(() => {
    editor?.chain().focus().toggleHighlight().run();
  }, [editor]);

  const getCharacterCount = useCallback(() => {
    return editor?.storage.characterCount.characters() || 0;
  }, [editor]);

  const isLimitExceeded = useCallback(() => {
    return (editor?.storage.characterCount.characters() || 0) > maxLength;
  }, [editor, maxLength]);

  return {
    editor,
    toggleBold,
    toggleItalic,
    toggleUnderline,
    toggleStrikethrough,
    toggleHeading,
    toggleBulletList,
    toggleOrderedList,
    toggleTaskList,
    toggleHighlight,
    getCharacterCount,
    isLimitExceeded,
    maxLength,
  };
};
