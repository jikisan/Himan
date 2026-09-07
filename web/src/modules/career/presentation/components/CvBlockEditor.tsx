import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import type { CareerCvBlockType, CreateCareerCvBlockDto, CvBlockKind } from '@himan/shared/career';

const KIND_OPTIONS: { value: CvBlockKind; label: string }[] = [
  { value: 'summary', label: 'Summary' },
  { value: 'experience', label: 'Experience' },
  { value: 'skills', label: 'Skills' },
  { value: 'project', label: 'Project' },
  { value: 'education', label: 'Education' },
  { value: 'certification', label: 'Certification' },
  { value: 'custom', label: 'Custom' },
];

interface CvBlockEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: CareerCvBlockType | null;
  // Placeholder keys resolvable in the body ({{github}}, {{email}}, ...),
  // derived from the profile so the writer knows which hooks exist.
  tokens: string[];
  onSave: (dto: Omit<CreateCareerCvBlockDto, 'userId'>) => Promise<void>;
}

export const CvBlockEditor = ({ open, onOpenChange, block, tokens, onSave }: CvBlockEditorProps) => {
  const [kind, setKind] = useState<CvBlockKind>('custom');
  const [label, setLabel] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens for a different block
    setKind(block?.kind ?? 'custom');
    setLabel(block?.label ?? '');
    setTitle(block?.title ?? '');
    setBody(block?.body ?? '');
    setTags(block?.tags.join(', ') ?? '');
  }, [open, block]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        kind,
        label: label.trim(),
        title: title.trim(),
        body: body.trim(),
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cv-block-kind">Kind</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as CvBlockKind)}>
                <SelectTrigger id="cv-block-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cv-block-label">Label</Label>
              <Input
                id="cv-block-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Backend"
                maxLength={100}
              />
            </div>
          </div>

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
              placeholder="Freeform text, printed under the title. Insert {{github}}, {{linkedin}}, {{email}}, ..."
              rows={6}
            />
          </div>

          {tokens.length > 0 && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1.5">Available hooks (click to insert):</p>
              <div className="flex flex-wrap gap-1.5">
                {tokens.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => setBody((b) => `${b}{{${token}}}`)}
                    className="text-xs font-mono rounded border border-border px-1.5 py-0.5 hover:bg-accent transition-colors"
                  >
                    {`{{${token}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cv-block-tags">Tags (comma-separated)</Label>
            <Input
              id="cv-block-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="backend, remote"
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
