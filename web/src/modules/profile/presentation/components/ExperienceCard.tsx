import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ExperienceType } from '@himan/shared/profile';
import { ExperienceEditor, type ExperienceFormValues } from './ExperienceEditor';

interface ExperienceCardProps {
  experience: ExperienceType;
  onSave: (values: ExperienceFormValues) => Promise<unknown> | void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isSaving?: boolean;
}

export const ExperienceCard = ({ experience, onSave, onDelete, onMoveUp, onMoveDown, isSaving }: ExperienceCardProps) => {
  const [editing, setEditing] = useState(false);

  const handleSave = async (values: ExperienceFormValues) => {
    await onSave(values);
    setEditing(false);
  };

  if (editing) {
    return <ExperienceEditor experience={experience} onSave={handleSave} onCancel={() => setEditing(false)} isSaving={isSaving} />;
  }

  const dateRange = [
    experience.startDate ? format(experience.startDate, 'MMM yyyy') : null,
    experience.isCurrent ? 'Present' : experience.endDate ? format(experience.endDate, 'MMM yyyy') : null,
  ].filter(Boolean).join(' – ');

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{experience.title}</p>
          <p className="text-sm text-muted-foreground">{experience.company}{experience.location ? ` · ${experience.location}` : ''}</p>
          {dateRange && <p className="text-xs text-muted-foreground mt-0.5">{dateRange}</p>}
          {experience.summary && <p className="text-sm mt-2">{experience.summary}</p>}
          {experience.bullets.length > 0 && (
            <ul className="list-disc list-inside text-sm mt-2 space-y-0.5">
              {experience.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}
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
