import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { ProjectEditor, type ProjectFormValues } from './ProjectEditor';
import { ProjectMediaService } from '../../infrastructure';

const toDto = (values: ProjectFormValues) => ({
  name: values.name.trim(),
  description: values.description.trim() || null,
  url: values.url.trim() || null,
  androidUrl: values.androidUrl.trim() || null,
  iosUrl: values.iosUrl.trim() || null,
  tech: values.tech.split(',').map((t) => t.trim()).filter(Boolean),
  platform: values.platform.split(',').map((p) => p.trim()).filter(Boolean),
  startDate: values.startDate ? new Date(values.startDate) : null,
  endDate: values.endDate ? new Date(values.endDate) : null,
  outcome: values.outcome.trim() || null,
  proofMetric: values.proofMetric.trim() || null,
  proofLabel: values.proofLabel.trim() || null,
  category: values.category.trim() || null,
  featured: values.featured,
  images: values.images,
});

const media = new ProjectMediaService();

export const ProjectSection = () => {
  const { data, loading, create, update, remove, reorder } = useProjects();
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleAdd = async (values: ProjectFormValues) => {
    setSavingId('new');
    try {
      await create(toDto(values));
      setAdding(false);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdate = async (id: string, values: ProjectFormValues) => {
    setSavingId(id);
    const before = data.find((p) => p.id === id)?.images ?? [];
    try {
      await update(id, toDto(values));
      // Delete dropped screenshots only once the project no longer points at them.
      await media.remove(before.filter((path) => !values.images.includes(path)));
    } finally {
      setSavingId(null);
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const ids = data.map((p) => p.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Projects</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && <ProjectEditor onSave={handleAdd} onCancel={() => setAdding(false)} isSaving={savingId === 'new'} />}
        {!loading && data.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No projects added yet.</p>
        )}
        {data.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            onSave={(values) => handleUpdate(project.id, values)}
            onDelete={async () => {
              await remove(project.id);
              await media.remove(project.images);
            }}
            onMoveUp={index > 0 ? () => handleMove(index, -1) : undefined}
            onMoveDown={index < data.length - 1 ? () => handleMove(index, 1) : undefined}
            isSaving={savingId === project.id}
          />
        ))}
      </CardContent>
    </Card>
  );
};
