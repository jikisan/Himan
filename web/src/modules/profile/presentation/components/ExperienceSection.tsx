import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useExperiences } from '../hooks/useExperiences';
import { ExperienceCard } from './ExperienceCard';
import { ExperienceEditor, type ExperienceFormValues } from './ExperienceEditor';

const toDto = (values: ExperienceFormValues) => ({
  company: values.company.trim(),
  title: values.title.trim(),
  location: values.location.trim() || null,
  startDate: values.startDate ? new Date(values.startDate) : null,
  endDate: values.isCurrent ? null : values.endDate ? new Date(values.endDate) : null,
  isCurrent: values.isCurrent,
  summary: values.summary.trim() || null,
  bullets: values.bullets.map((b) => b.trim()).filter(Boolean),
});

export const ExperienceSection = () => {
  const { data, loading, create, update, remove, reorder } = useExperiences();
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleAdd = async (values: ExperienceFormValues) => {
    setSavingId('new');
    try {
      await create(toDto(values));
      setAdding(false);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdate = async (id: string, values: ExperienceFormValues) => {
    setSavingId(id);
    try {
      await update(id, toDto(values));
    } finally {
      setSavingId(null);
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const ids = data.map((e) => e.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder(ids);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Experience</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && <ExperienceEditor onSave={handleAdd} onCancel={() => setAdding(false)} isSaving={savingId === 'new'} />}
        {!loading && data.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No experience added yet.</p>
        )}
        {data.map((experience, index) => (
          <ExperienceCard
            key={experience.id}
            experience={experience}
            onSave={(values) => handleUpdate(experience.id, values)}
            onDelete={() => remove(experience.id)}
            onMoveUp={index > 0 ? () => handleMove(index, -1) : undefined}
            onMoveDown={index < data.length - 1 ? () => handleMove(index, 1) : undefined}
            isSaving={savingId === experience.id}
          />
        ))}
      </CardContent>
    </Card>
  );
};
