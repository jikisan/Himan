import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label, Textarea } from '@/components/ui';
import type { CareerCvBlockType, CreateCareerCvBlockDto } from '@himan/shared/career';

interface CvBlockEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: CareerCvBlockType | null;
  onSave: (dto: Omit<CreateCareerCvBlockDto, 'userId'>) => Promise<void>;
}

export const CvBlockEditor = ({ open, onOpenChange, block, onSave }: CvBlockEditorProps) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(block?.title ?? '');
    setBody(block?.body ?? '');
  }, [open, block]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await onSave({ title: title.trim(), body: body.trim() });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{block ? 'Edit CV block' : 'New CV block'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cv-block-title">Title</Label>
            <Input
              id="cv-block-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Objective"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv-block-body">Body</Label>
            <Textarea
              id="cv-block-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Freeform text, printed under the title as its own CV section"
              rows={6}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save block'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
