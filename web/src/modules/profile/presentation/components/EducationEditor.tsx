import { useState } from 'react';
import { Button, DatePicker, Input, Label, Textarea } from '@/components/ui';
import type { EducationType } from '@himan/shared/profile';

export interface EducationFormValues {
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  gpa: string;
  achievements: string[];
}

const toFormValues = (education?: EducationType): EducationFormValues => ({
  school: education?.school ?? '',
  degree: education?.degree ?? '',
  field: education?.field ?? '',
  location: education?.location ?? '',
  startDate: education?.startDate ? education.startDate.toISOString().slice(0, 10) : '',
  endDate: education?.endDate ? education.endDate.toISOString().slice(0, 10) : '',
  gpa: education?.gpa ?? '',
  achievements: education?.achievements ?? [],
});

interface EducationEditorProps {
  education?: EducationType;
  onSave: (values: EducationFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const EducationEditor = ({ education, onSave, onCancel, isSaving }: EducationEditorProps) => {
  const [values, setValues] = useState<EducationFormValues>(() => toFormValues(education));

  const set = <K extends keyof EducationFormValues>(key: K, value: EducationFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edu-school">School</Label>
          <Input id="edu-school" value={values.school} onChange={(e) => set('school', e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edu-location">Location</Label>
          <Input id="edu-location" value={values.location} onChange={(e) => set('location', e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="edu-degree">Degree</Label>
          <Input id="edu-degree" value={values.degree} onChange={(e) => set('degree', e.target.value)} placeholder="Bachelor of Science" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edu-field">Field</Label>
          <Input id="edu-field" value={values.field} onChange={(e) => set('field', e.target.value)} placeholder="Information Technology" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Start date</Label>
          <DatePicker value={values.startDate} onChange={(v) => set('startDate', v)} />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <DatePicker value={values.endDate} onChange={(v) => set('endDate', v)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edu-gpa">GPA</Label>
          <Input id="edu-gpa" value={values.gpa} onChange={(e) => set('gpa', e.target.value)} placeholder="1.7" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edu-achievements">Achievements (one per line)</Label>
        <Textarea
          id="edu-achievements"
          value={values.achievements.join('\n')}
          onChange={(e) => set('achievements', e.target.value.split('\n'))}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(values)} disabled={isSaving || !values.school.trim()}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
