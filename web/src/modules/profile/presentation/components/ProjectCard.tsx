import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ProjectType } from '@himan/shared/profile';
import { ProjectEditor, type ProjectFormValues } from './ProjectEditor';

interface ProjectCardProps {
  project: ProjectType;
  onSave: (values: ProjectFormValues) => Promise<unknown> | void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isSaving?: boolean;
}

export const ProjectCard = ({ project, onSave, onDelete, onMoveUp, onMoveDown, isSaving }: ProjectCardProps) => {
  const [editing, setEditing] = useState(false);

  const handleSave = async (values: ProjectFormValues) => {
    await onSave(values);
    setEditing(false);
  };

  if (editing) {
    return <ProjectEditor project={project} onSave={handleSave} onCancel={() => setEditing(false)} isSaving={isSaving} />;
  }

  const dateRange = [
    project.startDate ? format(project.startDate, 'MMM yyyy') : null,
    project.endDate ? format(project.endDate, 'MMM yyyy') : null,
  ].filter(Boolean).join(' – ');

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium">{project.name}</p>
            {project.url && (
              <a href={project.url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {project.platform.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground ml-auto">{project.platform.join('/')}</span>
            )}
          </div>
          {dateRange && <p className="text-xs text-muted-foreground mt-0.5">{dateRange}</p>}
          {project.description && <p className="text-sm mt-2">{project.description}</p>}
          {project.tech.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.tech.map((t) => (
                <span key={t} className="text-xs bg-muted rounded-full px-2 py-0.5">{t}</span>
              ))}
            </div>
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
