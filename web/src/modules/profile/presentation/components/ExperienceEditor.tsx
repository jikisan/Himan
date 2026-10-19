import { useState, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { Loader2 } from 'lucide-react';
import { Button, DatePicker, Input, Label, Switch, Textarea } from '@/components/ui';
import type { ExperienceType } from '@himan/shared/profile';

export interface ExperienceFormValues {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  summary: string;
  bullets: string[];
}

const toFormValues = (experience?: ExperienceType): ExperienceFormValues => ({
  company: experience?.company ?? '',
  title: experience?.title ?? '',
  location: experience?.location ?? '',
  startDate: experience?.startDate ? experience.startDate.toISOString().slice(0, 10) : '',
  endDate: experience?.endDate ? experience.endDate.toISOString().slice(0, 10) : '',
  isCurrent: experience?.isCurrent ?? false,
  summary: experience?.summary ?? '',
  bullets: experience?.bullets ?? [],
});

interface ExperienceEditorProps {
  experience?: ExperienceType;
  onSave: (values: ExperienceFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const ExperienceEditor = ({ experience, onSave, onCancel, isSaving }: ExperienceEditorProps) => {
  const [values, setValues] = useState<ExperienceFormValues>(() => toFormValues(experience));
  const fe = useFieldErrors();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    const invalid: [string, string][] = [];
    if (!values.company.trim()) invalid.push(['exp-company', 'Enter the company']);
    if (!values.title.trim()) invalid.push(['exp-title', 'Enter the title']);
    if (invalid.length) { fe.failMany(invalid); return; }
    try {
      await onSave(values);
    } catch {
      fe.setFormError(experience ? 'Failed to save experience' : 'Failed to create experience');
    }
  };

  const set = <K extends keyof ExperienceFormValues>(key: K, value: ExperienceFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border p-4">
      <FormErrorBanner message={fe.formError} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exp-company" required>Company</Label>
          <Input id="exp-company" required {...fe.invalid('exp-company')} value={values.company} onChange={(e) => { set('company', e.target.value); fe.clear('exp-company'); }} />
          <FieldError id="exp-company" message={fe.errors['exp-company']} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-title" required>Title</Label>
          <Input id="exp-title" required {...fe.invalid('exp-title')} value={values.title} onChange={(e) => { set('title', e.target.value); fe.clear('exp-title'); }} />
          <FieldError id="exp-title" message={fe.errors['exp-title']} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exp-location">Location</Label>
        <Input id="exp-location" value={values.location} onChange={(e) => set('location', e.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start date</Label>
          <DatePicker value={values.startDate} onChange={(v) => set('startDate', v)} />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <DatePicker value={values.endDate} onChange={(v) => set('endDate', v)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={values.isCurrent} onCheckedChange={(v) => set('isCurrent', v)} id="exp-current" />
        <Label htmlFor="exp-current">Current role</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exp-summary">Summary</Label>
        <Textarea id="exp-summary" value={values.summary} onChange={(e) => set('summary', e.target.value)} rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="exp-bullets">Bullets (one per line)</Label>
        <Textarea
          id="exp-bullets"
          value={values.bullets.join('\n')}
          onChange={(e) => set('bullets', e.target.value.split('\n'))}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};
