import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useProjects } from '../hooks/useProjects';
import { ProjectCard } from './ProjectCard';
import { ProjectEditor, type ProjectFormValues } from './ProjectEditor';

const toDto = (values: ProjectFormValues) => ({
  name: values.name.trim(),
  description: values.description.trim() || null,
  url: values.url.trim() || null,
  tech: values.tech.map((t) => t.trim()).filter(Boolean),
  platform: values.platform.map((p) => p.trim()).filter(Boolean),
  startDate: values.startDate ? new Date(values.startDate) : null,
  endDate: values.endDate ? new Date(values.endDate) : null,
});

export const ProjectSection = () => {
  const { data, loading, create, update, remove, reorder } = useProjects();
  const [adding, setAdding] = useState(false);

  const handleAdd = async (values: ProjectFormValues) => {
    await create(toDto(values));
    setAdding(false);
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
        {adding && <ProjectEditor onSave={handleAdd} onCancel={() => setAdding(false)} />}
        {!loading && data.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No projects added yet.</p>
        )}
        {data.map((project, index) => (
          <ProjectCard
            key={project.id}
            project={project}
            onSave={(values) => update(project.id, toDto(values))}
            onDelete={() => remove(project.id)}
            onMoveUp={index > 0 ? () => handleMove(index, -1) : undefined}
            onMoveDown={index < data.length - 1 ? () => handleMove(index, 1) : undefined}
          />
        ))}
      </CardContent>
    </Card>
  );
};
