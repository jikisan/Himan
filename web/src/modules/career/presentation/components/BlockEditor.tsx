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
import { resolvePlaceholders, type CareerBlockKind, type CareerBlockType, type CreateCareerBlockDto } from '@himan/shared/career';

const KIND_OPTIONS: { value: CareerBlockKind; label: string }[] = [
  { value: 'greeting', label: 'Greeting' },
  { value: 'opening', label: 'Opening' },
  { value: 'experience_line', label: 'Experience line' },
  { value: 'proof', label: 'Proof paragraph' },
  { value: 'portfolio_line', label: 'Portfolio line' },
  { value: 'close', label: 'Close' },
  { value: 'cv_summary', label: 'CV summary' },
];

const SAMPLE_CTX = {
  jobTitle: 'Senior Software Engineer',
  company: 'Acme Corp',
  hiringManager: undefined,
  hook: 'I recently read about your platform launch and it aligns closely with my background.',
};

interface BlockEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: CareerBlockType | null;
  onSave: (dto: Omit<CreateCareerBlockDto, 'userId'>) => Promise<void>;
}

export const BlockEditor = ({ open, onOpenChange, block, onSave }: BlockEditorProps) => {
  const [kind, setKind] = useState<CareerBlockKind>('experience_line');
  const [label, setLabel] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKind(block?.kind ?? 'experience_line');
    setLabel(block?.label ?? '');
    setBody(block?.body ?? '');
    setTags(block?.tags.join(', ') ?? '');
  }, [open, block]);

  const preview = resolvePlaceholders(body, SAMPLE_CTX);

  const handleSave = async () => {
    if (!label.trim() || !body.trim()) return;
    setIsSaving(true);
    try {
      await onSave({
        kind,
        label: label.trim(),
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
          <DialogTitle>{block ? 'Edit block' : 'New block'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kind">Kind</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as CareerBlockKind)}>
              <SelectTrigger id="kind">
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
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Android"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Use {{job_title}}, {{company}}, {{hiring_manager}}, {{hook}}"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="android, mobile"
            />
          </div>

          {body.trim() && (
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-1">Preview with sample values:</p>
              <p className="text-sm whitespace-pre-wrap">{preview.text}</p>
              {preview.missing.length > 0 && (
                <p className="text-xs text-destructive mt-1">
                  Unresolved: {preview.missing.join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !label.trim() || !body.trim()}>
              {isSaving ? 'Saving...' : 'Save block'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
