import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { EducationType } from '@himan/shared/profile';
import { EducationEditor, type EducationFormValues } from './EducationEditor';

interface EducationCardProps {
  education: EducationType;
  onSave: (values: EducationFormValues) => Promise<unknown> | void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isSaving?: boolean;
}

export const EducationCard = ({ education, onSave, onDelete, onMoveUp, onMoveDown, isSaving }: EducationCardProps) => {
  const [editing, setEditing] = useState(false);

  const handleSave = async (values: EducationFormValues) => {
    await onSave(values);
    setEditing(false);
  };

  if (editing) {
    return <EducationEditor education={education} onSave={handleSave} onCancel={() => setEditing(false)} isSaving={isSaving} />;
  }

  const degreeLine = [education.degree, education.field].filter(Boolean).join(', ');
  const dateRange = [
    education.startDate ? format(education.startDate, 'MMM yyyy') : null,
    education.endDate ? format(education.endDate, 'MMM yyyy') : education.startDate ? 'Present' : null,
  ].filter(Boolean).join(' – ');

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{education.school}</p>
          {degreeLine && <p className="text-sm text-muted-foreground">{degreeLine}{education.location ? ` · ${education.location}` : ''}</p>}
          {dateRange && <p className="text-xs text-muted-foreground mt-0.5">{dateRange}</p>}
          {education.gpa && <p className="text-sm mt-1">GPA: {education.gpa}</p>}
          {education.achievements.length > 0 && (
            <ul className="list-disc list-inside text-sm mt-2 space-y-0.5">
              {education.achievements.map((achievement, i) => <li key={i}>{achievement}</li>)}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={!onMoveUp} title="Move up">
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={!onMoveDown} title="Move down">
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
