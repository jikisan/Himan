import { useState } from 'react';
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

  const set = <K extends keyof ExperienceFormValues>(key: K, value: ExperienceFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="exp-company">Company</Label>
          <Input id="exp-company" value={values.company} onChange={(e) => set('company', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="exp-title">Title</Label>
          <Input id="exp-title" value={values.title} onChange={(e) => set('title', e.target.value)} />
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
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(values)} disabled={isSaving || !values.company.trim() || !values.title.trim()}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
