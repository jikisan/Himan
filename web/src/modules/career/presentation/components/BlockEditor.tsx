import { useEffect, useState, type FormEvent } from 'react';
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
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
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
  const fe = useFieldErrors();
  const clearErrors = fe.clear;

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens for a different block
    setKind(block?.kind ?? 'experience_line');
    setLabel(block?.label ?? '');
    setBody(block?.body ?? '');
    setTags(block?.tags.join(', ') ?? '');
    clearErrors();
  }, [open, block, clearErrors]);

  const preview = resolvePlaceholders(body, SAMPLE_CTX);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    const invalid: [string, string][] = [];
    if (!label.trim()) invalid.push(['label', 'Enter a label']);
    if (!body.trim()) invalid.push(['body', 'Enter the block text']);
    if (invalid.length) { fe.failMany(invalid); return; }
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
    } catch {
      fe.setFormError('Failed to save block');
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

        <form noValidate onSubmit={handleSave} className="space-y-4">
          <FormErrorBanner message={fe.formError} />
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
            <Label htmlFor="label" required>Label</Label>
            <Input
              id="label"
              required
              {...fe.invalid('label')}
              value={label}
              onChange={(e) => { setLabel(e.target.value); fe.clear('label'); }}
              placeholder="e.g. Android"
              maxLength={100}
            />
            <FieldError id="label" message={fe.errors.label} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body" required>Body</Label>
            <Textarea
              id="body"
              required
              {...fe.invalid('body')}
              value={body}
              onChange={(e) => { setBody(e.target.value); fe.clear('body'); }}
              placeholder="Use {{job_title}}, {{company}}, {{hiring_manager}}, {{hook}}, {{portfolio_url}}"
              rows={6}
            />
            <FieldError id="body" message={fe.errors.body} />
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save block'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
