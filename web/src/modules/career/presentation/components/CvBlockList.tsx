import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, ConfirmDialog } from '@/components/ui';
import type { CareerCvBlockType } from '@himan/shared/career';

interface CvBlockListProps {
  blocks: CareerCvBlockType[];
  onEdit: (block: CareerCvBlockType) => void;
  onDelete: (id: string) => void;
}

export const CvBlockList = ({ blocks, onEdit, onDelete }: CvBlockListProps) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const blockToDelete = blocks.find((block) => block.id === deleteId) ?? null;

  return (
    <div className="space-y-2">
      {blocks.map((block) => (
        <div key={block.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">{block.title}</p>
              <span className="text-[10px] uppercase tracking-wide rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{block.kind}</span>
              {block.label && <span className="text-xs text-muted-foreground">{block.label}</span>}
            </div>
            {block.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{block.body}</p>}
            {block.tags.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1">{block.tags.map((t) => `#${t}`).join(' ')}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(block)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(block.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title={`Delete "${blockToDelete?.title ?? 'block'}"`}
        description="This CV block will be permanently deleted. Items still referencing it will simply skip it."
        confirmText="Delete"
        onConfirm={() => { if (deleteId) onDelete(deleteId); setDeleteId(null); }}
        variant="destructive"
      />
    </div>
  );
};
