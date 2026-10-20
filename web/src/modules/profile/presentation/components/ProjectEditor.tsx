import { useState, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { Loader2 } from 'lucide-react';
import { Button, DatePicker, Input, Label, Switch, Textarea } from '@/components/ui';
import type { ProjectType } from '@himan/shared/profile';
import { ProjectScreenshots } from './ProjectScreenshots';

export interface ProjectFormValues {
  name: string;
  description: string;
  url: string;
  androidUrl: string;
  iosUrl: string;
  // Raw comma-separated text; split on save so typing isn't reformatted.
  tech: string;
  platform: string;
  startDate: string;
  endDate: string;
  outcome: string;
  proofMetric: string;
  proofLabel: string;
  category: string;
  featured: boolean;
  images: string[];
}

const toFormValues = (project?: ProjectType): ProjectFormValues => ({
  name: project?.name ?? '',
  description: project?.description ?? '',
  url: project?.url ?? '',
  androidUrl: project?.androidUrl ?? '',
  iosUrl: project?.iosUrl ?? '',
  tech: project?.tech.join(', ') ?? '',
  platform: project?.platform.join(', ') ?? '',
  startDate: project?.startDate ? project.startDate.toISOString().slice(0, 10) : '',
  endDate: project?.endDate ? project.endDate.toISOString().slice(0, 10) : '',
  outcome: project?.outcome ?? '',
  proofMetric: project?.proofMetric ?? '',
  proofLabel: project?.proofLabel ?? '',
  category: project?.category ?? '',
  featured: project?.featured ?? false,
  images: project?.images ?? [],
});

interface ProjectEditorProps {
  project?: ProjectType;
  onSave: (values: ProjectFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const ProjectEditor = ({ project, onSave, onCancel, isSaving }: ProjectEditorProps) => {
  const [values, setValues] = useState<ProjectFormValues>(() => toFormValues(project));
  const fe = useFieldErrors();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    const invalid: [string, string][] = [];
    if (!values.name.trim()) invalid.push(['proj-name', 'Enter the project name']);
    if (invalid.length) { fe.failMany(invalid); return; }
    try {
      await onSave(values);
    } catch {
      fe.setFormError(project ? 'Failed to save project' : 'Failed to create project');
    }
  };

  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border p-4">
      <FormErrorBanner message={fe.formError} />
      <div className="space-y-2">
        <Label htmlFor="proj-name" required>Name</Label>
        <Input id="proj-name" required {...fe.invalid('proj-name')} value={values.name} onChange={(e) => { set('name', e.target.value); fe.clear('proj-name'); }} />
          <FieldError id="proj-name" message={fe.errors['proj-name']} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proj-description">Description</Label>
        <Textarea id="proj-description" value={values.description} onChange={(e) => set('description', e.target.value)} rows={3} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="proj-url">URL</Label>
          <Input id="proj-url" type="url" value={values.url} onChange={(e) => set('url', e.target.value)} placeholder="https://" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proj-android">Android</Label>
          <Input id="proj-android" type="url" value={values.androidUrl} onChange={(e) => set('androidUrl', e.target.value)} placeholder="https://play.google.com/…" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="proj-ios">iOS</Label>
          <Input id="proj-ios" type="url" value={values.iosUrl} onChange={(e) => set('iosUrl', e.target.value)} placeholder="https://apps.apple.com/…" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="proj-tech">Tech (comma-separated)</Label>
        <Input
          id="proj-tech"
          value={values.tech}
          onChange={(e) => set('tech', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="proj-platform">Platform (comma-separated, e.g. Android, iOS, Web)</Label>
        <Input
          id="proj-platform"
          value={values.platform}
          onChange={(e) => set('platform', e.target.value)}
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

      <fieldset className="space-y-4 rounded-md border border-dashed border-border p-4">
        <legend className="px-1 text-xs font-medium text-muted-foreground">Portfolio proof (public portfolio only)</legend>
        <div className="space-y-2">
          <Label htmlFor="proj-outcome">Outcome</Label>
          <Input
            id="proj-outcome"
            value={values.outcome}
            onChange={(e) => set('outcome', e.target.value)}
            placeholder="Built to cut booking back-and-forth for club members."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="proj-metric">Proof metric</Label>
            <Input id="proj-metric" value={values.proofMetric} onChange={(e) => set('proofMetric', e.target.value)} placeholder="#1, 40%, 10k+" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-metric-label">Metric label</Label>
            <Input id="proj-metric-label" value={values.proofLabel} onChange={(e) => set('proofLabel', e.target.value)} placeholder="Play Store · Lifestyle" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proj-category">Category</Label>
            <Input id="proj-category" value={values.category} onChange={(e) => set('category', e.target.value)} placeholder="Mobile App / Membership" />
          </div>
        </div>
        <ProjectScreenshots value={values.images} onChange={(images) => set('images', images)} />
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="proj-featured">Feature as the headline proof</Label>
          <Switch id="proj-featured" checked={values.featured} onCheckedChange={(v) => set('featured', v)} />
        </div>
      </fieldset>

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
