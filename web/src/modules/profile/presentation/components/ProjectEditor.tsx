import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button, DatePicker, Input, Label, Textarea } from '@/components/ui';
import type { ProjectType } from '@himan/shared/profile';

export interface ProjectFormValues {
  name: string;
  description: string;
  url: string;
  tech: string[];
  platform: string[];
  startDate: string;
  endDate: string;
}

const toFormValues = (project?: ProjectType): ProjectFormValues => ({
  name: project?.name ?? '',
  description: project?.description ?? '',
  url: project?.url ?? '',
  tech: project?.tech ?? [],
  platform: project?.platform ?? [],
  startDate: project?.startDate ? project.startDate.toISOString().slice(0, 10) : '',
  endDate: project?.endDate ? project.endDate.toISOString().slice(0, 10) : '',
});

interface ProjectEditorProps {
  project?: ProjectType;
  onSave: (values: ProjectFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const ProjectEditor = ({ project, onSave, onCancel, isSaving }: ProjectEditorProps) => {
  const [values, setValues] = useState<ProjectFormValues>(() => toFormValues(project));

  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="space-y-2">
        <Label htmlFor="proj-name">Name</Label>
        <Input id="proj-name" value={values.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proj-description">Description</Label>
        <Textarea id="proj-description" value={values.description} onChange={(e) => set('description', e.target.value)} rows={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="proj-url">URL</Label>
          <Input id="proj-url" value={values.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proj-tech">Tech (comma-separated)</Label>
          <Input
            id="proj-tech"
            value={values.tech.join(', ')}
            onChange={(e) => set('tech', e.target.value.split(','))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proj-platform">Platform (comma-separated, e.g. Android, iOS, Web)</Label>
        <Input
          id="proj-platform"
          value={values.platform.join(', ')}
          onChange={(e) => set('platform', e.target.value.split(','))}
        />
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

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(values)} disabled={isSaving || !values.name.trim()}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
