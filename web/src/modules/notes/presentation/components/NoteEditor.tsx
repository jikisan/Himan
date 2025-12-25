import { useState, useEffect, useCallback } from 'react';
import { Note } from '../../domain/entities';
import { RichTextEditor } from './RichTextEditor';
import { FileText } from 'lucide-react';

interface NoteEditorProps {
  note: Note | null;
  onUpdateNote: (noteId: string, title: string, content: string) => Promise<void>;
}

export const NoteEditor = ({ note, onUpdateNote }: NoteEditorProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
    } else {
      setTitle('');
      setContent('');
    }
  }, [note]);

  const saveNote = useCallback(
    async (newTitle: string, newContent: string) => {
      if (!note) return;

      setIsSaving(true);
      try {
        await onUpdateNote(note.id, newTitle, newContent);
      } catch (error) {
        console.error('Failed to save note:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [note, onUpdateNote]
  );

  useEffect(() => {
    if (!note) return;

    const timeoutId = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        saveNote(title, content);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [title, content, note, saveNote]);

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select a note to view</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Title Input */}
      <div className="border-b border-gray-200 p-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          className="w-full text-2xl font-bold text-gray-900 placeholder-gray-400 focus:outline-none"
        />
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-400">
            {isSaving ? 'Saving...' : 'Saved'}
          </span>
        </div>
      </div>

      {/* Rich Text Editor */}
      <RichTextEditor content={content} onChange={setContent} />
    </div>
  );
};
