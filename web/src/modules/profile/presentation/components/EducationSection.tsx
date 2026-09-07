import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useEducation } from '../hooks/useEducation';
import { EducationCard } from './EducationCard';
import { EducationEditor, type EducationFormValues } from './EducationEditor';

const toDto = (values: EducationFormValues) => ({
  school: values.school.trim(),
  degree: values.degree.trim() || null,
  field: values.field.trim() || null,
  location: values.location.trim() || null,
  startDate: values.startDate ? new Date(values.startDate) : null,
  endDate: values.endDate ? new Date(values.endDate) : null,
  gpa: values.gpa.trim() || null,
  achievements: values.achievements.map((a) => a.trim()).filter(Boolean),
});

export const EducationSection = () => {
  const { data, loading, create, update, remove, reorder } = useEducation();
  const [adding, setAdding] = useState(false);

  const handleAdd = async (values: EducationFormValues) => {
    await create(toDto(values));
    setAdding(false);
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
        <CardTitle>Education</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && <EducationEditor onSave={handleAdd} onCancel={() => setAdding(false)} />}
        {!loading && data.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No education added yet.</p>
        )}
        {data.map((education, index) => (
          <EducationCard
            key={education.id}
            education={education}
            onSave={(values) => update(education.id, toDto(values))}
            onDelete={() => remove(education.id)}
            onMoveUp={index > 0 ? () => handleMove(index, -1) : undefined}
            onMoveDown={index < data.length - 1 ? () => handleMove(index, 1) : undefined}
          />
        ))}
      </CardContent>
    </Card>
  );
};
